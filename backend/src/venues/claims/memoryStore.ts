import { RetentionPolicy } from "../../retention/policy.js";
import { ValidationError } from "../../plans/errors.js";
import type { ListClaimsOptions, ListClaimsResult, VerificationStatus, VenueClaimLeadRecord } from "./types.js";
import type { VenueClaimStore } from "./store.js";

function encodeOffsetCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }

  const parsed = Number.parseInt(Buffer.from(cursor, "base64").toString("utf8"), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("invalid cursor");
  }

  return parsed;
}

function sortClaims(records: VenueClaimLeadRecord[]): VenueClaimLeadRecord[] {
  return [...records].sort((a, b) => {
    if (a.createdAtISO === b.createdAtISO) {
      return b.claimId.localeCompare(a.claimId);
    }
    return b.createdAtISO.localeCompare(a.createdAtISO);
  });
}

function dedupeKey(venueId: string, contactEmail: string): string {
  return `${venueId}::${contactEmail.toLowerCase()}`;
}

export class MemoryVenueClaimStore implements VenueClaimStore {
  private readonly claims: VenueClaimLeadRecord[] = [];
  private readonly byId = new Map<string, VenueClaimLeadRecord>();
  private readonly byVenueEmail = new Map<string, string>();
  private readonly retentionPolicy: RetentionPolicy;

  constructor(retentionPolicy?: RetentionPolicy) {
    this.retentionPolicy = retentionPolicy ?? new RetentionPolicy();
  }

  public async create(input: VenueClaimLeadRecord): Promise<void> {
    this.claims.push(input);
    this.byId.set(input.claimId, input);
    this.byVenueEmail.set(dedupeKey(input.venueId, input.contactEmail), input.claimId);
  }

  public async list(opts?: ListClaimsOptions): Promise<ListClaimsResult> {
    let offset = 0;
    try {
      offset = decodeOffsetCursor(opts?.cursor);
    } catch {
      throw new ValidationError(["cursor must be a valid base64 offset"]);
    }

    const limit = Math.min(opts?.limit ?? 50, 200);
    const filtered = sortClaims(this.claims).filter((claim) => {
      if (opts?.venueId && claim.venueId !== opts.venueId) {
        return false;
      }
      if (opts?.status && claim.verificationStatus !== opts.status) {
        return false;
      }
      return true;
    });

    const claims = filtered.slice(offset, offset + limit);
    const nextOffset = offset + claims.length;

    return {
      claims,
      nextCursor: nextOffset < filtered.length ? encodeOffsetCursor(nextOffset) : null
    };
  }

  public async getById(claimId: string): Promise<VenueClaimLeadRecord | null> {
    return this.byId.get(claimId) ?? null;
  }

  public async updateStatus(claimId: string, status: VerificationStatus, meta?: { updatedAtISO: string }): Promise<void> {
    const existing = this.byId.get(claimId);
    if (!existing) {
      return;
    }

    const updated: VenueClaimLeadRecord = {
      ...existing,
      verificationStatus: status,
      ...(meta?.updatedAtISO ? { updatedAtISO: meta.updatedAtISO } : {})
    };

    this.byId.set(claimId, updated);
    const index = this.claims.findIndex((claim) => claim.claimId === claimId);
    if (index >= 0) {
      this.claims[index] = updated;
    }
  }

  public async findByVenueAndEmail(venueId: string, contactEmail: string): Promise<VenueClaimLeadRecord | null> {
    const claimId = this.byVenueEmail.get(dedupeKey(venueId, contactEmail));
    if (!claimId) {
      return null;
    }
    return this.byId.get(claimId) ?? null;
  }

  public prune(maxAgeMs = this.retentionPolicy.config.maxTtlByClass.venue_claims, now = new Date()): number {
    const thresholdMs = now.getTime() - maxAgeMs;
    const kept: VenueClaimLeadRecord[] = [];
    let removed = 0;

    for (const claim of this.claims) {
      const createdAtMs = Date.parse(claim.createdAtISO);
      if (!Number.isFinite(createdAtMs) || createdAtMs < thresholdMs) {
        removed += 1;
        this.byId.delete(claim.claimId);
        this.byVenueEmail.delete(dedupeKey(claim.venueId, claim.contactEmail));
        continue;
      }
      kept.push(claim);
    }

    this.claims.splice(0, this.claims.length, ...kept);
    return removed;
  }
}
