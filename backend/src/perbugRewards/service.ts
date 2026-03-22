import { randomUUID } from "node:crypto";

import { ValidationError } from "../plans/errors.js";
import { defaultRewardTiers, DEFAULT_DISTINCT_SLOT, DEFAULT_RULE_VERSION, QUALITY_MULTIPLIERS } from "./defaults.js";
import { loadSolanaConfig } from "./solana/config.js";
import { MockSolanaClaimsAdapter } from "./solana/claims.js";
import { amountToAtomicUnits, amountToDisplay, isValidSolanaPublicKey } from "./solana/token.js";
import { createWalletLoginNonce, formatWalletSignInMessage, stableIdempotencyKey, verifyWalletSignature } from "./solana/walletAuth.js";
import type { ClaimResult, PerbugRewardsStore, PlaceRecord, RewardClaimRecord, RewardDashboard, RewardEligibilityRecord, RewardPreview, RewardQualityRating, RewardReviewRecord, RewardTier, SolanaClaimsAdapter, WalletRecord } from "./types.js";
import { PublicKey } from "@solana/web3.js";

function nowIso(now = new Date()): string { return now.toISOString(); }

function clone<T>(value: T): T { return structuredClone(value); }

export class PerbugRewardsService {
  constructor(
    private readonly store: PerbugRewardsStore,
    private readonly claimsAdapter: SolanaClaimsAdapter = new MockSolanaClaimsAdapter()
  ) {
    if (!this.store.listRewardTiers().length) {
      for (const tier of defaultRewardTiers()) this.store.saveRewardTier(tier);
    }
  }

