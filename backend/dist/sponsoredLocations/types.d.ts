export type SponsoredCampaignStatus = "draft" | "active" | "paused" | "ended" | "exhausted" | "rejected";
export type PlacementSurface = "map" | "nearby" | "category" | "feed" | "search" | "featured";
export type RewardRuleType = "fixed_per_visit" | "decay_per_claim" | "first_x_daily" | "split_over_time";
export type QualifyingAction = "check_in" | "dwell" | "review" | "video" | "media_upload" | "receipt";
export type VisitStatus = "started" | "verified" | "ineligible" | "completed";
export type SponsoredClaimStatus = "reserved" | "paid" | "rejected" | "manual_review";
export interface PlaceOwnerAccess {
    id: string;
    placeId: string;
    businessId: string;
    userId: string;
    role: "owner" | "manager";
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    approvedAt?: string;
    reviewedBy?: string;
}
export interface SponsoredCampaign {
    id: string;
    placeId: string;
    businessId: string;
    title: string;
    callToAction?: string;
    categoryTags: string[];
    placements: PlacementSurface[];
    targetRadiusMeters: number;
    startsAt: string;
    endsAt: string;
    dailyBudgetAtomic: bigint;
    totalBudgetAtomic: bigint;
    status: SponsoredCampaignStatus;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface SponsoredRewardRule {
    campaignId: string;
    type: RewardRuleType;
    payoutAtomic: bigint;
    decayBps?: number;
    firstXDaily?: number;
    splitWindowDays?: number;
    cooldownHours: number;
    dwellSeconds: number;
    requiredActions: QualifyingAction[];
    oneRewardPerDay: boolean;
}
export interface CampaignBudget {
    campaignId: string;
    fundedAtomic: bigint;
    platformFeeAtomic: bigint;
    rewardPoolAtomic: bigint;
    reservedAtomic: bigint;
    paidAtomic: bigint;
    refundedAtomic: bigint;
    updatedAt: string;
}
export interface VisitSession {
    id: string;
    userId: string;
    campaignId: string;
    placeId: string;
    startedAt: string;
    endedAt?: string;
    status: VisitStatus;
    startLat: number;
    startLng: number;
    latestLat: number;
    latestLng: number;
    samples: number;
    dwellSeconds: number;
    riskScore: number;
    riskReasons: string[];
}
export interface EligibilityDecision {
    id: string;
    visitSessionId: string;
    eligible: boolean;
    rejectionReasons: string[];
    payoutAtomic: bigint;
    decidedAt: string;
}
export interface RewardClaim {
    id: string;
    campaignId: string;
    placeId: string;
    userId: string;
    visitSessionId: string;
    decisionId: string;
    payoutAtomic: bigint;
    status: SponsoredClaimStatus;
    createdAt: string;
    paidAt?: string;
}
export interface FraudFlag {
    id: string;
    campaignId?: string;
    placeId?: string;
    userId?: string;
    visitSessionId?: string;
    severity: "low" | "medium" | "high";
    reason: string;
    createdAt: string;
}
export interface LedgerEntry {
    id: string;
    campaignId: string;
    placeId: string;
    businessId: string;
    userId?: string;
    type: "funding" | "platform_fee" | "reward_reserve" | "reward_payout" | "reward_release" | "refund" | "admin_adjustment";
    amountAtomic: bigint;
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface SponsoredLocationStore {
    savePlaceAccess(record: PlaceOwnerAccess): void;
    listPlaceAccess(placeId: string): PlaceOwnerAccess[];
    listBusinessAccess(businessId: string): PlaceOwnerAccess[];
    getPlaceAccess(accessId: string): PlaceOwnerAccess | null;
    saveCampaign(campaign: SponsoredCampaign): void;
    getCampaign(campaignId: string): SponsoredCampaign | null;
    listCampaignsByBusiness(businessId: string): SponsoredCampaign[];
    listActiveCampaigns(): SponsoredCampaign[];
    saveRewardRule(rule: SponsoredRewardRule): void;
    getRewardRule(campaignId: string): SponsoredRewardRule | null;
    saveBudget(budget: CampaignBudget): void;
    getBudget(campaignId: string): CampaignBudget | null;
    saveVisitSession(session: VisitSession): void;
    getVisitSession(sessionId: string): VisitSession | null;
    listVisitSessionsByUser(userId: string): VisitSession[];
    saveDecision(decision: EligibilityDecision): void;
    getDecision(decisionId: string): EligibilityDecision | null;
    getDecisionByVisit(visitSessionId: string): EligibilityDecision | null;
    saveClaim(claim: RewardClaim): void;
    getClaim(claimId: string): RewardClaim | null;
    getClaimByVisit(visitSessionId: string): RewardClaim | null;
    listClaimsByCampaign(campaignId: string): RewardClaim[];
    listClaimsByUser(userId: string): RewardClaim[];
    addFraudFlag(flag: FraudFlag): void;
    listFraudFlags(): FraudFlag[];
    addLedgerEntry(entry: LedgerEntry): void;
    listLedgerForCampaign(campaignId: string): LedgerEntry[];
}
