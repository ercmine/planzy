export type RewardQualityRating = "low" | "standard" | "high" | "featured";
export type ReviewRewardStatus = "ineligible" | "eligible" | "claimable" | "claiming" | "claimed" | "blocked" | "failed";
export type ReviewLifecycleStatus = "pending" | "approved" | "rejected" | "removed";
export type ClaimStatus = "pending" | "submitted" | "confirmed" | "failed" | "canceled";
export interface PerbugRewardTier {
    id: string;
    startPosition: number;
    endPosition: number | null;
    baseAmountAtomic: bigint;
    baseAmountDisplay: string;
    active: boolean;
}
export interface PlaceRewardState {
    placeId: string;
    approvedRewardedReviewCount: number;
    rewardsEnabled: boolean;
    updatedAt: string;
}
export interface WalletRecord {
    id: string;
    userId: string;
    chain: "solana";
    publicKey: string;
    isPrimary: boolean;
    verifiedAt?: string;
    createdAt: string;
}
export interface WalletNonce {
    id: string;
    publicKey: string;
    nonce: string;
    message: string;
    issuedAt: string;
    expiresAt: string;
    consumedAt?: string;
    cluster: string;
}
export interface WalletSessionBinding {
    userId: string;
    publicKey: string;
    chain: "solana";
    verifiedAt: string;
    isPrimary: boolean;
}
export interface RewardEligibilityRecord {
    reviewId: string;
    duplicateBlocked: boolean;
    spamBlocked: boolean;
    policyBlocked: boolean;
    geoVerified?: boolean;
    oneRewardPerCreatorPerPlaceBlocked: boolean;
    moderationApproved: boolean;
    contentHash?: string;
    notes?: string;
    updatedAt: string;
}
export interface AdminAuditLogRecord {
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    payload: Record<string, unknown>;
    createdAt: string;
}
export interface RewardClaimRecord {
    id: string;
    userId: string;
    walletPublicKey: string;
    reviewId: string;
    placeId: string;
    tokenMint: string;
    amountAtomic: bigint;
    amountDisplay: string;
    status: ClaimStatus;
    cluster: string;
    transactionSignature?: string;
    associatedTokenAccount?: string;
    idempotencyKey: string;
    claimedAt?: string;
    failureReason?: string;
    explorerUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PerbugReviewReward {
    id: string;
    reviewId: string;
    videoId?: string;
    userId: string;
    creatorProfileId?: string;
    placeId: string;
    rewardPosition?: number;
    qualityRating: RewardQualityRating;
    baseAmountAtomic?: bigint;
    finalAmountAtomic?: bigint;
    status: ReviewRewardStatus;
    claimWalletPublicKey?: string;
    claimTransactionSignature?: string;
    reasonCode?: string;
    createdAt: string;
    updatedAt: string;
    claimedAt?: string;
}
export interface RewardReviewRecord {
    id: string;
    reviewId: string;
    userId: string;
    placeId: string;
    videoId?: string;
    videoUrl: string;
    contentHash: string;
    status: ReviewLifecycleStatus;
    moderationStatus: "pending" | "approved" | "rejected" | "blocked";
    qualityRating: RewardQualityRating;
    reward: PerbugReviewReward;
    approvalTimestamp?: string;
    distinctRewardSlot: string;
    adminDistinctRewardSlotEnabled: boolean;
    rewardBlockedReason?: string;
    rewardStatus?: ReviewRewardStatus;
    rewardPosition?: number;
    finalRewardAmount?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PlaceRecord {
    id: string;
    externalPlaceId?: string;
    slug?: string;
    name: string;
    lat?: number;
    lng?: number;
    address?: string;
    rewardEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface RewardOverview {
    review: RewardReviewRecord;
    eligibility: RewardEligibilityRecord;
    claim?: RewardClaimRecord;
    place: PlaceRecord;
}
export interface RewardDashboard {
    wallet?: WalletRecord;
    claimable: RewardOverview[];
    history: RewardOverview[];
    totals: {
        claimableDisplay: string;
        claimedDisplay: string;
        pendingCount: number;
    };
}
export interface ClaimResult {
    claim: RewardClaimRecord;
    review: RewardReviewRecord;
}
export interface RewardPreview {
    placeId: string;
    placeName: string;
    nextRewardPosition: number;
    nextBaseRewardAmount: number;
    rewardText: string;
    ladder: PerbugRewardTier[];
    approvedRewardedReviewCount: number;
}
export interface PerbugTransferResult {
    txid: string;
    explorerUrl?: string;
}
export interface PerbugClaimsAdapter {
    transferClaim(input: {
        claimantAddress: string;
        amountDisplay: string;
        idempotencyKey: string;
        memo: string;
    }): Promise<PerbugTransferResult>;
}
export interface PerbugRewardsStore {
    listRewardTiers(): PerbugRewardTier[];
    saveRewardTier(tier: PerbugRewardTier): void;
    listPlaces(): PlaceRecord[];
    getPlace(placeId: string): PlaceRecord | null;
    savePlace(place: PlaceRecord): void;
    getPlaceRewardState(placeId: string): PlaceRewardState | null;
    savePlaceRewardState(state: PlaceRewardState): void;
    listReviewsForPlace(placeId: string): RewardReviewRecord[];
    listReviewsForUser(userId: string): RewardReviewRecord[];
    getReview(reviewId: string): RewardReviewRecord | null;
    saveReview(review: RewardReviewRecord): void;
    getEligibility(reviewId: string): RewardEligibilityRecord | null;
    saveEligibility(record: RewardEligibilityRecord): void;
    listClaimsForUser(userId: string): RewardClaimRecord[];
    getClaimByReview(reviewId: string): RewardClaimRecord | null;
    getClaimByIdempotencyKey(idempotencyKey: string): RewardClaimRecord | null;
    saveClaim(record: RewardClaimRecord): void;
    listWalletsForUser(userId: string): WalletRecord[];
    getWalletByPublicKey(publicKey: string): WalletRecord | null;
    saveWallet(wallet: WalletRecord): void;
    listWalletNonces(publicKey: string): WalletNonce[];
    saveWalletNonce(record: WalletNonce): void;
    listAuditLogs(): AdminAuditLogRecord[];
    addAuditLog(log: AdminAuditLogRecord): void;
}
