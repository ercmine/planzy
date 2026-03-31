import type { AdGateRecord, AnnualEmissionPool, ClaimAttempt, ClaimableLocation, FinalizedClaim, LocationClaimLedgerEntry, LocationClaimsStore, UserVisit } from "./types.js";
export declare class MemoryLocationClaimsStore implements LocationClaimsStore {
    private readonly locations;
    private readonly pools;
    private readonly visits;
    private readonly adGates;
    private readonly attempts;
    private readonly claims;
    private readonly claimsByIdempotency;
    private readonly ledger;
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
