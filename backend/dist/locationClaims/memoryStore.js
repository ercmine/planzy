export class MemoryLocationClaimsStore {
    locations = new Map();
    pools = new Map();
    visits = new Map();
    adGates = new Map();
    attempts = new Map();
    claims = new Map();
    claimsByIdempotency = new Map();
    ledger = [];
    upsertLocation(location) { this.locations.set(location.id, structuredClone(location)); }
    getLocation(locationId) { return this.locations.get(locationId) ? structuredClone(this.locations.get(locationId)) : null; }
    listLocations() { return [...this.locations.values()].map((v) => structuredClone(v)); }
    upsertAnnualPool(pool) { this.pools.set(pool.year, structuredClone(pool)); }
    getAnnualPool(year) { return this.pools.get(year) ? structuredClone(this.pools.get(year)) : null; }
    saveVisit(visit) { this.visits.set(visit.id, structuredClone(visit)); }
    getVisit(visitId) { return this.visits.get(visitId) ? structuredClone(this.visits.get(visitId)) : null; }
    listVisitsByUser(userId) { return [...this.visits.values()].filter((v) => v.userId === userId).map((v) => structuredClone(v)); }
    saveAdGate(record) { this.adGates.set(record.id, structuredClone(record)); }
    getAdGate(adGateId) { return this.adGates.get(adGateId) ? structuredClone(this.adGates.get(adGateId)) : null; }
    saveAttempt(attempt) { this.attempts.set(attempt.id, structuredClone(attempt)); }
    getAttempt(attemptId) { return this.attempts.get(attemptId) ? structuredClone(this.attempts.get(attemptId)) : null; }
    saveFinalizedClaim(claim) {
        this.claims.set(claim.id, structuredClone(claim));
        this.claimsByIdempotency.set(claim.idempotencyKey, claim.id);
    }
    getFinalizedClaimByIdempotencyKey(key) {
        const claimId = this.claimsByIdempotency.get(key);
        if (!claimId)
            return null;
        const claim = this.claims.get(claimId);
        return claim ? structuredClone(claim) : null;
    }
    listClaimsByUser(userId) { return [...this.claims.values()].filter((c) => c.userId === userId).map((c) => structuredClone(c)); }
    listClaimsByLocation(locationId) { return [...this.claims.values()].filter((c) => c.locationId === locationId).map((c) => structuredClone(c)); }
    addLedgerEntry(entry) { this.ledger.push(structuredClone(entry)); }
    listLedger() { return this.ledger.map((e) => structuredClone(e)); }
}
