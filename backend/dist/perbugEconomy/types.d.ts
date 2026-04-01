export type EconomyFeatureType = "business_sponsorship" | "business_quest" | "premium_membership" | "ad_marketplace" | "offer_redemption" | "creator_reward" | "curator_reward" | "exploration_reward" | "collection_reward";
export interface TokenSplitConfig {
    feature: EconomyFeatureType;
    rewardPoolBps: number;
    creatorPoolBps: number;
    treasuryBps: number;
    burnBps: number;
    partnerBps: number;
    updatedAt: string;
    updatedBy: string;
}
export interface TokenAccount {
    ownerType: "user" | "business" | "platform" | "pool";
    ownerId: string;
    balanceAtomic: bigint;
    updatedAt: string;
}
export type EconomyLedgerEntryType = "funding" | "spend" | "reward_reservation" | "reward_payout" | "reward_release" | "burn" | "treasury_allocation" | "membership_purchase" | "offer_redemption" | "refund" | "admin_adjustment";
export interface EconomyLedgerEntry {
    id: string;
    feature: EconomyFeatureType;
    type: EconomyLedgerEntryType;
    amountAtomic: bigint;
    fromAccount?: string;
    toAccount?: string;
    referenceType: string;
    referenceId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    createdBy: string;
}
export interface BusinessQuest {
    id: string;
    businessId: string;
    placeId: string;
    title: string;
    status: "draft" | "active" | "paused" | "ended";
    actionType: "visit_checkin" | "visit_review" | "visit_video" | "weekday_lunch" | "event_hours" | "first_time_customer";
    rewardAtomic: bigint;
    budgetAtomic: bigint;
    paidAtomic: bigint;
    dailyCap: number;
    totalCap: number;
    startsAt: string;
    endsAt: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface QuestCompletion {
    id: string;
    questId: string;
    userId: string;
    completedAt: string;
    rewardAtomic: bigint;
    status: "approved" | "manual_review" | "rejected";
    fraudReasons: string[];
}
export interface ExplorationProgress {
    userId: string;
    streakDays: number;
    lastCheckInDate?: string;
    uniquePlaces: string[];
    uniqueNeighborhoods: string[];
    totalPaidAtomic: bigint;
    updatedAt: string;
}
export interface CollectionDefinition {
    id: string;
    title: string;
    placeIds: string[];
    milestoneRewardsAtomic: bigint[];
    completionRewardAtomic: bigint;
    sponsoredByBusinessId?: string;
    startsAt?: string;
    endsAt?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CollectionProgress {
    collectionId: string;
    userId: string;
    visitedPlaceIds: string[];
    claimedMilestones: number[];
    completedAt?: string;
    totalPaidAtomic: bigint;
    updatedAt: string;
}
export interface CreatorRewardRecord {
    id: string;
    userId: string;
    contentId: string;
    contentType: "text_review" | "video_review" | "photo_post" | "guide" | "route" | "list";
    qualityScore: number;
    trustTier: "bronze" | "silver" | "gold" | "platinum";
    pendingAtomic: bigint;
    claimableAtomic: bigint;
    paidAtomic: bigint;
    status: "pending" | "claimable" | "paid" | "rejected";
    moderationState: "pending" | "approved" | "rejected";
    riskScore: number;
    reasons: string[];
    createdAt: string;
    updatedAt: string;
}
export interface CuratorGuide {
    id: string;
    curatorUserId: string;
    title: string;
    placeIds: string[];
    cityId: string;
    status: "draft" | "published" | "archived";
    sponsoredByBusinessId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface CuratorGuideAnalytics {
    guideId: string;
    saves: number;
    follows: number;
    drivenVisits: number;
    completedRoutes: number;
    downstreamReviews: number;
    rewardAtomic: bigint;
    updatedAt: string;
}
export interface PremiumMembership {
    userId: string;
    tier: "pro" | "elite";
    startedAt: string;
    expiresAt: string;
    autoRenew: boolean;
    paidAtomic: bigint;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Offer {
    id: string;
    businessId: string;
    placeId: string;
    title: string;
    costAtomic: bigint;
    inventory: number;
    redeemed: number;
    status: "draft" | "active" | "paused" | "ended";
    startsAt: string;
    endsAt: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface Redemption {
    id: string;
    offerId: string;
    userId: string;
    redeemedAt: string;
    costAtomic: bigint;
    status: "approved" | "rejected";
    reason?: string;
}
export interface EconomyFraudFlag {
    id: string;
    userId?: string;
    businessId?: string;
    referenceType: string;
    referenceId: string;
    severity: "low" | "medium" | "high";
    reason: string;
    createdAt: string;
}
export interface UserPayoutProfile {
    userId: string;
    payoutAddress: string;
    updatedAt: string;
}
export type WithdrawalStatus = "pending" | "processing" | "completed" | "failed";
export interface WithdrawalRecord {
    id: string;
    userId: string;
    amountAtomic: bigint;
    toAddress: string;
    status: WithdrawalStatus;
    idempotencyKey: string;
    txid?: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    failedAt?: string;
    failureReason?: string;
}
export interface EconomyStore {
    listSplitConfigs(): TokenSplitConfig[];
    saveSplitConfig(config: TokenSplitConfig): void;
    getTokenAccount(ownerType: TokenAccount["ownerType"], ownerId: string): TokenAccount | null;
    saveTokenAccount(account: TokenAccount): void;
    listTokenAccounts(ownerType?: TokenAccount["ownerType"]): TokenAccount[];
    addLedgerEntry(entry: EconomyLedgerEntry): void;
    listLedger(referenceType?: string, referenceId?: string): EconomyLedgerEntry[];
    saveQuest(quest: BusinessQuest): void;
    getQuest(questId: string): BusinessQuest | null;
    listQuests(): BusinessQuest[];
    saveQuestCompletion(completion: QuestCompletion): void;
    listQuestCompletions(questId: string): QuestCompletion[];
    listQuestCompletionsForUser(userId: string): QuestCompletion[];
    getExplorationProgress(userId: string): ExplorationProgress | null;
    saveExplorationProgress(progress: ExplorationProgress): void;
    saveCollection(definition: CollectionDefinition): void;
    listCollections(): CollectionDefinition[];
    getCollection(collectionId: string): CollectionDefinition | null;
    getCollectionProgress(collectionId: string, userId: string): CollectionProgress | null;
    saveCollectionProgress(progress: CollectionProgress): void;
    saveCreatorReward(record: CreatorRewardRecord): void;
    listCreatorRewards(userId: string): CreatorRewardRecord[];
    getCreatorReward(recordId: string): CreatorRewardRecord | null;
    saveGuide(guide: CuratorGuide): void;
    listGuides(curatorUserId?: string): CuratorGuide[];
    getGuide(guideId: string): CuratorGuide | null;
    saveGuideAnalytics(analytics: CuratorGuideAnalytics): void;
    getGuideAnalytics(guideId: string): CuratorGuideAnalytics | null;
    saveMembership(membership: PremiumMembership): void;
    getMembership(userId: string): PremiumMembership | null;
    saveOffer(offer: Offer): void;
    getOffer(offerId: string): Offer | null;
    listOffers(placeId?: string): Offer[];
    saveRedemption(redemption: Redemption): void;
    listRedemptions(userId: string): Redemption[];
    addFraudFlag(flag: EconomyFraudFlag): void;
    listFraudFlags(): EconomyFraudFlag[];
    savePayoutProfile(profile: UserPayoutProfile): void;
    getPayoutProfile(userId: string): UserPayoutProfile | null;
    saveWithdrawal(record: WithdrawalRecord): void;
    getWithdrawal(withdrawalId: string): WithdrawalRecord | null;
    getWithdrawalByIdempotency(userId: string, idempotencyKey: string): WithdrawalRecord | null;
    listWithdrawalsByUser(userId: string): WithdrawalRecord[];
}
