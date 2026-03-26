import { describe, expect, it } from "vitest";

import { MemoryDryadTipsStore } from "./memoryStore.js";
import { DryadTipsService } from "./service.js";

describe("DryadTipsService", () => {
  const makeService = () => new DryadTipsService(new MemoryDryadTipsStore(), {
    getVideo: async () => ({ id: "video-1", canonicalPlaceId: "place-1", authorUserId: "creator-1", authorProfileId: "creator-profile-1", status: "published", moderationStatus: "approved" }),
    getPrimaryWallet: (userId) => userId === "creator-1" ? { publicKey: "11111111111111111111111111111111" } : undefined
  });

  it("creates and confirms video tips", async () => {
    const service = makeService();
    const intent = await service.createVideoTipIntent({ videoId: "video-1", senderUserId: "fan-1", senderWalletPublicKey: "11111111111111111111111111111111", amountAtomic: 5000000000n, note: "nice" });
    const confirmed = await service.submitTip({ tipIntentId: intent.id, senderUserId: "fan-1" });
    expect(confirmed.status).toBe("confirmed");
    expect(service.summarizeVideo("video-1").grossAmountAtomic).toBe(5000000000n);
  });

  it("blocks self tipping when disabled", async () => {
    const service = makeService();
    await expect(service.createVideoTipIntent({ videoId: "video-1", senderUserId: "creator-1", senderWalletPublicKey: "11111111111111111111111111111111", amountAtomic: 1000000000n, allowSelfTip: false })).rejects.toThrow();
  });
});
