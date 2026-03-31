export type ClaimableLocationState = "available" | "cooldown" | "exhausted";
export type VisitProximityState = "out_of_range" | "approaching" | "in_range";
export type ClaimFlowState = "out_of_range" | "approaching" | "visited" | "ad_required" | "claim_ready" | "claim_processing" | "claim_success" | "cooldown" | "already_claimed" | "unavailable";
export interface LocationClaimHistoryEntry {
    claimId: string;
    userId: string;
    rewardAtomic: bigint;
    reward: string;
    finalizedAt: string;
}
export interface ClaimableLocation {
    id: string;
    lat: number;
    lng: number;
    displayName: string;
    category: string;
    claimRadiusMeters: number;
    rewardPerClaim: bigint;
    state: ClaimableLocationState;
    cooldownSeconds: number;
    cooldownUntil?: string;
    rarity?: "common" | "rare" | "epic" | "legendary";
    multiplier?: number;
    regionTag?: string;
    claimCount: number;
    currentRewardAtomic: bigint;
    currentReward: string;
    totalClaimedAtomic: bigint;
    totalClaimed: string;
    uniqueVisitors: number;
    totalVisitors: number;
    totalClaims: number;
    isDepleted: boolean;
    depletionThresholdAtomic: bigint;
    depletionThreshold: string;
    claimHistory: LocationClaimHistoryEntry[];
    visitorUserIds: string[];
}
export interface AnnualEmissionPool {
    year: number;
    annualAllocation: bigint;
    rolloverFromPrevious: bigint;
    startingPool: bigint;
    claimedTotal: bigint;
    available: bigint;
    updatedAt: string;
}
export interface UserVisit {
    id: string;
    userId: string;
    locationId: string;
    enteredAt: string;
    exitedAt?: string;
    lastDistanceMeters: number;
    accuracyMeters?: number;
    state: VisitProximityState;
}
export interface ClaimAttempt {
    id: string;
    userId: string;
    locationId: string;
    visitId: string;
    adSessionId: string;
    requestedReward: bigint;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
    createdAt: string;
}
export interface FinalizedClaim {
    id: string;
    userId: string;
    locationId: string;
    visitId: string;
    attemptId: string;
    adSessionId: string;
    rewardIssued: bigint;
    rewardIssuedDisplay: string;
    finalizedAt: string;
    idempotencyKey: string;
}
export interface AdGateRecord {
    id: string;
    userId: string;
    locationId: string;
    status: "required" | "shown" | "completed" | "failed";
    completedAt?: string;
}
export interface LocationClaimLedgerEntry {
    id: string;
    type: "claim" | "rejection" | "ad_gate" | "pool_rollover";
    userId?: string;
    locationId?: string;
    attemptId?: string;
    claimId?: string;
    amount?: bigint;
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface NearbyLocationResult {
    location: ClaimableLocation;
    distanceMeters: number;
    inRange: boolean;
    flowState: ClaimFlowState;
}
export interface LocationClaimsStore {
    upsertLocation(location: ClaimableLocation): void;
    getLocation(locationId: string): ClaimableLocation | null;
    listLocations(): ClaimableLocation[];
    upsertAnnualPool(pool: AnnualEmissionPool): void;
    getAnnualPool(year: number): AnnualEmissionPool | null;
    saveVisit(visit: UserVisit): void;
    getVisit(visitId: string): UserVisit | null;
    listVisitsByUser(userId: string): UserVisit[];
    saveAdGate(record: AdGateRecord): void;
    getAdGate(adGateId: string): AdGateRecord | null;
    saveAttempt(attempt: ClaimAttempt): void;
    getAttempt(attemptId: string): ClaimAttempt | null;
    saveFinalizedClaim(claim: FinalizedClaim): void;
    getFinalizedClaimByIdempotencyKey(key: string): FinalizedClaim | null;
    listClaimsByUser(userId: string): FinalizedClaim[];
    listClaimsByLocation(locationId: string): FinalizedClaim[];
    addLedgerEntry(entry: LocationClaimLedgerEntry): void;
    listLedger(): LocationClaimLedgerEntry[];
}
