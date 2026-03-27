import { randomUUID } from "node:crypto";

import { ValidationError } from "../plans/errors.js";
import { amountToDisplay } from "../perbugRewards/solana/token.js";
import { stableIdempotencyKey } from "../perbugRewards/solana/walletAuth.js";
import type { DryadTipsAdapter, DryadTipsStore, DryadVideoTipIntent, VideoTipSummary } from "./types.js";

function nowIso(): string { return new Date().toISOString(); }
function clone<T>(value: T): T { return structuredClone(value); }

class MockDryadTipsAdapter implements DryadTipsAdapter {
  async submitTransfer(input: { fromWallet: string; toWallet: string; amountWei: bigint; memo: string; idempotencyKey: string }) {
    return { signature: `0x${stableIdempotencyKey([input.fromWallet, input.toWallet, input.idempotencyKey, input.amountWei.toString()]).slice(0, 64)}`, explorerUrl: `https://sepolia.etherscan.io/tx/0x${stableIdempotencyKey([input.memo, input.idempotencyKey]).slice(0, 64)}` };
  }
}

export interface VideoTipDependencies {
  getVideo(videoId: string): Promise<{ id: string; canonicalPlaceId?: string; primaryTreeId?: string; authorUserId: string; authorProfileId?: string; status: string; moderationStatus: string } | undefined>;
  getPrimaryWallet(userId: string): { publicKey: string } | undefined;
}

export class DryadTipsService {
  constructor(private readonly store: DryadTipsStore, private readonly deps: VideoTipDependencies, private readonly adapter: DryadTipsAdapter = new MockDryadTipsAdapter()) {}

  createVideoTipIntent(input: { videoId: string; senderUserId: string; senderWalletAddress: string; amountWei: bigint; note?: string; allowSelfTip?: boolean; platformFeeBps?: number; tipKind?: "water_tree" | "direct_eth" }): Promise<DryadVideoTipIntent> {
    return this.create(input);
  }

  private async create(input: { videoId: string; senderUserId: string; senderWalletAddress: string; amountWei: bigint; note?: string; allowSelfTip?: boolean; platformFeeBps?: number; tipKind?: "water_tree" | "direct_eth" }): Promise<DryadVideoTipIntent> {
    const video = await this.deps.getVideo(input.videoId);
    if (!video) throw new ValidationError(["video not found"]);
    if (!["published", "processed", "publish_pending"].includes(video.status) || ["rejected", "flagged"].includes(video.moderationStatus)) throw new ValidationError(["video cannot receive tips"]);
    if (!/^0x[a-fA-F0-9]{40}$/.test(input.senderWalletAddress)) throw new ValidationError(["invalid sender wallet"]);
    const recipientWallet = this.deps.getPrimaryWallet(video.authorUserId);
    if (!recipientWallet) throw new ValidationError(["creator wallet not linked"]);
    if (!input.allowSelfTip && video.authorUserId === input.senderUserId) throw new ValidationError(["self tipping disabled"]);
    if (input.note && input.note.length > 280) throw new ValidationError(["tip note too long"]);
    const feeBps = Math.max(0, input.platformFeeBps ?? Number.parseInt(process.env.DRYAD_PLATFORM_FEE_BPS ?? "0", 10));
    const platformFeeAtomic = (input.amountWei * BigInt(feeBps)) / 10000n;
    const recipientNetAtomic = input.amountWei - platformFeeAtomic;
    const now = nowIso();
    const tip: DryadVideoTipIntent = {
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

  async submitTip(input: { tipIntentId: string; senderUserId: string }): Promise<DryadVideoTipIntent> {
    const tip = this.requireTip(input.tipIntentId);
    if (tip.senderUserId !== input.senderUserId) throw new ValidationError(["forbidden"]);
    if (tip.status === "confirmed") return clone(tip);
    if (tip.status === "submitted") return clone(tip);
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
    } catch (error) {
      tip.status = "failed";
      tip.failureReason = error instanceof Error ? error.message : "tip_transfer_failed";
      tip.updatedAt = nowIso();
      this.store.saveTipIntent(tip);
      this.store.saveLedgerEvent({ id: `tle_${randomUUID()}`, tipIntentId: tip.id, status: "failed", createdAt: tip.updatedAt, payload: { failureReason: tip.failureReason } });
      throw error;
    }
  }

  listTipsByVideo(videoId: string) { return this.store.listTipsByVideo(videoId).map(clone); }
  listSentTips(userId: string) { return this.store.listTipsBySender(userId).map(clone); }
  listReceivedTips(userId: string) { return this.store.listTipsByRecipient(userId).map(clone); }
  summarizeVideo(videoId: string): VideoTipSummary {
    const tips = this.store.listTipsByVideo(videoId).filter((tip) => tip.status === "confirmed");
    return this.reduceSummary(videoId, tips);
  }
  summarizeCreator(recipientUserId: string): VideoTipSummary {
    const tips = this.store.listTipsByRecipient(recipientUserId).filter((tip) => tip.status === "confirmed");
    return this.reduceSummary(recipientUserId, tips);
  }

  private reduceSummary(id: string, tips: DryadVideoTipIntent[]): VideoTipSummary {
    return {
      videoId: id,
      totalTipsCount: tips.length,
      grossAmountAtomic: tips.reduce((sum, tip) => sum + tip.grossAmountAtomic, 0n),
      netToCreatorAtomic: tips.reduce((sum, tip) => sum + tip.recipientNetAtomic, 0n),
      platformFeeAtomic: tips.reduce((sum, tip) => sum + tip.platformFeeAtomic, 0n),
      latestTipAt: tips[0]?.confirmedAt
    };
  }

  private requireTip(id: string): DryadVideoTipIntent { const tip = this.store.getTipIntent(id); if (!tip) throw new ValidationError(["tip intent not found"]); return tip; }
}