  createPlace(input: { id: string; name: string; rewardEnabled?: boolean; slug?: string }): PlaceRecord {
    const existing = this.store.getPlace(input.id);
    const timestamp = nowIso();
    const place: PlaceRecord = existing ?? {
      id: input.id,
      name: input.name,
      slug: input.slug,
      rewardEnabled: input.rewardEnabled ?? true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    place.name = input.name;
    place.rewardEnabled = input.rewardEnabled ?? place.rewardEnabled;
    place.updatedAt = timestamp;
    this.store.savePlace(place);
    return clone(place);
  }

  submitReview(input: { userId: string; placeId: string; videoUrl: string; contentHash: string; qualityRating?: RewardQualityRating; distinctRewardSlot?: string }): RewardReviewRecord {
    const place = this.requirePlace(input.placeId);
    const timestamp = nowIso();
    const sameHash = [...this.store.listReviewsForPlace(input.placeId), ...this.store.listReviewsForUser(input.userId)]
      .some((review) => review.contentHash === input.contentHash);
    const distinctRewardSlot = input.distinctRewardSlot ?? DEFAULT_DISTINCT_SLOT;
    const creatorStandardWins = this.store.listReviewsForPlace(input.placeId).filter((review) => review.userId === input.userId && review.distinctRewardSlot === DEFAULT_DISTINCT_SLOT && review.rewardStatus !== "blocked");
    const review: RewardReviewRecord = {
      id: randomUUID(),
      userId: input.userId,
      placeId: place.id,
      videoUrl: input.videoUrl,
      contentHash: input.contentHash,
      status: "pending",
      moderationStatus: "pending",
      qualityRating: input.qualityRating ?? "standard",
      rewardStatus: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      distinctRewardSlot,
      adminDistinctRewardSlotEnabled: distinctRewardSlot !== DEFAULT_DISTINCT_SLOT,
      rewardBlockedReason: sameHash ? "duplicate_content_hash" : creatorStandardWins.length > 0 && distinctRewardSlot === DEFAULT_DISTINCT_SLOT ? "place_reward_slot_already_used" : undefined
    };
    this.store.saveReview(review);
    const eligibility: RewardEligibilityRecord = {
      id: randomUUID(),
      reviewId: review.id,
      userId: input.userId,
      placeId: place.id,
      isDuplicate: sameHash,
      isSpam: false,
      isGeoVerified: false,
      policyPassed: true,
      distinctRewardSlot,
      ruleVersion: DEFAULT_RULE_VERSION,
      notes: review.rewardBlockedReason,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.store.saveEligibility(eligibility);
    return clone(review);
  }

  approveReview(input: { reviewId: string; actorUserId: string; qualityRating?: RewardQualityRating; adminDistinctRewardSlotEnabled?: boolean }): RewardReviewRecord {
    const review = this.requireReview(input.reviewId);
    const place = this.requirePlace(review.placeId);
    const eligibility = this.requireEligibility(review.id);
    if (!place.rewardEnabled) throw new ValidationError(["place rewards disabled"]);
    review.status = "approved";
    review.moderationStatus = "approved";
    review.qualityRating = input.qualityRating ?? review.qualityRating;
    review.adminDistinctRewardSlotEnabled = input.adminDistinctRewardSlotEnabled ?? review.adminDistinctRewardSlotEnabled;
    review.approvalTimestamp = nowIso();

    const blocked = eligibility.isDuplicate || eligibility.isSpam || !eligibility.policyPassed || (review.rewardBlockedReason && !review.adminDistinctRewardSlotEnabled);
    if (blocked) {
      review.rewardStatus = "blocked";
      this.store.saveReview({ ...review, updatedAt: nowIso() });
      this.store.addAuditLog({ id: randomUUID(), actorUserId: input.actorUserId, action: "reward.blocked_on_approval", targetType: "review", targetId: review.id, payload: { reason: review.rewardBlockedReason ?? "eligibility_failed" }, createdAt: nowIso() });
      return clone(review);
    }

    const state = this.store.getPlaceRewardState(place.id) ?? { placeId: place.id, approvedRewardedReviewCount: 0, updatedAt: nowIso() };
    const nextPosition = state.approvedRewardedReviewCount + 1;
    const tier = this.selectTier(nextPosition);
    if (!tier) {
      review.rewardStatus = "ineligible";
      this.store.saveReview({ ...review, updatedAt: nowIso() });
      return clone(review);
    }
    const multiplier = QUALITY_MULTIPLIERS[review.qualityRating];
    const baseAmount = tier.tokenAmount;
    const finalAmount = Number((baseAmount * multiplier).toFixed(9));

    state.approvedRewardedReviewCount = nextPosition;
    state.updatedAt = nowIso();
    review.rewardPosition = nextPosition;
    review.baseRewardAmount = baseAmount;
    review.finalRewardAmount = finalAmount;
    review.rewardStatus = "claimable";
    review.updatedAt = nowIso();
    eligibility.updatedAt = review.updatedAt;
    this.store.savePlaceRewardState(state);
    this.store.saveEligibility(eligibility);
    this.store.saveReview(review);
    this.store.addAuditLog({ id: randomUUID(), actorUserId: input.actorUserId, action: "reward.assigned", targetType: "review", targetId: review.id, payload: { placeId: place.id, rewardPosition: nextPosition, baseAmount, finalAmount }, createdAt: nowIso() });
    return clone(review);
  }

  rejectReview(input: { reviewId: string; actorUserId: string; reason: string }): RewardReviewRecord {
    const review = this.requireReview(input.reviewId);
    review.status = "rejected";
    review.moderationStatus = "rejected";
    review.rewardStatus = review.rewardStatus === "claimed" ? "claimed" : "blocked";
    review.rewardBlockedReason = input.reason;
    review.updatedAt = nowIso();
    this.store.saveReview(review);
    this.store.addAuditLog({ id: randomUUID(), actorUserId: input.actorUserId, action: "review.rejected", targetType: "review", targetId: review.id, payload: { reason: input.reason }, createdAt: nowIso() });
    return clone(review);
  }

  createWalletNonce(publicKey: string): { nonce: string; message: string; expiresAt: string } {
    if (!isValidSolanaPublicKey(publicKey)) throw new ValidationError(["invalid Solana public key"]);
    const nonce = createWalletLoginNonce();
    const issuedAt = nowIso();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const record = { id: randomUUID(), publicKey, nonce, issuedAt, expiresAt, createdAt: issuedAt };
    this.store.saveWalletNonce(record);
    return { nonce, message: formatWalletSignInMessage({ publicKey, nonce, timestamp: issuedAt }), expiresAt };
  }

  verifyWalletLogin(input: { publicKey: string; signature: string; userId?: string }): { userId: string; wallet: WalletRecord; sessionToken: string } {
    if (!isValidSolanaPublicKey(input.publicKey)) throw new ValidationError(["invalid Solana public key"]);
    const nonce = this.store.listWalletNonces(input.publicKey).find((item) => !item.consumedAt && Date.parse(item.expiresAt) > Date.now());
    if (!nonce) throw new ValidationError(["wallet nonce not found or expired"]);
    const message = formatWalletSignInMessage({ publicKey: input.publicKey, nonce: nonce.nonce, timestamp: nonce.issuedAt });
    const verified = verifyWalletSignature({ publicKey: new PublicKey(input.publicKey).toBytes(), message, signatureBase58: input.signature });
    if (!verified) throw new ValidationError(["wallet signature invalid"]);
    nonce.consumedAt = nowIso();
    this.store.saveWalletNonce(nonce);
    const existingWallet = this.store.getWalletByPublicKey(input.publicKey);
    const userId = input.userId ?? existingWallet?.userId ?? `wallet-user-${input.publicKey.slice(0, 8)}`;
    const wallet: WalletRecord = existingWallet ?? { id: randomUUID(), userId, chain: "solana", publicKey: input.publicKey, isPrimary: true, createdAt: nowIso() };
    wallet.userId = userId;
    wallet.isPrimary = true;
    wallet.verifiedAt = nowIso();
    this.store.saveWallet(wallet);
    return { userId, wallet: clone(wallet), sessionToken: stableIdempotencyKey(["session", userId, input.publicKey, nonce.nonce]).slice(0, 32) };
  }

  getRewardPreview(placeId: string): RewardPreview {
    const place = this.requirePlace(placeId);
    const nextRewardPosition = (this.store.getPlaceRewardState(placeId)?.approvedRewardedReviewCount ?? 0) + 1;
    const tier = this.selectTier(nextRewardPosition);
    return {
      placeId,
      placeName: place.name,
      nextRewardPosition,
      nextBaseRewardAmount: tier?.tokenAmount ?? 0,
      rewardText: `This place’s next approved review earns ${tier?.tokenAmount ?? 0} PERBUG`,
      ladder: this.store.listRewardTiers().filter((tierItem) => tierItem.active)
    };
  }

  getDashboard(userId: string): RewardDashboard {
    const reviews = this.store.listReviewsForUser(userId);
    const claimable = reviews.filter((review) => review.rewardStatus === "claimable").map((review) => this.buildOverview(review));
    const history = reviews.filter((review) => ["claimed", "blocked", "ineligible"].includes(review.rewardStatus)).map((review) => this.buildOverview(review));
    const wallet = this.store.listWalletsForUser(userId).find((item) => item.isPrimary);
    const claimableTotal = claimable.reduce((sum, item) => sum + (item.review.finalRewardAmount ?? 0), 0);
    const claimedTotalAtomic = this.store.listClaimsForUser(userId).filter((claim) => claim.status === "confirmed").reduce((sum, item) => sum + Number(item.amountDisplay), 0);
    return {
      wallet,
      claimable,
      history,
      totals: {
        claimableDisplay: claimableTotal.toFixed(2).replace(/\.00$/, ""),
        claimedDisplay: claimedTotalAtomic.toFixed(2).replace(/\.00$/, ""),
        pendingCount: reviews.filter((review) => review.rewardStatus === "queued" || review.rewardStatus === "eligible").length
      }
    };
  }

  async claimReward(input: { userId: string; reviewId: string; walletPublicKey: string; idempotencyKey?: string }): Promise<ClaimResult> {
    const config = loadSolanaConfig();
    if (!config.claimsEnabled) throw new ValidationError(["claims disabled"]);
    const review = this.requireReview(input.reviewId);
    if (review.userId !== input.userId) throw new ValidationError(["review does not belong to user"]);
    const wallet = this.store.getWalletByPublicKey(input.walletPublicKey);
    if (!wallet || wallet.userId !== input.userId) throw new ValidationError(["wallet mismatch blocks claim"]);
    if (review.rewardStatus === "claimed") {
      const existingClaim = this.store.getClaimByReview(review.id);
      if (!existingClaim) throw new ValidationError(["claim already processed"]);
      return { claim: clone(existingClaim), review: clone(review) };
    }
    if (review.rewardStatus !== "claimable") throw new ValidationError(["review is not claimable"]);
    const idempotencyKey = input.idempotencyKey ?? stableIdempotencyKey(["claim", input.userId, review.id, input.walletPublicKey]);
    const existing = this.store.getClaimByIdempotencyKey(idempotencyKey) ?? this.store.getClaimByReview(review.id);
    if (existing) return { claim: clone(existing), review: clone(review) };
    const amountAtomic = amountToAtomicUnits(review.finalRewardAmount ?? 0, config.decimals);
    const claim: RewardClaimRecord = {
      id: randomUUID(),
      userId: input.userId,
      walletPublicKey: input.walletPublicKey,
      reviewId: review.id,
      placeId: review.placeId,
      tokenMint: config.mintAddress,
      amountAtomic,
      amountDisplay: amountToDisplay(amountAtomic, config.decimals),
      status: "pending",
      cluster: config.cluster,
      idempotencyKey,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.store.saveClaim(claim);
    try {
      const transfer = await this.claimsAdapter.transferClaim({ claimantPublicKey: input.walletPublicKey, amountAtomic, idempotencyKey, memo: `PERBUG review ${review.id}` });
      claim.status = "confirmed";
      claim.transactionSignature = transfer.signature;
      claim.associatedTokenAccount = transfer.associatedTokenAccount;
      claim.explorerUrl = transfer.explorerUrl;
      claim.claimedAt = nowIso();
      claim.updatedAt = nowIso();
      review.rewardStatus = "claimed";
      review.updatedAt = claim.updatedAt;
      this.store.saveClaim(claim);
      this.store.saveReview(review);
      return { claim: clone(claim), review: clone(review) };
    } catch (error) {
      claim.status = "failed";
      claim.failureReason = error instanceof Error ? error.message : "claim_transfer_failed";
      claim.updatedAt = nowIso();
      this.store.saveClaim(claim);
      throw error;
    }
  }

  listAuditLogs() { return this.store.listAuditLogs(); }
  listRewardTiers(): RewardTier[] { return this.store.listRewardTiers(); }
  updateRewardTiers(tiers: RewardTier[], actorUserId: string): RewardTier[] { for (const tier of tiers) this.store.saveRewardTier(tier); this.store.addAuditLog({ id: randomUUID(), actorUserId, action: "reward_tiers.updated", targetType: "reward_tiers", targetId: "global", payload: { count: tiers.length }, createdAt: nowIso() }); return this.listRewardTiers(); }

  private selectTier(position: number): RewardTier | null {
    return this.store.listRewardTiers().find((tier) => tier.active && position >= tier.startPosition && (tier.endPosition == null || position <= tier.endPosition)) ?? null;
  }

  private buildOverview(review: RewardReviewRecord) {
    return {
      review: clone(review),
      eligibility: clone(this.requireEligibility(review.id)),
      claim: this.store.getClaimByReview(review.id) ? clone(this.store.getClaimByReview(review.id)!) : undefined,
      place: clone(this.requirePlace(review.placeId))
    };
  }

  private requirePlace(placeId: string): PlaceRecord {
    const place = this.store.getPlace(placeId);
    if (!place) throw new ValidationError([`place ${placeId} not found`]);
    return place;
  }
  private requireReview(reviewId: string): RewardReviewRecord { const review = this.store.getReview(reviewId); if (!review) throw new ValidationError(["review not found"]); return review; }
  private requireEligibility(reviewId: string): RewardEligibilityRecord { const eligibility = this.store.getEligibility(reviewId); if (!eligibility) throw new ValidationError(["reward eligibility not found"]); return eligibility; }
}
