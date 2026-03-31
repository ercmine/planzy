import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";

import { MemoryPerbugRewardsStore } from "../memoryStore.js";
import { PerbugRewardsService } from "../service.js";
import type { PerbugClaimsAdapter } from "../types.js";
import { amountToAtomicUnits, isValidSolanaPublicKey } from "../solana/token.js";
import { formatWalletSignInMessage, stableIdempotencyKey } from "../solana/walletAuth.js";

function setup(claimsAdapter?: PerbugClaimsAdapter) {
  const service = new PerbugRewardsService(new MemoryPerbugRewardsStore(), claimsAdapter);
  service.createPlace({ id: "place-1", name: "Cafe One" });
  return service;
}

describe("PerbugRewardsService", () => {
  it("selects reward tiers by approved order and applies quality multipliers", () => {
    const service = setup();
    const first = service.submitReview({ userId: "u1", placeId: "place-1", videoUrl: "https://cdn/rev1.mp4", contentHash: "hash-1" });
    const second = service.submitReview({ userId: "u2", placeId: "place-1", videoUrl: "https://cdn/rev2.mp4", contentHash: "hash-2" });
    service.approveReview({ reviewId: first.id, actorUserId: "admin" });
    service.approveReview({ reviewId: second.id, actorUserId: "admin" });
    for (let i = 3; i <= 6; i += 1) {
      const review = service.submitReview({ userId: `u${i}`, placeId: "place-1", videoUrl: `https://cdn/rev${i}.mp4`, contentHash: `hash-${i}`, qualityRating: i === 6 ? "high" : "standard" });
      service.approveReview({ reviewId: review.id, actorUserId: "admin", qualityRating: i === 6 ? "high" : "standard" });
    }
    const firstApproved = service.getDashboard("u1").claimable[0].review.reward;
    const secondApproved = service.getDashboard("u2").claimable[0].review.reward;
    const sixthApproved = service.getDashboard("u6").claimable[0].review.reward;

    expect(firstApproved.rewardPosition).toBe(1);
    expect(firstApproved.finalAmountAtomic?.toString()).toBe(amountToAtomicUnits(200, 9).toString());
    expect(secondApproved.rewardPosition).toBe(2);
    expect(secondApproved.finalAmountAtomic?.toString()).toBe(amountToAtomicUnits(100, 9).toString());
    expect(sixthApproved.rewardPosition).toBe(6);
    expect(sixthApproved.finalAmountAtomic?.toString()).toBe(amountToAtomicUnits(62.5, 9).toString());
  });

  it("duplicate review does not advance ladder and rejected review does not advance ladder", () => {
    const service = setup();
    const duplicateA = service.submitReview({ userId: "u1", placeId: "place-1", videoUrl: "https://cdn/a.mp4", contentHash: "dup" });
    const duplicateB = service.submitReview({ userId: "u2", placeId: "place-1", videoUrl: "https://cdn/b.mp4", contentHash: "dup" });
    const rejected = service.submitReview({ userId: "u3", placeId: "place-1", videoUrl: "https://cdn/c.mp4", contentHash: "unique" });
    const winner = service.submitReview({ userId: "u4", placeId: "place-1", videoUrl: "https://cdn/d.mp4", contentHash: "unique-2" });

    service.approveReview({ reviewId: duplicateA.id, actorUserId: "admin" });
    service.approveReview({ reviewId: duplicateB.id, actorUserId: "admin" });
    service.rejectReview({ reviewId: rejected.id, actorUserId: "admin", reason: "policy" });
    const winningApproval = service.approveReview({ reviewId: winner.id, actorUserId: "admin" });

    expect(winningApproval.reward.rewardPosition).toBe(2);
    expect(service.getDashboard("u2").history[0].review.reward.status).toBe("blocked");
  });

  it("same user cannot earn default reward twice at the same place unless admin grants a distinct slot", () => {
    const service = setup();
    const first = service.submitReview({ userId: "u1", placeId: "place-1", videoUrl: "https://cdn/a.mp4", contentHash: "one" });
    const second = service.submitReview({ userId: "u1", placeId: "place-1", videoUrl: "https://cdn/b.mp4", contentHash: "two" });
    const third = service.submitReview({ userId: "u1", placeId: "place-1", videoUrl: "https://cdn/c.mp4", contentHash: "three", distinctRewardSlot: "feature-2" });

    service.approveReview({ reviewId: first.id, actorUserId: "admin" });
    const blocked = service.approveReview({ reviewId: second.id, actorUserId: "admin" });
    const unlocked = service.approveReview({ reviewId: third.id, actorUserId: "admin", adminDistinctRewardSlotEnabled: true });

    expect(blocked.reward.status).toBe("blocked");
    expect(unlocked.reward.status).toBe("claimable");
  });

  it("wallet auth rejects replayed nonce and validates message formatting", () => {
    const service = setup();
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const nonce = service.createWalletNonce(publicKey);
    const signed = nacl.sign.detached(new TextEncoder().encode(nonce.message), keypair.secretKey);
    const signature = bs58.encode(signed);
    const verified = service.verifyWalletLogin({ publicKey, signature, userId: "u1" });
    expect(verified.wallet.publicKey).toBe(publicKey);
    expect(() => service.verifyWalletLogin({ publicKey, signature, userId: "u1" })).toThrow();
    expect(formatWalletSignInMessage({ publicKey, nonce: nonce.nonce, timestamp: nonce.message.split("\n")[3]!.replace("Timestamp: ", "") })).toContain(`Wallet: ${publicKey}`);
  });

  it("claim flow is idempotent and uses Perbug RPC payout adapter", async () => {
    const claimsAdapter: PerbugClaimsAdapter = {
      transferClaim: async ({ claimantAddress, idempotencyKey }) => ({ txid: `tx-${idempotencyKey}`, explorerUrl: `https://explorer.perbug.test/tx/${claimantAddress}` })
    };
    const service = setup(claimsAdapter);
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const nonce = service.createWalletNonce(publicKey);
    const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(nonce.message), keypair.secretKey));
    service.verifyWalletLogin({ publicKey, signature, userId: "u1" });
    const review = service.submitReview({ userId: "u1", placeId: "place-1", videoUrl: "https://cdn/a.mp4", contentHash: "claim-1" });
    service.approveReview({ reviewId: review.id, actorUserId: "admin", qualityRating: "featured" });

    const idem = stableIdempotencyKey(["claim", review.id]);
    const claimA = await service.claimReward({ userId: "u1", reviewId: review.id, walletPublicKey: publicKey, idempotencyKey: idem });
    const claimB = await service.claimReward({ userId: "u1", reviewId: review.id, walletPublicKey: publicKey, idempotencyKey: idem });
    expect(claimA.claim.transactionSignature).toBeDefined();
    expect(claimA.claim.transactionSignature).toBe(claimB.claim.transactionSignature);
    expect(claimA.claim.associatedTokenAccount).toBe(publicKey);
    expect(claimA.claim.cluster).toContain("perbug-rpc-");
  });

  it("exposes helper utilities for validation and atomic conversions", () => {
    const keypair = Keypair.generate();
    expect(isValidSolanaPublicKey(keypair.publicKey.toBase58())).toBe(true);
    expect(isValidSolanaPublicKey("not-a-key")).toBe(false);
    expect(amountToAtomicUnits(62.5, 9)).toBe(62500000000n);
  });
});
