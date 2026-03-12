import { randomUUID } from "node:crypto";

import { stableHash } from "./normalization.js";
import type {
  CanonicalPlace,
  DuplicateCandidate,
  DuplicateCandidateStatus,
  PlaceAttachmentLink,
  PlaceMaintenanceAuditEntry,
  PlaceStore,
  PlaceSourceRecord
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function similarity(a = "", b = ""): number {
  const aa = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const bb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (aa.size === 0 || bb.size === 0) return 0;
  let inter = 0;
  for (const t of aa) if (bb.has(t)) inter += 1;
  return inter / new Set([...aa, ...bb]).size;
}

function distanceMeters(a: CanonicalPlace, b: CanonicalPlace): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const p =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(p));
}

export class PlaceMaintenanceService {
  constructor(private readonly store: PlaceStore, private readonly hooks?: { onRecompute?: (placeIds: string[], reason: string) => void }) {}

  detectDuplicateCandidates(): DuplicateCandidate[] {
    const places = this.store.listCanonicalPlaces().filter((item) => item.status === "active");
    const created: DuplicateCandidate[] = [];

    for (let i = 0; i < places.length; i += 1) {
      for (let j = i + 1; j < places.length; j += 1) {
        const a = places[i]!;
        const b = places[j]!;
        const reasons: string[] = [];
        let score = 0;
        const nameScore = similarity(a.primaryDisplayName, b.primaryDisplayName);
        if (nameScore > 0.5) {
          score += 0.35;
          reasons.push(`name_similarity:${nameScore.toFixed(2)}`);
        }

        const meters = distanceMeters(a, b);
        if (meters < 40) {
          score += 0.3;
          reasons.push(`geo_close:${meters.toFixed(1)}m`);
        } else if (meters > 1500) {
          score -= 0.4;
          reasons.push(`geo_far:${meters.toFixed(1)}m`);
        }

        const addressScore = similarity(
          [a.formattedAddress, a.address1, a.locality, a.region].filter(Boolean).join(" "),
          [b.formattedAddress, b.address1, b.locality, b.region].filter(Boolean).join(" ")
        );
        if (addressScore > 0.7) {
          score += 0.2;
          reasons.push(`address_similarity:${addressScore.toFixed(2)}`);
        }

        const phoneMatch = Boolean(a.phone && b.phone && a.phone === b.phone);
        if (phoneMatch) {
          score += 0.2;
          reasons.push("phone_exact");
        }

        const websiteMatch = Boolean(a.websiteUrl && b.websiteUrl && new URL(a.websiteUrl).hostname === new URL(b.websiteUrl).hostname);
        if (websiteMatch) {
          score += 0.15;
          reasons.push("website_domain_exact");
        }

        const categoryMatch = a.canonicalCategory && a.canonicalCategory === b.canonicalCategory;
        if (categoryMatch) score += 0.08;

        if (score < 0.55) continue;
        const sorted = [a.canonicalPlaceId, b.canonicalPlaceId].sort();
        const id = `dup_${stableHash(sorted).slice(0, 14)}`;
        const ts = nowIso();
        const prior = this.store.getDuplicateCandidate(id);
        const candidate: DuplicateCandidate = {
          id,
          placeIdA: sorted[0]!,
          placeIdB: sorted[1]!,
          confidence: Number(Math.min(0.99, score).toFixed(2)),
          reasons,
          status: prior?.status === "rejected" ? "rejected" : "pending",
          reviewedAt: prior?.reviewedAt,
          reviewedByUserId: prior?.reviewedByUserId,
          reviewNote: prior?.reviewNote,
          createdAt: prior?.createdAt ?? ts,
          updatedAt: ts
        };
        this.store.upsertDuplicateCandidate(candidate);
        created.push(candidate);
      }
    }
    return created;
  }

