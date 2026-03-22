import type { AdminAuditLogRecord, ModerationFlagRecord, PerbugRewardsStore, PlaceRecord, PlaceRewardState, RewardClaimRecord, RewardEligibilityRecord, RewardReviewRecord, RewardTier, WalletLoginNonceRecord, WalletRecord } from "./types.js";

export class MemoryPerbugRewardsStore implements PerbugRewardsStore {
  private readonly tiers = new Map<string, RewardTier>();
  private readonly places = new Map<string, PlaceRecord>();
  private readonly placeRewardStates = new Map<string, PlaceRewardState>();
  private readonly reviews = new Map<string, RewardReviewRecord>();
  private readonly eligibility = new Map<string, RewardEligibilityRecord>();
  private readonly claims = new Map<string, RewardClaimRecord>();
  private readonly claimsByIdempotency = new Map<string, string>();
  private readonly wallets = new Map<string, WalletRecord>();
  private readonly walletNonces = new Map<string, WalletLoginNonceRecord[]>();
  private readonly moderationFlags = new Map<string, ModerationFlagRecord[]>();
  private readonly auditLogs: AdminAuditLogRecord[] = [];

  listRewardTiers(): RewardTier[] { return [...this.tiers.values()].sort((a,b) => a.startPosition - b.startPosition); }
  saveRewardTier(tier: RewardTier): void { this.tiers.set(tier.id, tier); }
  listPlaces(): PlaceRecord[] { return [...this.places.values()]; }
  getPlace(placeId: string): PlaceRecord | null { return this.places.get(placeId) ?? null; }
  savePlace(place: PlaceRecord): void { this.places.set(place.id, place); }
  getPlaceRewardState(placeId: string): PlaceRewardState | null { return this.placeRewardStates.get(placeId) ?? null; }
  savePlaceRewardState(state: PlaceRewardState): void { this.placeRewardStates.set(state.placeId, state); }
  listReviewsForPlace(placeId: string): RewardReviewRecord[] { return [...this.reviews.values()].filter((review) => review.placeId === placeId).sort((a,b) => a.createdAt.localeCompare(b.createdAt)); }
  listReviewsForUser(userId: string): RewardReviewRecord[] { return [...this.reviews.values()].filter((review) => review.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  getReview(reviewId: string): RewardReviewRecord | null { return this.reviews.get(reviewId) ?? null; }
  saveReview(review: RewardReviewRecord): void { this.reviews.set(review.id, review); }
  getEligibility(reviewId: string): RewardEligibilityRecord | null { return this.eligibility.get(reviewId) ?? null; }
  saveEligibility(record: RewardEligibilityRecord): void { this.eligibility.set(record.reviewId, record); }
  listClaimsForUser(userId: string): RewardClaimRecord[] { return [...this.claims.values()].filter((claim) => claim.userId === userId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  getClaimByReview(reviewId: string): RewardClaimRecord | null { return [...this.claims.values()].find((claim) => claim.reviewId === reviewId) ?? null; }
  getClaimByIdempotencyKey(idempotencyKey: string): RewardClaimRecord | null { const claimId = this.claimsByIdempotency.get(idempotencyKey); return claimId ? this.claims.get(claimId) ?? null : null; }
  saveClaim(record: RewardClaimRecord): void { this.claims.set(record.id, record); this.claimsByIdempotency.set(record.idempotencyKey, record.id); }
  listWalletsForUser(userId: string): WalletRecord[] { return [...this.wallets.values()].filter((wallet) => wallet.userId === userId); }
  getWalletByPublicKey(publicKey: string): WalletRecord | null { return this.wallets.get(publicKey) ?? null; }
  saveWallet(wallet: WalletRecord): void { this.wallets.set(wallet.publicKey, wallet); }
  listWalletNonces(publicKey: string): WalletLoginNonceRecord[] { return [...(this.walletNonces.get(publicKey) ?? [])]; }
  saveWalletNonce(record: WalletLoginNonceRecord): void { const current = this.walletNonces.get(record.publicKey) ?? []; const next = [...current.filter((item) => item.id !== record.id), record].sort((a,b) => b.createdAt.localeCompare(a.createdAt)); this.walletNonces.set(record.publicKey, next); }
  listModerationFlags(reviewId: string): ModerationFlagRecord[] { return [...(this.moderationFlags.get(reviewId) ?? [])]; }
  addModerationFlag(flag: ModerationFlagRecord): void { this.moderationFlags.set(flag.reviewId, [...(this.moderationFlags.get(flag.reviewId) ?? []), flag]); }
  listAuditLogs(): AdminAuditLogRecord[] { return [...this.auditLogs]; }
  addAuditLog(log: AdminAuditLogRecord): void { this.auditLogs.push(log); }
}
