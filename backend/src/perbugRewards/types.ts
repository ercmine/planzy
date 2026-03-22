export type RewardQualityRating = "low" | "standard" | "high" | "featured";
export type ReviewRewardStatus = "ineligible" | "eligible" | "queued" | "claimable" | "claimed" | "blocked";
export type ReviewLifecycleStatus = "pending" | "approved" | "rejected" | "removed";
export type ClaimStatus = "pending" | "submitted" | "confirmed" | "failed" | "canceled";

export interface RewardTier {
  id: string;
  name: string;
  startPosition: number;
  endPosition: number | null;
  tokenAmount: number;
  active: boolean;
  createdAt: string;
}

export interface PlaceRewardState {
  placeId: string;
  approvedRewardedReviewCount: number;
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

export interface RewardEligibilityRecord {
  id: string;
  reviewId: string;
  userId: string;
  placeId: string;
  isDuplicate: boolean;
  isSpam: boolean;
  isGeoVerified: boolean;
  policyPassed: boolean;
  distinctRewardSlot: string;
  ruleVersion: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationFlagRecord {
  id: string;
  reviewId: string;
  flagType: string;
  severity: "low" | "medium" | "high";
  details: Record<string, unknown>;
  createdAt: string;
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

export interface WalletLoginNonceRecord {
  id: string;
  publicKey: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
}

export interface RewardReviewRecord {
  id: string;
  userId: string;
  placeId: string;
  videoUrl: string;
  contentHash: string;
  status: ReviewLifecycleStatus;
  moderationStatus: "pending" | "approved" | "rejected" | "blocked";
  qualityRating: RewardQualityRating;
  rewardStatus: ReviewRewardStatus;
  rewardPosition?: number;
  baseRewardAmount?: number;
  finalRewardAmount?: number;
  approvalTimestamp?: string;
  createdAt: string;
  updatedAt: string;
  distinctRewardSlot: string;
  adminDistinctRewardSlotEnabled: boolean;
  rewardBlockedReason?: string;
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
  ladder: RewardTier[];
}

export interface SolanaTransferResult {
  signature: string;
  associatedTokenAccount: string;
  explorerUrl: string;
}

export interface SolanaClaimsAdapter {
  transferClaim(input: {
    claimantPublicKey: string;
    amountAtomic: bigint;
    idempotencyKey: string;
    memo: string;
  }): Promise<SolanaTransferResult>;
}

export interface PerbugRewardsStore {
  listRewardTiers(): RewardTier[];
  saveRewardTier(tier: RewardTier): void;
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
  listWalletNonces(publicKey: string): WalletLoginNonceRecord[];
  saveWalletNonce(record: WalletLoginNonceRecord): void;
  listModerationFlags(reviewId: string): ModerationFlagRecord[];
  addModerationFlag(flag: ModerationFlagRecord): void;
  listAuditLogs(): AdminAuditLogRecord[];
  addAuditLog(log: AdminAuditLogRecord): void;
}