  reviewDuplicateCandidate(input: { candidateId: string; actorUserId: string; status: Exclude<DuplicateCandidateStatus, "merged">; note?: string }) {
    const existing = this.store.getDuplicateCandidate(input.candidateId);
    if (!existing) return undefined;
    const updated: DuplicateCandidate = {
      ...existing,
      status: input.status,
      reviewedAt: nowIso(),
      reviewedByUserId: input.actorUserId,
      reviewNote: input.note,
      updatedAt: nowIso()
    };
    this.store.upsertDuplicateCandidate(updated);
    this.audit({
      actionType: "candidate_review",
      actorUserId: input.actorUserId,
      targetPlaceId: existing.placeIdA,
      sourcePlaceIds: [existing.placeIdB],
      note: input.note,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      metadata: { candidateId: input.candidateId }
    });
    return updated;
  }

  mergePlaces(input: { targetPlaceId: string; sourcePlaceIds: string[]; actorUserId: string; reason?: string; allowFarDistance?: boolean; fieldOverrides?: Partial<CanonicalPlace> }) {
    const target = this.store.getCanonicalPlace(input.targetPlaceId);
    if (!target) throw new Error("target_not_found");
    const uniqueSources = [...new Set(input.sourcePlaceIds)].filter((id) => id !== input.targetPlaceId);
    if (uniqueSources.length === 0) throw new Error("missing_sources");

    let mergedTarget = { ...target };
    const movedAttachments: PlaceAttachmentLink[] = [];
    for (const sourceId of uniqueSources) {
      const source = this.store.getCanonicalPlace(sourceId);
      if (!source) throw new Error(`source_not_found:${sourceId}`);
      if (source.status === "merged") throw new Error(`source_already_merged:${sourceId}`);
      const dist = distanceMeters(target, source);
      if (!input.allowFarDistance && dist > 2500) throw new Error(`merge_distance_too_far:${sourceId}:${dist.toFixed(0)}`);

      mergedTarget = {
        ...mergedTarget,
        primaryDisplayName: input.fieldOverrides?.primaryDisplayName ?? (mergedTarget.primaryDisplayName.length >= source.primaryDisplayName.length ? mergedTarget.primaryDisplayName : source.primaryDisplayName),
        alternateNames: [...new Set([...(mergedTarget.alternateNames ?? []), source.primaryDisplayName, ...source.alternateNames])],
        providerCategories: [...new Set([...mergedTarget.providerCategories, ...source.providerCategories])],
        tags: [...new Set([...mergedTarget.tags, ...source.tags])],
        sourceLinks: [...mergedTarget.sourceLinks, ...source.sourceLinks.filter((incoming) => !mergedTarget.sourceLinks.some((e) => e.provider === incoming.provider && e.providerPlaceId === incoming.providerPlaceId))],
        sourceRecordIds: [...new Set([...mergedTarget.sourceRecordIds, ...source.sourceRecordIds])],
        manualOverrides: { ...source.manualOverrides, ...mergedTarget.manualOverrides },
        dataCompletenessScore: Math.max(mergedTarget.dataCompletenessScore, source.dataCompletenessScore),
        lastMergedAt: nowIso(),
        mergeConfidence: Math.max(mergedTarget.mergeConfidence, source.mergeConfidence)
      };

      for (const sourceRecord of this.store.listSourceRecordsForPlace(sourceId)) {
        this.store.upsertSourceRecord({ ...sourceRecord, canonicalPlaceId: mergedTarget.canonicalPlaceId, version: sourceRecord.version + 1 });
        mergedTarget.sourceRecordIds = [...new Set([...mergedTarget.sourceRecordIds, sourceRecord.sourceRecordId])];
      }

      for (const link of this.store.listAttachmentLinks(sourceId)) {
        const dedupeKey = `${link.attachmentType}:${link.attachmentId}:${link.ownerUserId ?? ""}`;
        const conflict = this.store
          .listAttachmentLinks(mergedTarget.canonicalPlaceId)
          .find((item) => `${item.attachmentType}:${item.attachmentId}:${item.ownerUserId ?? ""}` === dedupeKey);
        if (conflict && (link.attachmentType === "save" || link.attachmentType === "guide")) {
          this.store.removeAttachmentLink(link.id);
          continue;
        }
        const moved = this.store.upsertAttachmentLink({ ...link, placeId: mergedTarget.canonicalPlaceId });
        movedAttachments.push(moved);
      }

      this.store.upsertCanonicalPlace({ ...source, status: "merged", mergedIntoPlaceId: mergedTarget.canonicalPlaceId, lastMergedAt: nowIso() });
    }

    const finalTarget = this.store.upsertCanonicalPlace({ ...mergedTarget, ...input.fieldOverrides, lastMergedAt: nowIso() });
    for (const candidate of this.store.listDuplicateCandidates()) {
      if ([candidate.placeIdA, candidate.placeIdB].some((id) => uniqueSources.includes(id))) {
        this.store.upsertDuplicateCandidate({ ...candidate, status: "merged", updatedAt: nowIso() });
      }
    }

    this.audit({
      actionType: "merge",
      actorUserId: input.actorUserId,
      targetPlaceId: finalTarget.canonicalPlaceId,
      sourcePlaceIds: uniqueSources,
      reason: input.reason,
      before: { target, sourcePlaces: uniqueSources.map((id) => this.store.getCanonicalPlace(id)) },
      after: { target: finalTarget },
      metadata: { movedAttachmentCount: movedAttachments.length }
    });
    this.hooks?.onRecompute?.([finalTarget.canonicalPlaceId, ...uniqueSources], "place_merge");
    return finalTarget;
  }

