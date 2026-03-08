import { RetentionPolicy } from "../../retention/policy.js";
import { ValidationError } from "../../plans/errors.js";
import type {
  BusinessClaimEvidenceRecord,
  BusinessManagedPlaceContentRecord,
  BusinessPlaceClaimRecord,
  ClaimAuditEvent,
  ClaimStatus,
  ListClaimsOptions,
  ListClaimsResult,
  PlaceBusinessOwnershipRecord
} from "./types.js";
import type { VenueClaimStore } from "./store.js";

function encodeOffsetCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(Buffer.from(cursor, "base64").toString("utf8"), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("invalid cursor");
  }
  return parsed;
}

const REVIEW_QUEUE_STATUSES: ClaimStatus[] = ["submitted", "pending_verification", "under_review", "needs_more_info"];

export class MemoryVenueClaimStore implements VenueClaimStore {
  private readonly claims = new Map<string, BusinessPlaceClaimRecord>();
  private readonly evidence = new Map<string, BusinessClaimEvidenceRecord>();
  private readonly ownership = new Map<string, PlaceBusinessOwnershipRecord>();
  private readonly content = new Map<string, BusinessManagedPlaceContentRecord>();
  private readonly auditEvents: ClaimAuditEvent[] = [];
  private readonly retentionPolicy: RetentionPolicy;

  constructor(retentionPolicy?: RetentionPolicy) {
    this.retentionPolicy = retentionPolicy ?? new RetentionPolicy();
  }

  async createClaim(input: BusinessPlaceClaimRecord): Promise<void> { this.claims.set(input.id, input); }

  async listClaims(opts?: ListClaimsOptions): Promise<ListClaimsResult> {
    let offset = 0;
    try { offset = decodeOffsetCursor(opts?.cursor); } catch { throw new ValidationError(["cursor must be a valid base64 offset"]); }
    const limit = Math.min(opts?.limit ?? 50, 200);
    const filtered = [...this.claims.values()]
      .filter((claim) => {
        if (opts?.placeId && claim.placeId !== opts.placeId) return false;
        if (opts?.claimantUserId && claim.claimantUserId !== opts.claimantUserId) return false;
        if (opts?.status && claim.status !== opts.status) return false;
        if (opts?.reviewQueueOnly && !REVIEW_QUEUE_STATUSES.includes(claim.status)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const claims = filtered.slice(offset, offset + limit);
    const nextOffset = offset + claims.length;
    return { claims, nextCursor: nextOffset < filtered.length ? encodeOffsetCursor(nextOffset) : null };
  }

  async getClaimById(claimId: string): Promise<BusinessPlaceClaimRecord | null> { return this.claims.get(claimId) ?? null; }

  async updateClaim(claimId: string, patch: Partial<BusinessPlaceClaimRecord>): Promise<BusinessPlaceClaimRecord | null> {
    const existing = this.claims.get(claimId);
    if (!existing) return null;
    const next = { ...existing, ...patch };
    this.claims.set(claimId, next);
    return next;
  }

  async findClaimByPlaceAndUser(placeId: string, userId: string, statuses?: ClaimStatus[]): Promise<BusinessPlaceClaimRecord | null> {
    for (const claim of this.claims.values()) {
      if (claim.placeId === placeId && claim.claimantUserId === userId) {
        if (!statuses || statuses.includes(claim.status)) return claim;
      }
    }
    return null;
  }

  async addEvidence(input: BusinessClaimEvidenceRecord): Promise<void> { this.evidence.set(input.id, input); }
  async listEvidence(claimId: string): Promise<BusinessClaimEvidenceRecord[]> { return [...this.evidence.values()].filter((e) => e.claimId === claimId); }
  async getEvidenceById(evidenceId: string): Promise<BusinessClaimEvidenceRecord | null> { return this.evidence.get(evidenceId) ?? null; }
  async updateEvidence(evidenceId: string, patch: Partial<BusinessClaimEvidenceRecord>): Promise<BusinessClaimEvidenceRecord | null> {
    const existing = this.evidence.get(evidenceId); if (!existing) return null;
    const next = { ...existing, ...patch }; this.evidence.set(evidenceId, next); return next;
  }

  async upsertOwnership(input: PlaceBusinessOwnershipRecord): Promise<void> { this.ownership.set(input.id, input); }
  async listOwnershipByPlace(placeId: string): Promise<PlaceBusinessOwnershipRecord[]> { return [...this.ownership.values()].filter((o) => o.placeId === placeId); }
  async getOwnershipById(ownershipId: string): Promise<PlaceBusinessOwnershipRecord | null> { return this.ownership.get(ownershipId) ?? null; }
  async updateOwnership(ownershipId: string, patch: Partial<PlaceBusinessOwnershipRecord>): Promise<PlaceBusinessOwnershipRecord | null> {
    const existing = this.ownership.get(ownershipId); if (!existing) return null;
    const next = { ...existing, ...patch }; this.ownership.set(ownershipId, next); return next;
  }

  async upsertBusinessContent(input: BusinessManagedPlaceContentRecord): Promise<void> { this.content.set(input.id, input); }
  async listBusinessContent(placeId: string): Promise<BusinessManagedPlaceContentRecord[]> { return [...this.content.values()].filter((c) => c.placeId === placeId); }

  async appendAuditEvent(input: ClaimAuditEvent): Promise<void> { this.auditEvents.push(input); }
  async listAuditEvents(placeId: string): Promise<ClaimAuditEvent[]> { return this.auditEvents.filter((a) => a.placeId === placeId); }

  public prune(maxAgeMs = this.retentionPolicy.config.maxTtlByClass.venue_claims, now = new Date()): number {
    const thresholdMs = now.getTime() - maxAgeMs;
    let removed = 0;
    for (const [id, claim] of this.claims.entries()) {
      const createdAtMs = Date.parse(claim.createdAt);
      if (!Number.isFinite(createdAtMs) || createdAtMs < thresholdMs) {
        this.claims.delete(id);
        removed += 1;
      }
    }
    return removed;
  }
}
