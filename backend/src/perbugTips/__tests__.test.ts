import { describe, expect, it } from "vitest";

import { MemoryPerbugTipsStore } from "./memoryStore.js";
import { PerbugTipsService } from "./service.js";

describe("PerbugTipsService", () => {
  const makeService = () => new PerbugTipsService(new MemoryPerbugTipsStore(), {
    getVideo: async () => ({ id: "video-1", primaryTreeId: "tree-1", authorUserId: "creator-1", authorProfileId: "creator-profile-1", status: "published", moderationStatus: "approved" }),
    getPrimaryWallet: (userId) => userId === "creator-1" ? { publicKey: "0x1111111111111111111111111111111111111111" } : undefined
  });

  it("creates and confirms video tips", async () => {
    const service = makeService();
    const intent = await service.createVideoTipIntent({ videoId: "video-1", senderUserId: "fan-1", senderWalletAddress: "0x2222222222222222222222222222222222222222", amountWei: 50000000000000000n, note: "nice", tipKind: "water_tree" });
    const confirmed = await service.submitTip({ tipIntentId: intent.id, senderUserId: "fan-1" });
    expect(confirmed.status).toBe("confirmed");
    expect(service.summarizeVideo("video-1").grossAmountAtomic).toBe(50000000000000000n);
  });

  it("blocks self tipping when disabled", async () => {
    const service = makeService();
    await expect(service.createVideoTipIntent({ videoId: "video-1", senderUserId: "creator-1", senderWalletAddress: "0x1111111111111111111111111111111111111111", amountWei: 10000000000000000n, allowSelfTip: false })).rejects.toThrow();
  });
});