  correctPlace(input: {
    placeId: string;
    actorUserId: string;
    reason: string;
    note?: string;
    updates: Partial<Pick<CanonicalPlace, "primaryDisplayName" | "canonicalCategory" | "canonicalSubcategory" | "locality" | "region" | "formattedAddress" | "latitude" | "longitude" | "status">>;
    lockFields?: Array<keyof CanonicalPlace["manualOverrides"]>;
  }) {
    const place = this.store.getCanonicalPlace(input.placeId);
    if (!place) return undefined;
    const next = {
      ...place,
      ...input.updates,
      geohash: typeof input.updates.latitude === "number" || typeof input.updates.longitude === "number" ? place.geohash : place.geohash,
      manualOverrides: {
        ...place.manualOverrides,
        ...(input.updates.primaryDisplayName ? { primaryDisplayName: input.updates.primaryDisplayName } : {}),
        ...(input.updates.canonicalCategory ? { canonicalCategory: input.updates.canonicalCategory } : {}),
        ...(input.updates.canonicalSubcategory ? { canonicalSubcategory: input.updates.canonicalSubcategory } : {})
      },
      lastNormalizedAt: nowIso()
    };
    this.store.upsertCanonicalPlace(next);
    this.audit({
      actionType: "correction",
      actorUserId: input.actorUserId,
      targetPlaceId: input.placeId,
      reason: input.reason,
      note: input.note,
      before: place as unknown as Record<string, unknown>,
      after: next as unknown as Record<string, unknown>,
      metadata: { lockFields: input.lockFields ?? [] }
    });
    this.hooks?.onRecompute?.([input.placeId], "place_correction");
    return next;
  }

  reassignAttachment(input: { actorUserId: string; linkId: string; toPlaceId: string; reason: string }) {
    const target = this.store.getCanonicalPlace(input.toPlaceId);
    if (!target) throw new Error("target_not_found");
    const allLinks = this.store.listCanonicalPlaces().flatMap((place) => this.store.listAttachmentLinks(place.canonicalPlaceId));
    const link = allLinks.find((item) => item.id === input.linkId);
    if (!link) throw new Error("attachment_link_not_found");
    const updated = this.store.upsertAttachmentLink({ ...link, placeId: input.toPlaceId });
    this.audit({
      actionType: "attachment_relink",
      actorUserId: input.actorUserId,
      targetPlaceId: input.toPlaceId,
      sourcePlaceIds: [link.placeId],
      reason: input.reason,
      before: link as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      metadata: {}
    });
    this.hooks?.onRecompute?.([input.toPlaceId, link.placeId], "attachment_relink");
    return updated;
  }

  private audit(input: Omit<PlaceMaintenanceAuditEntry, "id" | "createdAt">) {
    this.store.upsertMaintenanceAudit({ ...input, id: `pl_audit_${randomUUID()}`, createdAt: nowIso() });
  }
}
