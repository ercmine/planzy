import { randomUUID } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { ValidationError } from "../plans/errors.js";
import { DEFAULT_DISTINCT_SLOT, PERBUG_DECIMALS, QUALITY_MULTIPLIERS, defaultRewardTiers } from "./defaults.js";
import { loadPerbugRpcConfig } from "./perbugRpc/config.js";
import { PerbugRpcClaimsAdapter } from "./perbugRpc/claims.js";
import { amountToAtomicUnits, amountToDisplay, isValidSolanaPublicKey } from "./solana/token.js";
import { createWalletLoginNonce, formatWalletSignInMessage, stableIdempotencyKey, verifyWalletSignature } from "./solana/walletAuth.js";
function nowIso(now = new Date()) { return now.toISOString(); }
function clone(value) { return structuredClone(value); }
export class PerbugRewardsService {
    store;
    claimsAdapter;
    constructor(store, claimsAdapter = new PerbugRpcClaimsAdapter()) {
        this.store = store;
        this.claimsAdapter = claimsAdapter;
        if (!this.store.listRewardTiers().length) {
            for (const tier of defaultRewardTiers())
                this.store.saveRewardTier(tier);
        }
    }
    createPlace(input) {
        const existing = this.store.getPlace(input.id);
        const timestamp = nowIso();
        const place = existing ?? { id: input.id, name: input.name, slug: input.slug, rewardEnabled: input.rewardEnabled ?? true, createdAt: timestamp, updatedAt: timestamp };
        place.name = input.name;
        place.slug = input.slug ?? place.slug;
        place.rewardEnabled = input.rewardEnabled ?? place.rewardEnabled;
        place.updatedAt = timestamp;
        this.store.savePlace(place);
        if (!this.store.getPlaceRewardState(place.id)) {
            this.store.savePlaceRewardState({ placeId: place.id, approvedRewardedReviewCount: 0, rewardsEnabled: place.rewardEnabled, updatedAt: timestamp });
        }
        return clone(place);
    }
    submitReview(input) {
        const place = this.requirePlace(input.placeId);
        const timestamp = nowIso();
        const sameHash = [...this.store.listReviewsForPlace(input.placeId), ...this.store.listReviewsForUser(input.userId)].some((review) => review.contentHash === input.contentHash);
        const distinctRewardSlot = input.distinctRewardSlot ?? DEFAULT_DISTINCT_SLOT;
        const creatorStandardWins = this.store.listReviewsForPlace(input.placeId).filter((review) => review.userId === input.userId && review.distinctRewardSlot === DEFAULT_DISTINCT_SLOT && review.reward.status !== "blocked");
        const rewardId = `reward_${randomUUID()}`;
        const reviewId = input.reviewId ?? `review_${randomUUID()}`;
        const blockedReason = sameHash ? "duplicate_content_hash" : creatorStandardWins.length > 0 && distinctRewardSlot === DEFAULT_DISTINCT_SLOT ? "one_reward_per_creator_per_place" : undefined;
        const review = {
            id: reviewId,
            reviewId,
            userId: input.userId,
            placeId: place.id,
            videoId: input.videoId,
            videoUrl: input.videoUrl,
            contentHash: input.contentHash,
            status: "pending",
            moderationStatus: "pending",
            qualityRating: input.qualityRating ?? "standard",
            reward: {
                id: rewardId,
                reviewId,
                videoId: input.videoId,
                userId: input.userId,
                creatorProfileId: input.creatorProfileId,
                placeId: place.id,
                qualityRating: input.qualityRating ?? "standard",
                status: "eligible",
                createdAt: timestamp,
                updatedAt: timestamp,
                reasonCode: blockedReason
            },
            distinctRewardSlot,
            adminDistinctRewardSlotEnabled: distinctRewardSlot !== DEFAULT_DISTINCT_SLOT,
            rewardBlockedReason: blockedReason,
            rewardStatus: blockedReason ? "blocked" : "eligible",
            createdAt: timestamp,
            updatedAt: timestamp
        };
        const eligibility = {
            reviewId,
            duplicateBlocked: sameHash,
            spamBlocked: false,
            policyBlocked: false,
            geoVerified: false,
            oneRewardPerCreatorPerPlaceBlocked: Boolean(blockedReason === "one_reward_per_creator_per_place"),
            moderationApproved: false,
            contentHash: input.contentHash,
            notes: blockedReason,
            updatedAt: timestamp
        };
        this.store.saveReview(review);
        this.store.saveEligibility(eligibility);
        return clone(review);
    }
    approveReview(input) {
        const review = this.requireReview(input.reviewId);
        const place = this.requirePlace(review.placeId);
        const eligibility = this.requireEligibility(review.id);
        const state = this.store.getPlaceRewardState(place.id) ?? { placeId: place.id, approvedRewardedReviewCount: 0, rewardsEnabled: place.rewardEnabled, updatedAt: nowIso() };
        if (!place.rewardEnabled || !state.rewardsEnabled)
            throw new ValidationError(["place rewards disabled"]);
        review.status = "approved";
        review.moderationStatus = "approved";
        review.qualityRating = input.qualityRating ?? review.qualityRating;
        review.reward.qualityRating = review.qualityRating;
        review.adminDistinctRewardSlotEnabled = input.adminDistinctRewardSlotEnabled ?? review.adminDistinctRewardSlotEnabled;
        review.approvalTimestamp = nowIso();
        eligibility.moderationApproved = true;
        eligibility.updatedAt = review.approvalTimestamp;
        const blocked = eligibility.duplicateBlocked || eligibility.spamBlocked || eligibility.policyBlocked || (eligibility.oneRewardPerCreatorPerPlaceBlocked && !review.adminDistinctRewardSlotEnabled);
        if (blocked) {
            review.reward.status = "blocked";
            review.reward.reasonCode = review.rewardBlockedReason ?? "eligibility_failed";
            review.reward.updatedAt = nowIso();
            review.rewardStatus = review.reward.status;
            review.rewardPosition = review.reward.rewardPosition;
            review.finalRewardAmount = review.reward.finalAmountAtomic ? review.reward.finalAmountAtomic.toString() : undefined;
            this.store.saveEligibility(eligibility);
            this.store.saveReview(review);
            this.audit(input.actorUserId, "reward.blocked_on_approval", "review", review.id, { reason: review.reward.reasonCode });
            return clone(review);
        }
        const nextPosition = state.approvedRewardedReviewCount + 1;
        const tier = this.selectTier(nextPosition);
        if (!tier) {
            review.reward.status = "ineligible";
            review.reward.reasonCode = "no_reward_tier";
            review.reward.updatedAt = nowIso();
            this.store.saveEligibility(eligibility);
            this.store.saveReview(review);
            return clone(review);
        }
        const multiplier = QUALITY_MULTIPLIERS[review.qualityRating];
        const baseAmountAtomic = tier.baseAmountAtomic;
        const finalAmountAtomic = BigInt(Math.round(Number(baseAmountAtomic) * multiplier));
        state.approvedRewardedReviewCount = nextPosition;
        state.updatedAt = nowIso();
        review.reward.rewardPosition = nextPosition;
        review.reward.baseAmountAtomic = baseAmountAtomic;
        review.reward.finalAmountAtomic = finalAmountAtomic;
        review.reward.status = "claimable";
        review.reward.updatedAt = nowIso();
        review.rewardStatus = review.reward.status;
        review.rewardPosition = review.reward.rewardPosition;
        review.finalRewardAmount = review.reward.finalAmountAtomic.toString();
        this.store.savePlaceRewardState(state);
        this.store.saveEligibility(eligibility);
        this.store.saveReview(review);
        this.audit(input.actorUserId, "reward.assigned", "review", review.id, { placeId: place.id, rewardPosition: nextPosition, baseAmountAtomic: baseAmountAtomic.toString(), finalAmountAtomic: finalAmountAtomic.toString() });
        return clone(review);
    }
    rejectReview(input) {
        const review = this.requireReview(input.reviewId);
        review.status = "rejected";
        review.moderationStatus = "rejected";
        if (review.reward.status !== "claimed")
            review.reward.status = "blocked";
        review.reward.reasonCode = input.reason;
        review.reward.updatedAt = nowIso();
        review.rewardStatus = review.reward.status;
        this.store.saveReview(review);
        this.audit(input.actorUserId, "review.rejected", "review", review.id, { reason: input.reason });
        return clone(review);
    }
    createWalletNonce(publicKey) {
        const config = loadPerbugRpcConfig();
        const ttlSeconds = Number.parseInt(process.env.PERBUG_WALLET_NONCE_TTL_SECONDS ?? "600", 10);
        if (!isValidSolanaPublicKey(publicKey))
            throw new ValidationError(["invalid Solana public key"]);
        const nonce = createWalletLoginNonce();
        const issuedAt = nowIso();
        const message = formatWalletSignInMessage({ publicKey, nonce, timestamp: issuedAt });
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        const record = { id: randomUUID(), publicKey, nonce, message, issuedAt, expiresAt, cluster: `perbug-${config.rpcPort}` };
        this.store.saveWalletNonce(record);
        return { nonce, message, expiresAt };
    }
    verifyWalletLogin(input) {
        if (!isValidSolanaPublicKey(input.publicKey))
            throw new ValidationError(["invalid Solana public key"]);
        const nonce = this.store.listWalletNonces(input.publicKey).find((item) => !item.consumedAt && Date.parse(item.expiresAt) > Date.now());
        if (!nonce)
            throw new ValidationError(["wallet nonce not found or expired"]);
        const verified = verifyWalletSignature({ publicKey: new PublicKey(input.publicKey).toBytes(), message: nonce.message, signatureBase58: input.signature });
        if (!verified)
            throw new ValidationError(["wallet signature invalid"]);
        nonce.consumedAt = nowIso();
        this.store.saveWalletNonce(nonce);
        const existingWallet = this.store.getWalletByPublicKey(input.publicKey);
        const userId = input.userId ?? existingWallet?.userId ?? `wallet-user-${input.publicKey.slice(0, 8)}`;
        const wallet = existingWallet ?? { id: randomUUID(), userId, chain: "solana", publicKey: input.publicKey, isPrimary: true, createdAt: nowIso() };
        wallet.userId = userId;
        wallet.isPrimary = true;
        wallet.verifiedAt = nowIso();
        this.store.saveWallet(wallet);
        return { userId, wallet: clone(wallet), sessionToken: stableIdempotencyKey(["session", userId, input.publicKey, nonce.nonce]).slice(0, 32) };
    }
    listWallets(userId) { return this.store.listWalletsForUser(userId).map(clone); }
    setPrimaryWallet(userId, publicKey) {
        const wallet = this.store.getWalletByPublicKey(publicKey);
        if (!wallet || wallet.userId !== userId)
            throw new ValidationError(["wallet not linked to user"]);
        wallet.isPrimary = true;
        wallet.verifiedAt = nowIso();
        this.store.saveWallet(wallet);
        return clone(wallet);
    }
    getRewardPreview(placeId) {
        const place = this.requirePlace(placeId);
        const state = this.store.getPlaceRewardState(placeId);
        const nextRewardPosition = (state?.approvedRewardedReviewCount ?? 0) + 1;
        const tier = this.selectTier(nextRewardPosition);
        return {
            placeId,
            placeName: place.name,
            nextRewardPosition,
            nextBaseRewardAmount: tier ? Number(amountToDisplay(tier.baseAmountAtomic, PERBUG_DECIMALS)) : 0,
            rewardText: `This place’s next approved review earns ${tier ? amountToDisplay(tier.baseAmountAtomic, PERBUG_DECIMALS) : "0"} PERBUG`,
            ladder: this.store.listRewardTiers().filter((tierItem) => tierItem.active),
            approvedRewardedReviewCount: state?.approvedRewardedReviewCount ?? 0
        };
    }
    getDashboard(userId) {
        const reviews = this.store.listReviewsForUser(userId);
        const claimable = reviews.filter((review) => review.reward.status === "claimable").map((review) => this.buildOverview(review));
        const history = reviews.filter((review) => ["claimed", "blocked", "ineligible", "failed"].includes(review.reward.status)).map((review) => this.buildOverview(review));
        const wallet = this.store.listWalletsForUser(userId).find((item) => item.isPrimary);
        const claimableTotalAtomic = claimable.reduce((sum, item) => sum + (item.review.reward.finalAmountAtomic ?? 0n), 0n);
        const claimedTotalAtomic = this.store.listClaimsForUser(userId).filter((claim) => claim.status === "confirmed").reduce((sum, item) => sum + item.amountAtomic, 0n);
        return {
            wallet,
            claimable,
            history,
            totals: {
                claimableDisplay: amountToDisplay(claimableTotalAtomic, PERBUG_DECIMALS),
                claimedDisplay: amountToDisplay(claimedTotalAtomic, PERBUG_DECIMALS),
                pendingCount: reviews.filter((review) => ["eligible", "claiming"].includes(review.reward.status)).length
            }
        };
    }
    async claimReward(input) {
        const config = loadPerbugRpcConfig();
        if (String(process.env.PERBUG_REWARDS_ENABLED ?? "true") === "false")
            throw new ValidationError(["claims disabled"]);
        const review = this.requireReview(input.reviewId);
        if (review.userId !== input.userId)
            throw new ValidationError(["review does not belong to user"]);
        const wallet = this.store.getWalletByPublicKey(input.walletPublicKey);
        if (!wallet || wallet.userId !== input.userId)
            throw new ValidationError(["wallet mismatch blocks claim"]);
        if (review.reward.status === "claimed") {
            const existingClaim = this.store.getClaimByReview(review.id);
            if (!existingClaim)
                throw new ValidationError(["claim already processed"]);
            return { claim: clone(existingClaim), review: clone(review) };
        }
        if (review.reward.status !== "claimable")
            throw new ValidationError(["review is not claimable"]);
        const idempotencyKey = input.idempotencyKey ?? stableIdempotencyKey(["claim", input.userId, review.id, input.walletPublicKey]);
        const existing = this.store.getClaimByIdempotencyKey(idempotencyKey) ?? this.store.getClaimByReview(review.id);
        if (existing)
            return { claim: clone(existing), review: clone(review) };
        const amountAtomic = review.reward.finalAmountAtomic ?? 0n;
        const claim = {
            id: `claim_${randomUUID()}`,
            userId: input.userId,
            walletPublicKey: input.walletPublicKey,
            reviewId: review.id,
            placeId: review.placeId,
            tokenMint: "PERBUG",
            amountAtomic,
            amountDisplay: amountToDisplay(amountAtomic, PERBUG_DECIMALS),
            status: "pending",
            cluster: `perbug-rpc-${config.host}:${config.rpcPort}`,
            idempotencyKey,
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        review.reward.status = "claiming";
        review.reward.updatedAt = nowIso();
        this.store.saveClaim(claim);
        this.store.saveReview(review);
        try {
            const transfer = await this.claimsAdapter.transferClaim({ claimantAddress: input.walletPublicKey, amountDisplay: claim.amountDisplay, idempotencyKey, memo: `PERBUG review ${review.id}` });
            claim.status = "confirmed";
            claim.transactionSignature = transfer.txid;
            claim.associatedTokenAccount = input.walletPublicKey;
            claim.explorerUrl = transfer.explorerUrl;
            claim.claimedAt = nowIso();
            claim.updatedAt = nowIso();
            review.reward.status = "claimed";
            review.reward.claimWalletPublicKey = input.walletPublicKey;
            review.rewardStatus = review.reward.status;
            review.rewardPosition = review.reward.rewardPosition;
            review.finalRewardAmount = review.reward.finalAmountAtomic?.toString();
            review.reward.claimTransactionSignature = transfer.txid;
            review.reward.claimedAt = claim.claimedAt;
            review.reward.updatedAt = claim.updatedAt;
            this.store.saveClaim(claim);
            this.store.saveReview(review);
            return { claim: clone(claim), review: clone(review) };
        }
        catch (error) {
            claim.status = "failed";
            claim.failureReason = error instanceof Error ? error.message : "claim_transfer_failed";
            claim.updatedAt = nowIso();
            review.reward.status = "failed";
            review.reward.reasonCode = claim.failureReason;
            review.rewardStatus = review.reward.status;
            review.reward.updatedAt = claim.updatedAt;
            this.store.saveClaim(claim);
            this.store.saveReview(review);
            throw error;
        }
    }
    listAuditLogs() { return this.store.listAuditLogs(); }
    listRewardTiers() { return this.store.listRewardTiers(); }
    selectTier(position) {
        return this.store.listRewardTiers().find((tier) => tier.active && position >= tier.startPosition && (tier.endPosition == null || position <= tier.endPosition)) ?? null;
    }
    buildOverview(review) {
        return { review: clone(review), eligibility: clone(this.requireEligibility(review.id)), claim: this.store.getClaimByReview(review.id) ? clone(this.store.getClaimByReview(review.id)) : undefined, place: clone(this.requirePlace(review.placeId)) };
    }
    requirePlace(placeId) { const place = this.store.getPlace(placeId); if (!place)
        throw new ValidationError([`place ${placeId} not found`]); return place; }
    requireReview(reviewId) { const review = this.store.getReview(reviewId); if (!review)
        throw new ValidationError(["review not found"]); return review; }
    requireEligibility(reviewId) { const eligibility = this.store.getEligibility(reviewId); if (!eligibility)
        throw new ValidationError(["reward eligibility not found"]); return eligibility; }
    audit(actorUserId, action, targetType, targetId, payload) { this.store.addAuditLog({ id: `audit_${randomUUID()}`, actorUserId, action, targetType, targetId, payload, createdAt: nowIso() }); }
}
export function atomicAmountFromDisplay(amount) { return amountToAtomicUnits(amount, PERBUG_DECIMALS); }
