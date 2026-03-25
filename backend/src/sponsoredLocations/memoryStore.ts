import type { CampaignBudget, EligibilityDecision, FraudFlag, LedgerEntry, PlaceOwnerAccess, RewardClaim, SponsoredCampaign, SponsoredLocationStore, SponsoredRewardRule, VisitSession } from "./types.js";

export class MemorySponsoredLocationStore implements SponsoredLocationStore {
  private readonly placeAccess = new Map<string, PlaceOwnerAccess>();
  private readonly campaigns = new Map<string, SponsoredCampaign>();
  private readonly rewardRules = new Map<string, SponsoredRewardRule>();
  private readonly budgets = new Map<string, CampaignBudget>();
  private readonly visits = new Map<string, VisitSession>();
  private readonly decisions = new Map<string, EligibilityDecision>();
  private readonly claims = new Map<string, RewardClaim>();
  private readonly flags: FraudFlag[] = [];
  private readonly ledger: LedgerEntry[] = [];

  savePlaceAccess(record: PlaceOwnerAccess): void { this.placeAccess.set(record.id, record); }
  listPlaceAccess(placeId: string): PlaceOwnerAccess[] { return [...this.placeAccess.values()].filter((v) => v.placeId === placeId); }
  listBusinessAccess(businessId: string): PlaceOwnerAccess[] { return [...this.placeAccess.values()].filter((v) => v.businessId === businessId); }
  getPlaceAccess(accessId: string): PlaceOwnerAccess | null { return this.placeAccess.get(accessId) ?? null; }

  saveCampaign(campaign: SponsoredCampaign): void { this.campaigns.set(campaign.id, campaign); }
  getCampaign(campaignId: string): SponsoredCampaign | null { return this.campaigns.get(campaignId) ?? null; }
  listCampaignsByBusiness(businessId: string): SponsoredCampaign[] { return [...this.campaigns.values()].filter((v) => v.businessId === businessId); }
  listActiveCampaigns(): SponsoredCampaign[] { return [...this.campaigns.values()].filter((v) => v.status === "active"); }

  saveRewardRule(rule: SponsoredRewardRule): void { this.rewardRules.set(rule.campaignId, rule); }
  getRewardRule(campaignId: string): SponsoredRewardRule | null { return this.rewardRules.get(campaignId) ?? null; }

  saveBudget(budget: CampaignBudget): void { this.budgets.set(budget.campaignId, budget); }
  getBudget(campaignId: string): CampaignBudget | null { return this.budgets.get(campaignId) ?? null; }

  saveVisitSession(session: VisitSession): void { this.visits.set(session.id, session); }
  getVisitSession(sessionId: string): VisitSession | null { return this.visits.get(sessionId) ?? null; }
  listVisitSessionsByUser(userId: string): VisitSession[] { return [...this.visits.values()].filter((v) => v.userId === userId); }

  saveDecision(decision: EligibilityDecision): void { this.decisions.set(decision.id, decision); }
  getDecision(decisionId: string): EligibilityDecision | null { return this.decisions.get(decisionId) ?? null; }
  getDecisionByVisit(visitSessionId: string): EligibilityDecision | null { return [...this.decisions.values()].find((v) => v.visitSessionId === visitSessionId) ?? null; }

  saveClaim(claim: RewardClaim): void { this.claims.set(claim.id, claim); }
  getClaim(claimId: string): RewardClaim | null { return this.claims.get(claimId) ?? null; }
  getClaimByVisit(visitSessionId: string): RewardClaim | null { return [...this.claims.values()].find((v) => v.visitSessionId === visitSessionId) ?? null; }
  listClaimsByCampaign(campaignId: string): RewardClaim[] { return [...this.claims.values()].filter((v) => v.campaignId === campaignId); }
  listClaimsByUser(userId: string): RewardClaim[] { return [...this.claims.values()].filter((v) => v.userId === userId); }

  addFraudFlag(flag: FraudFlag): void { this.flags.push(flag); }
  listFraudFlags(): FraudFlag[] { return [...this.flags]; }

  addLedgerEntry(entry: LedgerEntry): void { this.ledger.push(entry); }
  listLedgerForCampaign(campaignId: string): LedgerEntry[] { return this.ledger.filter((v) => v.campaignId === campaignId); }
}
