import type {
  AdGateRecord,
  AnnualEmissionPool,
  ClaimAttempt,
  ClaimableLocation,
  FinalizedClaim,
  LocationClaimLedgerEntry,
  LocationClaimsStore,
  UserVisit
} from "./types.js";

export class MemoryLocationClaimsStore implements LocationClaimsStore {
  private readonly locations = new Map<string, ClaimableLocation>();
  private readonly pools = new Map<number, AnnualEmissionPool>();
  private readonly visits = new Map<string, UserVisit>();
  private readonly adGates = new Map<string, AdGateRecord>();
  private readonly attempts = new Map<string, ClaimAttempt>();
  private readonly claims = new Map<string, FinalizedClaim>();
  private readonly claimsByIdempotency = new Map<string, string>();
  private readonly ledger: LocationClaimLedgerEntry[] = [];

  upsertLocation(location: ClaimableLocation): void { this.locations.set(location.id, structuredClone(location)); }
  getLocation(locationId: string): ClaimableLocation | null { return this.locations.get(locationId) ? structuredClone(this.locations.get(locationId)!) : null; }
  listLocations(): ClaimableLocation[] { return [...this.locations.values()].map((v) => structuredClone(v)); }

  upsertAnnualPool(pool: AnnualEmissionPool): void { this.pools.set(pool.year, structuredClone(pool)); }
  getAnnualPool(year: number): AnnualEmissionPool | null { return this.pools.get(year) ? structuredClone(this.pools.get(year)!) : null; }

  saveVisit(visit: UserVisit): void { this.visits.set(visit.id, structuredClone(visit)); }
  getVisit(visitId: string): UserVisit | null { return this.visits.get(visitId) ? structuredClone(this.visits.get(visitId)!) : null; }
  listVisitsByUser(userId: string): UserVisit[] { return [...this.visits.values()].filter((v) => v.userId === userId).map((v) => structuredClone(v)); }

  saveAdGate(record: AdGateRecord): void { this.adGates.set(record.id, structuredClone(record)); }
  getAdGate(adGateId: string): AdGateRecord | null { return this.adGates.get(adGateId) ? structuredClone(this.adGates.get(adGateId)!) : null; }

  saveAttempt(attempt: ClaimAttempt): void { this.attempts.set(attempt.id, structuredClone(attempt)); }
  getAttempt(attemptId: string): ClaimAttempt | null { return this.attempts.get(attemptId) ? structuredClone(this.attempts.get(attemptId)!) : null; }

  saveFinalizedClaim(claim: FinalizedClaim): void {
    this.claims.set(claim.id, structuredClone(claim));
    this.claimsByIdempotency.set(claim.idempotencyKey, claim.id);
  }
  getFinalizedClaimByIdempotencyKey(key: string): FinalizedClaim | null {
    const claimId = this.claimsByIdempotency.get(key);
    if (!claimId) return null;
    const claim = this.claims.get(claimId);
    return claim ? structuredClone(claim) : null;
  }
  listClaimsByUser(userId: string): FinalizedClaim[] { return [...this.claims.values()].filter((c) => c.userId === userId).map((c) => structuredClone(c)); }
  listClaimsByLocation(locationId: string): FinalizedClaim[] { return [...this.claims.values()].filter((c) => c.locationId === locationId).map((c) => structuredClone(c)); }

  addLedgerEntry(entry: LocationClaimLedgerEntry): void { this.ledger.push(structuredClone(entry)); }
  listLedger(): LocationClaimLedgerEntry[] { return this.ledger.map((e) => structuredClone(e)); }
}
