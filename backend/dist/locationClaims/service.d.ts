import type { AdGateRecord, AnnualEmissionPool, ClaimableLocation, FinalizedClaim, LocationClaimLedgerEntry, LocationClaimsStore, NearbyLocationResult, UserVisit } from "./types.js";
export interface LocationClaimPayoutRpcClient {
    validateAddress(address: string): Promise<boolean>;
    sendToAddress(address: string, amount: number, comment?: string): Promise<string>;
}
export declare class LocationClaimsService {
    private readonly store;
    private readonly payoutRpcClient?;
    constructor(store: LocationClaimsStore, payoutRpcClient?: LocationClaimPayoutRpcClient | undefined);
    upsertLocation(input: Omit<ClaimableLocation, "rewardPerClaim" | "claimCount" | "currentRewardAtomic" | "currentReward" | "totalClaimedAtomic" | "totalClaimed" | "uniqueVisitors" | "totalVisitors" | "totalClaims" | "isDepleted" | "depletionThresholdAtomic" | "depletionThreshold" | "claimHistory" | "visitorUserIds" | "claimRadiusMeters"> & {
        claimRadiusMeters?: number;
        rewardPerClaim?: bigint | number;
        depletionThresholdAtomic?: bigint | number;
    }): ClaimableLocation;
    getOrCreateAnnualPool(year?: number): AnnualEmissionPool;
    listNearbyClaimables(input: {
        userId: string;
        lat: number;
        lng: number;
        maxDistanceMeters?: number;
    }): NearbyLocationResult[];
    registerVisit(input: {
        userId: string;
        locationId: string;
        lat: number;
        lng: number;
        accuracyMeters?: number;
    }): UserVisit;
    prepareAdGate(input: {
        userId: string;
        locationId: string;
        visitId: string;
    }): AdGateRecord;
    markAdCompleted(adSessionId: string): AdGateRecord;
    finalizeClaim(input: {
        userId: string;
        locationId: string;
        visitId: string;
        adSessionId: string;
        idempotencyKey: string;
        payoutAddress: string;
        year?: number;
    }): Promise<FinalizedClaim>;
    getUserHistory(userId: string): FinalizedClaim[];
    getPoolStats(year?: number): AnnualEmissionPool;
    listLedger(): LocationClaimLedgerEntry[];
    private flowStateFor;
    private requireLocation;
    private requireVisit;
}
