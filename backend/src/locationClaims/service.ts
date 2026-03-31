import { randomUUID } from "node:crypto";

import { ValidationError } from "../plans/errors.js";
import { DEFAULT_CLAIM_RADIUS_METERS } from "./constants.js";
import type {
  AdGateRecord,
  AnnualEmissionPool,
  ClaimAttempt,
  ClaimFlowState,
  ClaimableLocation,
  FinalizedClaim,
  LocationClaimLedgerEntry,
  LocationClaimsStore,
  NearbyLocationResult,
  UserVisit
} from "./types.js";

const YEARLY_ALLOCATION = 10_000_000n;
const PERBUG_PRECISION_SCALE = 1_000_000n;
const DEFAULT_DEPLETION_THRESHOLD = 1_000n; // 0.001 Perbug

function nowIso(): string { return new Date().toISOString(); }
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPerbugAtomic(amount: bigint): string {
  const whole = amount / PERBUG_PRECISION_SCALE;
  const fractional = (amount % PERBUG_PRECISION_SCALE).toString().padStart(6, "0").replace(/0+$/, "");
  return fractional.length > 0 ? `${whole}.${fractional}` : `${whole}.0`;
}

function halvedRewardAtomic(claimCount: number): bigint {
  return PERBUG_PRECISION_SCALE / (2n ** BigInt(claimCount));
}

function normalizeLocation(input: Omit<ClaimableLocation, "claimCount" | "currentRewardAtomic" | "currentReward" | "totalClaimedAtomic" | "totalClaimed" | "uniqueVisitors" | "totalVisitors" | "totalClaims" | "isDepleted" | "depletionThresholdAtomic" | "depletionThreshold" | "claimHistory" | "visitorUserIds" | "claimRadiusMeters"> & { claimRadiusMeters?: number; rewardPerClaim: bigint; depletionThresholdAtomic?: bigint }): ClaimableLocation {
  const claimCount = 0;
  const currentRewardAtomic = halvedRewardAtomic(claimCount);
  const depletionThresholdAtomic = input.depletionThresholdAtomic ?? DEFAULT_DEPLETION_THRESHOLD;
  const normalizedClaimRadius = typeof input.claimRadiusMeters === "number" && Number.isFinite(input.claimRadiusMeters) && input.claimRadiusMeters > 0
    ? input.claimRadiusMeters
    : DEFAULT_CLAIM_RADIUS_METERS;
  return {
    ...input,
    claimRadiusMeters: normalizedClaimRadius,
    rewardPerClaim: PERBUG_PRECISION_SCALE,
    claimCount,
    currentRewardAtomic,
    currentReward: formatPerbugAtomic(currentRewardAtomic),
    totalClaimedAtomic: 0n,
    totalClaimed: "0.0",
    uniqueVisitors: 0,
    totalVisitors: 0,
    totalClaims: 0,
    isDepleted: currentRewardAtomic < depletionThresholdAtomic,
    depletionThresholdAtomic,
    depletionThreshold: formatPerbugAtomic(depletionThresholdAtomic),
    claimHistory: [],
    visitorUserIds: []
  };
}

export class LocationClaimsService {
  constructor(private readonly store: LocationClaimsStore) {}

  upsertLocation(input: Omit<ClaimableLocation, "rewardPerClaim" | "claimCount" | "currentRewardAtomic" | "currentReward" | "totalClaimedAtomic" | "totalClaimed" | "uniqueVisitors" | "totalVisitors" | "totalClaims" | "isDepleted" | "depletionThresholdAtomic" | "depletionThreshold" | "claimHistory" | "visitorUserIds" | "claimRadiusMeters"> & { claimRadiusMeters?: number; rewardPerClaim?: bigint | number; depletionThresholdAtomic?: bigint | number }): ClaimableLocation {
    const location = normalizeLocation({
      ...input,
      rewardPerClaim: PERBUG_PRECISION_SCALE,
      depletionThresholdAtomic: input.depletionThresholdAtomic != null ? BigInt(input.depletionThresholdAtomic) : undefined
    });
    this.store.upsertLocation(location);
    return location;
  }

