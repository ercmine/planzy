export class MemoryGamificationControlStore {
    rules = new Map();
    processedEventIds = new Set();
    eventsByUser = new Map();
    userStates = new Map();
    decisions = new Map();
    decisionIdsByUser = new Map();
    adminLogs = [];
    listRuleVersions() {
        return [...this.rules.values()].sort((a, b) => b.version - a.version);
    }
    saveRuleVersion(version) {
        this.rules.set(version.id, version);
    }
    getRuleVersion(ruleVersionId) {
        return this.rules.get(ruleVersionId);
    }
    getActiveRuleVersion(nowIso) {
        return this.listRuleVersions().find((rule) => rule.lifecycle === "active" && (!rule.effectiveFrom || rule.effectiveFrom <= nowIso));
    }
    hasProcessedEvent(eventId) {
        return this.processedEventIds.has(eventId);
    }
    markProcessedEvent(eventId) {
        this.processedEventIds.add(eventId);
    }
    saveEvent(event) {
        const current = this.eventsByUser.get(event.userId) ?? [];
        current.push(event);
        this.eventsByUser.set(event.userId, current);
    }
    listEventsByUser(userId) {
        return [...(this.eventsByUser.get(userId) ?? [])].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    }
    getUserState(userId) {
        return this.userStates.get(userId);
    }
    saveUserState(state) {
        this.userStates.set(state.userId, state);
    }
    clearUserState(userId) {
        this.userStates.delete(userId);
    }
    saveDecision(decision) {
        this.decisions.set(decision.decisionId, decision);
        const ids = this.decisionIdsByUser.get(decision.userId) ?? [];
        ids.push(decision.decisionId);
        this.decisionIdsByUser.set(decision.userId, ids);
    }
    listDecisionsByUser(userId) {
        return (this.decisionIdsByUser.get(userId) ?? []).map((id) => this.decisions.get(id)).filter(Boolean);
    }
    getDecision(decisionId) {
        return this.decisions.get(decisionId);
    }
    saveAdminAuditLog(log) {
        this.adminLogs.push(log);
    }
    listAdminAuditLogs() {
        return [...this.adminLogs];
    }
}
