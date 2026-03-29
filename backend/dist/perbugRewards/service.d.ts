import type { ClaimResult, DryadRewardTier, DryadRewardsStore, PlaceRecord, RewardDashboard, RewardPreview, RewardQualityRating, RewardReviewRecord, SolanaClaimsAdapter, WalletRecord } from "./types.js";
export declare class DryadRewardsService {
    private readonly store;
    private readonly claimsAdapter;
    constructor(store: DryadRewardsStore, claimsAdapter?: SolanaClaimsAdapter);
    createPlace(input: {
        id: string;
        name: string;
        rewardEnabled?: boolean;
        slug?: string;
    }): PlaceRecord;
    submitReview(input: {
        userId: string;
        placeId: string;
        videoUrl: string;
        contentHash: string;
        qualityRating?: RewardQualityRating;
        distinctRewardSlot?: string;
        videoId?: string;
        creatorProfileId?: string;
        reviewId?: string;
    }): RewardReviewRecord;
    approveReview(input: {
        reviewId: string;
        actorUserId: string;
        qualityRating?: RewardQualityRating;
        adminDistinctRewardSlotEnabled?: boolean;
    }): RewardReviewRecord;
    rejectReview(input: {
        reviewId: string;
        actorUserId: string;
        reason: string;
    }): RewardReviewRecord;
    createWalletNonce(publicKey: string): {
        nonce: string;
        message: string;
        expiresAt: string;
    };
    verifyWalletLogin(input: {
        publicKey: string;
        signature: string;
        userId?: string;
    }): {
        userId: string;
        wallet: WalletRecord;
        sessionToken: string;
    };
    listWallets(userId: string): WalletRecord[];
    setPrimaryWallet(userId: string, publicKey: string): WalletRecord;
    getRewardPreview(placeId: string): RewardPreview;
    getDashboard(userId: string): RewardDashboard;
    claimReward(input: {
        userId: string;
        reviewId: string;
        walletPublicKey: string;
        idempotencyKey?: string;
    }): Promise<ClaimResult>;
    listAuditLogs(): import("./types.js").AdminAuditLogRecord[];
    listRewardTiers(): DryadRewardTier[];
    private selectTier;
    private buildOverview;
    private requirePlace;
    private requireReview;
    private requireEligibility;
    private audit;
}
export declare function atomicAmountFromDisplay(amount: number): bigint;
