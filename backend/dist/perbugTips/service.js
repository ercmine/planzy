import { randomUUID } from "node:crypto";
import { ValidationError } from "../plans/errors.js";
import { amountToDisplay } from "../perbugRewards/solana/token.js";
import { stableIdempotencyKey } from "../perbugRewards/solana/walletAuth.js";
function nowIso() { return new Date().toISOString(); }
function clone(value) { return structuredClone(value); }
class MockDryadTipsAdapter {
    async submitTransfer(input) {
        return { signature: `0x${stableIdempotencyKey([input.fromWallet, input.toWallet, input.idempotencyKey, input.amountWei.toString()]).slice(0, 64)}`, explorerUrl: `https://sepolia.etherscan.io/tx/0x${stableIdempotencyKey([input.memo, input.idempotencyKey]).slice(0, 64)}` };
    }
}
export class DryadTipsService {
    store;
    deps;
    adapter;
    constructor(store, deps, adapter = new MockDryadTipsAdapter()) {
        this.store = store;
        this.deps = deps;
        this.adapter = adapter;
    }
    createVideoTipIntent(input) {
        return this.create(input);
    }
    async create(input) {
        const video = await this.deps.getVideo(input.videoId);
        if (!video)
            throw new ValidationError(["video not found"]);
        if (!["published", "processed", "publish_pending"].includes(video.status) || ["rejected", "flagged"].includes(video.moderationStatus))
            throw new ValidationError(["video cannot receive tips"]);
        if (!/^0x[a-fA-F0-9]{40}$/.test(input.senderWalletAddress))
            throw new ValidationError(["invalid sender wallet"]);
        const recipientWallet = this.deps.getPrimaryWallet(video.authorUserId);
        if (!recipientWallet)
            throw new ValidationError(["creator wallet not linked"]);
        if (!input.allowSelfTip && video.authorUserId === input.senderUserId)
            throw new ValidationError(["self tipping disabled"]);
        if (input.note && input.note.length > 280)
            throw new ValidationError(["tip note too long"]);
        const feeBps = Math.max(0, input.platformFeeBps ?? Number.parseInt(process.env.DRYAD_PLATFORM_FEE_BPS ?? "0", 10));
        const platformFeeAtomic = (input.amountWei * BigInt(feeBps)) / 10000n;
        const recipientNetAtomic = input.amountWei - platformFeeAtomic;
        const now = nowIso();
        const tip = {
            id: `tip_${randomUUID()}`,
            videoId: input.videoId,
            treeId: video.primaryTreeId,
            placeId: video.canonicalPlaceId,
            senderUserId: input.senderUserId,
            senderWalletAddress: input.senderWalletAddress,
            recipientUserId: video.authorUserId,
            recipientCreatorProfileId: video.authorProfileId,
            recipientWalletAddress: recipientWallet.publicKey,
            tipKind: input.tipKind ?? "water_tree",
            network: "ethereum",
            grossAmountAtomic: input.amountWei,
            platformFeeAtomic,
            recipientNetAtomic,
            note: input.note?.trim(),
            status: "awaiting_signature",
            createdAt: now,
            updatedAt: now
        };
        this.store.saveTipIntent(tip);
        this.store.saveLedgerEvent({ id: `tle_${randomUUID()}`, tipIntentId: tip.id, status: "created", createdAt: now, payload: { amountDisplayEth: amountToDisplay(input.amountWei, 18), tipKind: tip.tipKind } });
        return clone(tip);
    }
    async submitTip(input) {
        const tip = this.requireTip(input.tipIntentId);
        if (tip.senderUserId !== input.senderUserId)
            throw new ValidationError(["forbidden"]);
        if (tip.status === "confirmed")
            return clone(tip);
        if (tip.status === "submitted")
            return clone(tip);
        const idempotencyKey = stableIdempotencyKey([tip.id, tip.senderWalletAddress, tip.recipientWalletAddress, tip.grossAmountAtomic.toString()]);
        tip.status = "submitted";
        tip.updatedAt = nowIso();
        this.store.saveTipIntent(tip);
        this.store.saveLedgerEvent({ id: `tle_${randomUUID()}`, tipIntentId: tip.id, status: "submitted", createdAt: tip.updatedAt });
        try {
            const result = await this.adapter.submitTransfer({ fromWallet: tip.senderWalletAddress, toWallet: tip.recipientWalletAddress, amountWei: tip.grossAmountAtomic, memo: `${tip.tipKind === "water_tree" ? "Water tree" : "Direct ETH"} ${tip.videoId}`, idempotencyKey });
            tip.transactionSignature = result.signature;
            tip.explorerUrl = result.explorerUrl;
            tip.status = "confirmed";
            tip.confirmedAt = nowIso();
            tip.updatedAt = tip.confirmedAt;
            this.store.saveTipIntent(tip);
            this.store.saveLedgerEvent({ id: `tle_${randomUUID()}`, tipIntentId: tip.id, status: "confirmed", createdAt: tip.confirmedAt, payload: { signature: tip.transactionSignature } });
            return clone(tip);
        }
        catch (error) {
            tip.status = "failed";
            tip.failureReason = error instanceof Error ? error.message : "tip_transfer_failed";
            tip.updatedAt = nowIso();
            this.store.saveTipIntent(tip);
            this.store.saveLedgerEvent({ id: `tle_${randomUUID()}`, tipIntentId: tip.id, status: "failed", createdAt: tip.updatedAt, payload: { failureReason: tip.failureReason } });
            throw error;
        }
    }
    listTipsByVideo(videoId) { return this.store.listTipsByVideo(videoId).map(clone); }
    listSentTips(userId) { return this.store.listTipsBySender(userId).map(clone); }
    listReceivedTips(userId) { return this.store.listTipsByRecipient(userId).map(clone); }
    summarizeVideo(videoId) {
        const tips = this.store.listTipsByVideo(videoId).filter((tip) => tip.status === "confirmed");
        return this.reduceSummary(videoId, tips);
    }
    summarizeCreator(recipientUserId) {
        const tips = this.store.listTipsByRecipient(recipientUserId).filter((tip) => tip.status === "confirmed");
        return this.reduceSummary(recipientUserId, tips);
    }
    reduceSummary(id, tips) {
        return {
            videoId: id,
            totalTipsCount: tips.length,
            grossAmountAtomic: tips.reduce((sum, tip) => sum + tip.grossAmountAtomic, 0n),
            netToCreatorAtomic: tips.reduce((sum, tip) => sum + tip.recipientNetAtomic, 0n),
            platformFeeAtomic: tips.reduce((sum, tip) => sum + tip.platformFeeAtomic, 0n),
            latestTipAt: tips[0]?.confirmedAt
        };
    }
    requireTip(id) { const tip = this.store.getTipIntent(id); if (!tip)
        throw new ValidationError(["tip intent not found"]); return tip; }
}
