export class MemoryViewerEngagementStore {
    sessions = new Map();
    userSessions = new Map();
    eventsByUser = new Map();
    rules = new Map();
    decisionsByUser = new Map();
    ledger = [];
    ledgerById = new Map();
    riskFlags = [];
    summaryByUser = new Map();
    poolsById = new Map();
    videoCampaign = new Map();
    createWatchSession(session) {
        this.sessions.set(session.id, structuredClone(session));
        this.userSessions.set(session.userId, [session.id, ...(this.userSessions.get(session.userId) ?? [])]);
    }
    updateWatchSession(session) {
        this.sessions.set(session.id, structuredClone(session));
    }
    getWatchSession(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? structuredClone(session) : null;
    }
    listUserWatchSessions(userId, limit = 200) {
        return (this.userSessions.get(userId) ?? []).slice(0, limit).map((id) => structuredClone(this.sessions.get(id)));
    }
    saveEvent(event) {
        this.eventsByUser.set(event.userId, [structuredClone(event), ...(this.eventsByUser.get(event.userId) ?? [])]);
    }
    listUserEvents(userId, action) {
        return (this.eventsByUser.get(userId) ?? [])
            .filter((event) => !action || event.action === action)
            .map((event) => structuredClone(event));
    }
    upsertRewardRule(rule) { this.rules.set(rule.action, structuredClone(rule)); }
    listRewardRules() { return [...this.rules.values()].map((rule) => structuredClone(rule)); }
    getRewardRule(action) {
        const rule = this.rules.get(action);
        return rule ? structuredClone(rule) : null;
    }
    saveEligibilityDecision(decision) {
        this.decisionsByUser.set(decision.userId, [structuredClone(decision), ...(this.decisionsByUser.get(decision.userId) ?? [])]);
    }
    listEligibilityDecisions(userId, videoId) {
        return (this.decisionsByUser.get(userId) ?? [])
            .filter((decision) => !videoId || decision.videoId === videoId)
            .map((decision) => structuredClone(decision));
    }
    saveLedgerEntry(entry) {
        this.ledgerById.set(entry.id, structuredClone(entry));
        this.ledger = [structuredClone(entry), ...this.ledger.filter((item) => item.id !== entry.id)];
    }
    listLedgerEntries(userId) {
        return this.ledger.filter((entry) => !userId || entry.userId === userId).map((entry) => structuredClone(entry));
    }
    getLedgerEntry(entryId) {
        const entry = this.ledgerById.get(entryId);
        return entry ? structuredClone(entry) : null;
    }
    saveRiskFlag(flag) {
        this.riskFlags = [structuredClone(flag), ...this.riskFlags];
    }
    listRiskFlags(userId) {
        return this.riskFlags.filter((flag) => !userId || flag.userId === userId).map((flag) => structuredClone(flag));
    }
    saveRewardSummary(summary) {
        this.summaryByUser.set(summary.userId, structuredClone(summary));
    }
    getRewardSummary(userId) {
        const summary = this.summaryByUser.get(userId);
        return summary ? structuredClone(summary) : null;
    }
    saveSponsoredPool(pool) {
        this.poolsById.set(pool.id, structuredClone(pool));
    }
    getSponsoredPool(poolId) {
        const pool = this.poolsById.get(poolId);
        return pool ? structuredClone(pool) : null;
    }
    findSponsoredPoolForVideo(videoId, atIso) {
        const poolId = this.videoCampaign.get(videoId);
        if (!poolId)
            return null;
        const pool = this.poolsById.get(poolId);
        if (!pool)
            return null;
        const at = Date.parse(atIso);
        if (!pool.active || at < Date.parse(pool.startsAt) || at > Date.parse(pool.endsAt))
            return null;
        return structuredClone(pool);
    }
    setVideoCampaign(videoId, poolId) {
        this.videoCampaign.set(videoId, poolId);
    }
    listSponsoredPools() {
        return [...this.poolsById.values()].map((pool) => structuredClone(pool));
    }
}
