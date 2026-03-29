export class MemorySponsoredLocationStore {
    placeAccess = new Map();
    campaigns = new Map();
    rewardRules = new Map();
    budgets = new Map();
    visits = new Map();
    decisions = new Map();
    claims = new Map();
    flags = [];
    ledger = [];
    savePlaceAccess(record) { this.placeAccess.set(record.id, record); }
    listPlaceAccess(placeId) { return [...this.placeAccess.values()].filter((v) => v.placeId === placeId); }
    listBusinessAccess(businessId) { return [...this.placeAccess.values()].filter((v) => v.businessId === businessId); }
    getPlaceAccess(accessId) { return this.placeAccess.get(accessId) ?? null; }
    saveCampaign(campaign) { this.campaigns.set(campaign.id, campaign); }
    getCampaign(campaignId) { return this.campaigns.get(campaignId) ?? null; }
    listCampaignsByBusiness(businessId) { return [...this.campaigns.values()].filter((v) => v.businessId === businessId); }
    listActiveCampaigns() { return [...this.campaigns.values()].filter((v) => v.status === "active"); }
    saveRewardRule(rule) { this.rewardRules.set(rule.campaignId, rule); }
    getRewardRule(campaignId) { return this.rewardRules.get(campaignId) ?? null; }
    saveBudget(budget) { this.budgets.set(budget.campaignId, budget); }
    getBudget(campaignId) { return this.budgets.get(campaignId) ?? null; }
    saveVisitSession(session) { this.visits.set(session.id, session); }
    getVisitSession(sessionId) { return this.visits.get(sessionId) ?? null; }
    listVisitSessionsByUser(userId) { return [...this.visits.values()].filter((v) => v.userId === userId); }
    saveDecision(decision) { this.decisions.set(decision.id, decision); }
    getDecision(decisionId) { return this.decisions.get(decisionId) ?? null; }
    getDecisionByVisit(visitSessionId) { return [...this.decisions.values()].find((v) => v.visitSessionId === visitSessionId) ?? null; }
    saveClaim(claim) { this.claims.set(claim.id, claim); }
    getClaim(claimId) { return this.claims.get(claimId) ?? null; }
    getClaimByVisit(visitSessionId) { return [...this.claims.values()].find((v) => v.visitSessionId === visitSessionId) ?? null; }
    listClaimsByCampaign(campaignId) { return [...this.claims.values()].filter((v) => v.campaignId === campaignId); }
    listClaimsByUser(userId) { return [...this.claims.values()].filter((v) => v.userId === userId); }
    addFraudFlag(flag) { this.flags.push(flag); }
    listFraudFlags() { return [...this.flags]; }
    addLedgerEntry(entry) { this.ledger.push(entry); }
    listLedgerForCampaign(campaignId) { return this.ledger.filter((v) => v.campaignId === campaignId); }
}
