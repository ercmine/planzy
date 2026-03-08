import { randomUUID } from "node:crypto";

import { ValidationError } from "../../plans/errors.js";
import type {
  BusinessManagedPlaceContentRecord,
  BusinessPlaceClaimRecord,
  ClaimActor,
  ClaimStatus,
  ListClaimsResult,
  OwnershipRole,
  PlaceBusinessOwnershipRecord,
  VerificationLevel
} from "./types.js";
import type { VenueClaimStore } from "./store.js";
import { validateBusinessClaimInput, validateEvidenceInput, validateListClaimsOptions } from "./validation.js";

const TERMINAL: ClaimStatus[] = ["approved", "rejected", "withdrawn", "expired", "revoked", "suspended"];

export class VenueClaimsService {
  constructor(private readonly store: VenueClaimStore, private readonly now: () => Date = () => new Date()) {}

  private requireUser(actor?: ClaimActor): string {
    if (!actor?.userId) throw new ValidationError(["x-user-id is required"]);
    return actor.userId;
  }

  private assertCanReview(actor?: ClaimActor): void {
    if (!actor?.isAdmin) throw new ValidationError(["admin privileges required"]);
  }

  public async createClaimDraft(input: unknown, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord> {
    const userId = this.requireUser(actor);
    const validated = validateBusinessClaimInput(input);
    const dupe = await this.store.findClaimByPlaceAndUser(validated.placeId, userId, ["draft", "submitted", "pending_verification", "under_review", "needs_more_info"]);
    if (dupe) return dupe;

    const nowIso = this.now().toISOString();
    const record: BusinessPlaceClaimRecord = {
      id: randomUUID(),
      placeId: validated.placeId,
      claimantUserId: userId,
      claimType: validated.claimType,
      requestedRole: validated.requestedRole,
      status: "draft",
      verificationLevel: "none",
      verificationMethodSelection: validated.verificationMethodSelection ?? [],
      contactEmail: validated.contactEmail,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(validated.claimantBusinessProfileId ? { claimantBusinessProfileId: validated.claimantBusinessProfileId } : {}),
      ...(validated.contactPhone ? { contactPhone: validated.contactPhone } : {}),
      ...(validated.message ? { message: validated.message } : {})
    };
    await this.store.createClaim(record);
    await this.track(record.placeId, "business_claim_started", actor?.userId, { claimId: record.id, claimType: record.claimType });
    return record;
  }

  public async submitClaim(claimId: string, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord> {
    const userId = this.requireUser(actor);
    const claim = await this.store.getClaimById(claimId);
    if (!claim || claim.claimantUserId !== userId) throw new ValidationError(["claim not found"]);
    if (TERMINAL.includes(claim.status)) throw new ValidationError(["claim can no longer be submitted"]);
    const updated = await this.store.updateClaim(claimId, { status: "submitted", submittedAt: this.now().toISOString(), updatedAt: this.now().toISOString() });
    await this.track(claim.placeId, "business_claim_submitted", userId, { claimId });
    return updated ?? claim;
  }

  public async listLeads(opts?: unknown, actor?: ClaimActor): Promise<ListClaimsResult> {
    const normalized = validateListClaimsOptions(opts);
    if (!actor?.isAdmin) {
      const userId = this.requireUser(actor);
      normalized.claimantUserId = userId;
      normalized.reviewQueueOnly = false;
    }
    return this.store.listClaims(normalized);
  }

  public async getClaim(claimId: string, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord> {
    const claim = await this.store.getClaimById(claimId);
    if (!claim) throw new ValidationError(["claim not found"]);
    if (!actor?.isAdmin && actor?.userId !== claim.claimantUserId) throw new ValidationError(["not authorized to view claim"]);
    return claim;
  }

  public async addEvidence(claimId: string, input: unknown, actor?: ClaimActor) {
    const userId = this.requireUser(actor);
    const claim = await this.getClaim(claimId, actor);
    if (claim.claimantUserId !== userId) throw new ValidationError(["only claimant can add evidence"]);
    const validated = validateEvidenceInput(input);
    const nowIso = this.now().toISOString();
    const evidence = {
      id: randomUUID(),
      claimId,
      evidenceType: validated.evidenceType,
      status: "submitted" as const,
      metadata: validated.metadata ?? {},
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(validated.normalizedValue ? { normalizedValue: validated.normalizedValue } : {}),
      ...(validated.storageRef ? { storageRef: validated.storageRef } : {}),
      ...(validated.notes ? { notes: validated.notes } : {})
    };
    await this.store.addEvidence(evidence);
    await this.store.updateClaim(claimId, { status: "pending_verification", updatedAt: nowIso });
    await this.track(claim.placeId, "business_claim_evidence_uploaded", userId, { claimId, evidenceType: evidence.evidenceType });
    return evidence;
  }

  public async listEvidence(claimId: string, actor?: ClaimActor) {
    await this.getClaim(claimId, actor);
    return this.store.listEvidence(claimId);
  }

  public async reviewClaim(claimId: string, decision: "approve" | "reject" | "request_more_info", reasonCode: string, notes: string | undefined, actor?: ClaimActor) {
    this.assertCanReview(actor);
    const claim = await this.store.getClaimById(claimId);
    if (!claim) throw new ValidationError(["claim not found"]);
    const nowIso = this.now().toISOString();

    if (decision === "request_more_info") {
      const updated = await this.store.updateClaim(claimId, { status: "needs_more_info", statusReasonCode: reasonCode, reviewedAt: nowIso, reviewerUserId: actor?.userId, updatedAt: nowIso });
      await this.track(claim.placeId, "business_claim_requested_more_info", actor?.userId, { claimId, reasonCode, notes });
      return updated;
    }

    if (decision === "reject") {
      const updated = await this.store.updateClaim(claimId, { status: "rejected", statusReasonCode: reasonCode, reviewedAt: nowIso, reviewerUserId: actor?.userId, updatedAt: nowIso });
      await this.track(claim.placeId, "business_claim_rejected", actor?.userId, { claimId, reasonCode, notes });
      return updated;
    }

    const existingPrimary = (await this.store.listOwnershipByPlace(claim.placeId)).find((o) => o.isPrimary && o.isActive);
    const status: ClaimStatus = existingPrimary ? "partially_approved" : "approved";
    const level = this.inferVerificationLevel(await this.store.listEvidence(claimId));
    const updated = await this.store.updateClaim(claimId, { status, verificationLevel: level, statusReasonCode: reasonCode, reviewedAt: nowIso, reviewerUserId: actor?.userId, updatedAt: nowIso });

    const ownership: PlaceBusinessOwnershipRecord = {
      id: randomUUID(),
      placeId: claim.placeId,
      ownershipRole: claim.requestedRole,
      verificationStatus: "verified",
      verificationLevel: level,
      verificationMethodSummary: claim.verificationMethodSelection,
      isPrimary: !existingPrimary,
      isActive: true,
      approvedClaimId: claim.id,
      approvedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(claim.claimantBusinessProfileId ? { businessProfileId: claim.claimantBusinessProfileId } : {}),
      ...(claim.claimantUserId ? { primaryUserId: claim.claimantUserId } : {})
    };
    await this.store.upsertOwnership(ownership);
    await this.track(claim.placeId, "business_claim_approved", actor?.userId, { claimId, reasonCode, ownershipId: ownership.id, partial: Boolean(existingPrimary) });
    return updated;
  }

  public async revokeOwnership(ownershipId: string, reasonCode: string, actor?: ClaimActor): Promise<void> {
    this.assertCanReview(actor);
    const own = await this.store.getOwnershipById(ownershipId);
    if (!own) throw new ValidationError(["ownership not found"]);
    const nowIso = this.now().toISOString();
    await this.store.updateOwnership(ownershipId, { isActive: false, verificationStatus: "revoked", revokedAt: nowIso, revokedReasonCode: reasonCode, updatedAt: nowIso });
    await this.track(own.placeId, "business_ownership_revoked", actor?.userId, { ownershipId, reasonCode });
  }

  public async upsertOfficialContent(placeId: string, ownershipId: string, contentType: BusinessManagedPlaceContentRecord["contentType"], value: Record<string, unknown>, actor?: ClaimActor) {
    const userId = this.requireUser(actor);
    const ownership = await this.store.getOwnershipById(ownershipId);
    if (!ownership || !ownership.isActive || ownership.placeId !== placeId) throw new ValidationError(["ownership not active"]);
    if (!actor?.isAdmin && ownership.primaryUserId !== userId) throw new ValidationError(["user cannot manage this place"]);

    const nowIso = this.now().toISOString();
    const record: BusinessManagedPlaceContentRecord = {
      id: randomUUID(),
      placeId,
      ownershipId,
      contentType,
      value,
      moderationState: "pending",
      sourceType: "official_business",
      visibility: "public",
      createdByUserId: userId,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(ownership.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertBusinessContent(record);
    await this.track(placeId, contentType === "review_reply" ? "official_business_reply_posted" : "official_business_content_updated", userId, { placeId, contentType });
    return record;
  }

  public async getPlaceManagementState(placeId: string, actor?: ClaimActor) {
    const ownership = await this.store.listOwnershipByPlace(placeId);
    const content = await this.store.listBusinessContent(placeId);
    const canManage = Boolean(actor?.userId && ownership.some((o) => o.isActive && o.primaryUserId === actor.userId));
    return { ownership, content, canManage };
  }

  public async buildPublicPlaceProjection(placeId: string, providerData: Record<string, unknown>) {
    const ownership = (await this.store.listOwnershipByPlace(placeId)).find((o) => o.isActive && o.isPrimary);
    const officialContent = (await this.store.listBusinessContent(placeId)).filter((c) => c.visibility === "public" && c.moderationState !== "rejected");
    const officialDescription = officialContent.find((c) => c.contentType === "description")?.value;
    const officialLinks = officialContent.filter((c) => c.contentType === "links").map((c) => c.value);
    return {
      provider: providerData,
      official: {
        isManaged: Boolean(ownership),
        verifiedBadge: ownership?.verificationStatus === "verified",
        verificationLevel: ownership?.verificationLevel,
        description: officialDescription ?? null,
        links: officialLinks,
        attribution: "official_business"
      },
      sourcePrecedence: ["official_business", "moderated_override", "normalized_provider", "raw_provider"]
    };
  }

  private inferVerificationLevel(evidence: Array<{ evidenceType: string }>): VerificationLevel {
    const set = new Set(evidence.map((e) => e.evidenceType));
    if (set.has("document") && set.has("email_domain")) return "high";
    if (set.has("document") || set.has("registration")) return "enhanced";
    if (set.size > 0) return "basic";
    return "none";
  }

  private async track(placeId: string, eventType: Parameters<VenueClaimStore["appendAuditEvent"]>[0]["eventType"], actorUserId: string | undefined, metadata: Record<string, unknown>) {
    await this.store.appendAuditEvent({ id: randomUUID(), placeId, eventType, actorUserId, metadata, createdAt: this.now().toISOString() });
  }

  // legacy compatibility
  public async createLead(input: unknown, ctx?: { userId?: string }) {
    const legacy = input as { venueId?: string; contactEmail?: string; message?: string };
    const draft = await this.createClaimDraft({ placeId: legacy.venueId, contactEmail: legacy.contactEmail, message: legacy.message, claimType: "sole_owner", requestedRole: "owner", verificationMethodSelection: ["email_domain"] }, { userId: ctx?.userId });
    const submitted = await this.submitClaim(draft.id, { userId: draft.claimantUserId });
    return { claimId: submitted.id, venueId: submitted.placeId, contactEmail: submitted.contactEmail, verificationStatus: submitted.status === "approved" ? "verified" : submitted.status === "rejected" ? "rejected" : "pending", createdAtISO: submitted.createdAt, updatedAtISO: submitted.updatedAt };
  }

  public async setStatus(claimId: string, status: "pending" | "verified" | "rejected") {
    const mapped: Record<string, ClaimStatus> = { pending: "under_review", verified: "approved", rejected: "rejected" };
    await this.store.updateClaim(claimId, { status: mapped[status], updatedAt: this.now().toISOString() });
  }
}

export type { OwnershipRole };