  getOrCreateAnnualPool(year = new Date().getUTCFullYear()): AnnualEmissionPool {
    const existing = this.store.getAnnualPool(year);
    if (existing) return existing;

    const previous = this.store.getAnnualPool(year - 1);
    const rollover = previous?.available ?? 0n;
    const pool: AnnualEmissionPool = {
      year,
      annualAllocation: YEARLY_ALLOCATION,
      rolloverFromPrevious: rollover,
      startingPool: YEARLY_ALLOCATION + rollover,
      claimedTotal: 0n,
      available: YEARLY_ALLOCATION + rollover,
      updatedAt: nowIso()
    };
    this.store.upsertAnnualPool(pool);
    this.store.addLedgerEntry({
      id: `ledger_${randomUUID()}`,
      type: "pool_rollover",
      amount: rollover,
      metadata: { year, rolloverFromPrevious: rollover.toString() },
      createdAt: nowIso()
    });
    return pool;
  }

  listNearbyClaimables(input: { userId: string; lat: number; lng: number; maxDistanceMeters?: number }): NearbyLocationResult[] {
    const maxDistanceMeters = input.maxDistanceMeters ?? 2000;
    return this.store.listLocations()
      .map((location) => {
        const distance = distanceMeters(input.lat, input.lng, location.lat, location.lng);
        return { location, distanceMeters: distance, inRange: distance <= location.claimRadiusMeters };
      })
      .filter((entry) => entry.distanceMeters <= maxDistanceMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .map((entry) => ({ ...entry, flowState: this.flowStateFor(input.userId, entry.location.id, entry.inRange) }));
  }

  registerVisit(input: { userId: string; locationId: string; lat: number; lng: number; accuracyMeters?: number }): UserVisit {
    const location = this.requireLocation(input.locationId);
    const distance = distanceMeters(input.lat, input.lng, location.lat, location.lng);
    const state = distance <= location.claimRadiusMeters ? "in_range" : distance <= location.claimRadiusMeters * 1.8 ? "approaching" : "out_of_range";
    const visit: UserVisit = {
      id: `visit_${randomUUID()}`,
      userId: input.userId,
      locationId: location.id,
      enteredAt: nowIso(),
      lastDistanceMeters: distance,
      accuracyMeters: input.accuracyMeters,
      state
    };
    this.store.saveVisit(visit);

    if (!location.visitorUserIds.includes(input.userId)) {
      location.visitorUserIds = [...location.visitorUserIds, input.userId];
      location.uniqueVisitors = location.visitorUserIds.length;
    }
    location.totalVisitors += 1;
    this.store.upsertLocation(location);

    return visit;
  }

  prepareAdGate(input: { userId: string; locationId: string; visitId: string }): AdGateRecord {
    const location = this.requireLocation(input.locationId);
    const visit = this.requireVisit(input.visitId);
    if (visit.userId !== input.userId || visit.locationId != location.id) throw new ValidationError(["visit ownership mismatch"]);
    if (visit.state !== "in_range") throw new ValidationError(["visit is not within claim radius"]);
    if (location.isDepleted) throw new ValidationError(["location depleted"]);

    const record: AdGateRecord = {
      id: `ad_${randomUUID()}`,
      userId: input.userId,
      locationId: input.locationId,
      status: "required"
    };
    this.store.saveAdGate(record);
    return record;
  }

  markAdCompleted(adSessionId: string): AdGateRecord {
    const record = this.store.getAdGate(adSessionId);
    if (!record) throw new ValidationError(["ad session not found"]);
    record.status = "completed";
    record.completedAt = nowIso();
    this.store.saveAdGate(record);
    this.store.addLedgerEntry({ id: `ledger_${randomUUID()}`, type: "ad_gate", userId: record.userId, locationId: record.locationId, metadata: { adSessionId, status: "completed" }, createdAt: nowIso() });
    return record;
  }

  finalizeClaim(input: { userId: string; locationId: string; visitId: string; adSessionId: string; idempotencyKey: string; year?: number }): FinalizedClaim {
    const existing = this.store.getFinalizedClaimByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const location = this.requireLocation(input.locationId);
    if (location.isDepleted) throw new ValidationError(["location depleted"]);

    const visit = this.requireVisit(input.visitId);
    if (visit.userId !== input.userId || visit.locationId !== input.locationId) throw new ValidationError(["visit mismatch"]);
    if (visit.state !== "in_range") throw new ValidationError(["not in claim range"]);
    if ((visit.accuracyMeters ?? 0) > 120) throw new ValidationError(["accuracy too low for claim"]);
    if (this.store.listClaimsByLocation(location.id).some((c) => c.userId === input.userId)) {
      throw new ValidationError(["location already claimed by this user"]);
    }

    const adRecord = this.store.getAdGate(input.adSessionId);
    if (!adRecord || adRecord.status !== "completed") throw new ValidationError(["interstitial ad completion required"]);

    const rewardAtomic = halvedRewardAtomic(location.claimCount);
    if (rewardAtomic <= location.depletionThresholdAtomic) {
      location.isDepleted = true;
      location.state = "exhausted";
      this.store.upsertLocation(location);
      throw new ValidationError(["location depleted"]);
    }

    const attempt: ClaimAttempt = {
      id: `attempt_${randomUUID()}`,
      userId: input.userId,
      locationId: input.locationId,
      visitId: input.visitId,
      adSessionId: input.adSessionId,
      requestedReward: rewardAtomic,
      status: "pending",
      createdAt: nowIso()
    };

    const pool = this.getOrCreateAnnualPool(input.year);
    if (pool.available < rewardAtomic) {
      attempt.status = "rejected";
      attempt.rejectionReason = "emission_pool_exhausted";
      this.store.saveAttempt(attempt);
      this.store.addLedgerEntry({ id: `ledger_${randomUUID()}`, type: "rejection", userId: input.userId, locationId: input.locationId, attemptId: attempt.id, metadata: { reason: attempt.rejectionReason }, createdAt: nowIso() });
      throw new ValidationError(["emission pool exhausted"]);
    }

    attempt.status = "approved";
    this.store.saveAttempt(attempt);

    pool.claimedTotal += rewardAtomic;
    pool.available -= rewardAtomic;
    pool.updatedAt = nowIso();
    this.store.upsertAnnualPool(pool);

    const claim: FinalizedClaim = {
      id: `claim_${randomUUID()}`,
      userId: input.userId,
      locationId: input.locationId,
      visitId: input.visitId,
      attemptId: attempt.id,
      adSessionId: input.adSessionId,
      rewardIssued: rewardAtomic,
      rewardIssuedDisplay: formatPerbugAtomic(rewardAtomic),
      finalizedAt: nowIso(),
      idempotencyKey: input.idempotencyKey
    };
    this.store.saveFinalizedClaim(claim);
    this.store.addLedgerEntry({ id: `ledger_${randomUUID()}`, type: "claim", userId: input.userId, locationId: input.locationId, attemptId: attempt.id, claimId: claim.id, amount: claim.rewardIssued, metadata: { year: pool.year, reward: claim.rewardIssuedDisplay }, createdAt: nowIso() });

    location.claimCount += 1;
    location.totalClaims = location.claimCount;
    location.totalClaimedAtomic += rewardAtomic;
    location.totalClaimed = formatPerbugAtomic(location.totalClaimedAtomic);
    location.claimHistory = [{ claimId: claim.id, userId: input.userId, rewardAtomic, reward: claim.rewardIssuedDisplay, finalizedAt: claim.finalizedAt }, ...location.claimHistory];

    const nextReward = halvedRewardAtomic(location.claimCount);
    location.currentRewardAtomic = nextReward;
    location.currentReward = formatPerbugAtomic(nextReward);
    if (nextReward <= location.depletionThresholdAtomic) {
      location.isDepleted = true;
      location.state = "exhausted";
      location.cooldownUntil = undefined;
    } else if (location.cooldownSeconds > 0) {
      location.state = "cooldown";
      location.cooldownUntil = new Date(Date.now() + location.cooldownSeconds * 1000).toISOString();
    }
    this.store.upsertLocation(location);

    return claim;
  }

  getUserHistory(userId: string): FinalizedClaim[] { return this.store.listClaimsByUser(userId); }
  getPoolStats(year = new Date().getUTCFullYear()): AnnualEmissionPool { return this.getOrCreateAnnualPool(year); }
  listLedger(): LocationClaimLedgerEntry[] { return this.store.listLedger(); }

  private flowStateFor(userId: string, locationId: string, inRange: boolean): ClaimFlowState {
    if (!inRange) return "approaching";
    const location = this.requireLocation(locationId);
    if (location.isDepleted) return "unavailable";
    const alreadyClaimed = this.store.listClaimsByLocation(locationId).some((claim) => claim.userId === userId);
    return alreadyClaimed ? "already_claimed" : "visited";
  }

  private requireLocation(locationId: string): ClaimableLocation {
    const location = this.store.getLocation(locationId);
    if (!location) throw new ValidationError(["location not found"]);
    return location;
  }

  private requireVisit(visitId: string): UserVisit {
    const visit = this.store.getVisit(visitId);
    if (!visit) throw new ValidationError(["visit not found"]);
    return visit;
  }
}
