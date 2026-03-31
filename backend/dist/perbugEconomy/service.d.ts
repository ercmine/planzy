import type { BusinessQuest, CollectionDefinition, CollectionProgress, CreatorRewardRecord, CuratorGuide, CuratorGuideAnalytics, EconomyFraudFlag, EconomyStore, ExplorationProgress, Offer, PremiumMembership, QuestCompletion, TokenAccount, TokenSplitConfig } from "./types.js";
export declare class PerbugEconomyService {
    private readonly store;
    constructor(store: EconomyStore);
    seedSplitConfig(actor: string): void;
    creditUser(userId: string, amountPerbug: number, actor?: string): TokenAccount;
    creditBusiness(businessId: string, amountPerbug: number, actor?: string): TokenAccount;
    createBusinessQuest(input: Omit<BusinessQuest, "id" | "status" | "paidAtomic" | "createdAt" | "updatedAt" | "rewardAtomic" | "budgetAtomic"> & {
        rewardPerbug: number;
        budgetPerbug: number;
    }): BusinessQuest;
    completeQuest(input: {
        questId: string;
        userId: string;
        deviceTrustScore: number;
        completedAt?: string;
    }): QuestCompletion;
    recordExplorationCheckIn(input: {
        userId: string;
        placeId: string;
        neighborhoodId: string;
        verified: boolean;
        dwellSeconds: number;
        fromGuideId?: string;
    }): {
        progress: ExplorationProgress;
        payoutAtomic: bigint;
    };
    upsertCollection(input: Omit<CollectionDefinition, "createdAt" | "updatedAt">, actor: string): CollectionDefinition;
    progressCollection(input: {
        userId: string;
        collectionId: string;
        placeId: string;
    }): {
        progress: CollectionProgress;
        payoutAtomic: bigint;
    };
    recordCreatorEngagement(input: {
        userId: string;
        contentId: string;
        contentType: CreatorRewardRecord["contentType"];
        qualitySignals: {
            saves: number;
            shares: number;
            completionRate: number;
            helpfulVotes: number;
            visitsDriven: number;
            redemptionsDriven: number;
        };
        trustTier: CreatorRewardRecord["trustTier"];
        moderationState: CreatorRewardRecord["moderationState"];
        selfDealDetected?: boolean;
    }): CreatorRewardRecord;
    claimCreatorReward(input: {
        rewardId: string;
        userId: string;
    }): CreatorRewardRecord;
    createGuide(input: Omit<CuratorGuide, "id" | "createdAt" | "updatedAt" | "status"> & {
        status?: CuratorGuide["status"];
    }): CuratorGuide;
    recordGuidePerformance(input: {
        guideId: string;
        saves: number;
        follows: number;
        drivenVisits: number;
        completedRoutes: number;
        downstreamReviews: number;
    }): CuratorGuideAnalytics;
    purchaseMembership(input: {
        userId: string;
        tier: "pro" | "elite";
        months: number;
        autoRenew: boolean;
        actor: string;
    }): PremiumMembership;
    createOffer(input: Omit<Offer, "id" | "redeemed" | "status" | "costAtomic" | "createdAt" | "updatedAt"> & {
        costPerbug: number;
    }): Offer;
    redeemOffer(input: {
        offerId: string;
        userId: string;
        deviceTrustScore: number;
    }): {
        id: string;
        offerId: string;
        userId: string;
        redeemedAt: string;
        costAtomic: bigint;
        status: "approved";
    };
    updateTokenSplitConfig(input: Omit<TokenSplitConfig, "updatedAt"> & {
        actor: string;
    }): TokenSplitConfig;
    adminDashboard(): {
        splits: TokenSplitConfig[];
        treasuryAtomic: bigint;
        burnedAtomic: bigint;
        activeQuests: number;
        activeOffers: number;
        trackedUserWallets: number;
        fraudFlags: EconomyFraudFlag[];
        recentLedger: import("./types.js").EconomyLedgerEntry[];
    };
    creatorDashboard(userId: string): {
        wallet: TokenAccount;
        pendingAtomic: bigint;
        claimableAtomic: bigint;
        paidAtomic: bigint;
        rewards: CreatorRewardRecord[];
        guideStats: {
            guide: CuratorGuide;
            analytics: CuratorGuideAnalytics | null;
        }[];
    };
    consumerDashboard(userId: string): {
        wallet: TokenAccount;
        exploration: ExplorationProgress | null;
        questCompletions: QuestCompletion[];
        memberships: PremiumMembership | null;
        redemptions: import("./types.js").Redemption[];
        activeQuests: BusinessQuest[];
        collections: CollectionDefinition[];
    };
    businessDashboard(businessId: string): {
        wallet: TokenAccount;
        quests: BusinessQuest[];
        offers: Offer[];
        questSpendAtomic: bigint;
        questPaidAtomic: bigint;
        offerRedemptions: number;
    };
    private allocateSplit;
    private adjustBalance;
    private addLedger;
    private requireSplit;
    private requireQuest;
    private requireCollection;
    private requireOffer;
    private getOrCreateAccount;
    private flagFraud;
}
