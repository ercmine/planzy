import { describe, expect, it } from "vitest";

import { MemoryViewerEngagementStore } from "../memoryStore.js";
import { ViewerEngagementRewardsService } from "../service.js";

const videoContext = {
  vid1: { creatorId: "creator_a", placeId: "place_1" },
  vid2: { creatorId: "creator_b", placeId: "place_2" }
};

function makeService() {
  return new ViewerEngagementRewardsService(
    new MemoryViewerEngagementStore(),
    { getVideoContext: (videoId) => videoContext[videoId as keyof typeof videoContext] ?? null }
  );
}

describe("ViewerEngagementRewardsService", () => {
  it("valid watch earns reward", () => {
    const service = makeService();
    const session = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: session.id, watchMs: 20_000, progressMs: 20_000, foreground: true });
    const rewards = service.listViewerRewards("u1");
    expect(rewards.some((entry) => entry.action === "watch" && entry.status === "settled")).toBe(true);
  });

  it("too-short watch does not earn", () => {
    const service = makeService();
    const session = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: session.id, watchMs: 4_000, progressMs: 5_000, foreground: true });
    service.completeWatchSession({ userId: "u1", sessionId: session.id });
    expect(service.listViewerRewards("u1")).toHaveLength(0);
  });

  it("repeated rewatch does not farm rewards", () => {
    const service = makeService();
    const s1 = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 40_000 });
    service.heartbeat({ userId: "u1", sessionId: s1.id, watchMs: 20_000, progressMs: 20_000, foreground: true });
    const s2 = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 40_000 });
    service.heartbeat({ userId: "u1", sessionId: s2.id, watchMs: 20_000, progressMs: 22_000, foreground: true });
    const watchRewards = service.listViewerRewards("u1").filter((entry) => entry.action === "watch");
    expect(watchRewards).toHaveLength(1);
  });

  it("rating requires sufficient watch threshold", () => {
    const service = makeService();
    const session = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: session.id, watchMs: 8_000, progressMs: 9_000, foreground: true });
    const { decision } = service.submitRating({ userId: "u1", videoId: "vid1", rating: 5 });
    expect(decision.eligible).toBe(false);
    expect(decision.reasonCodes).toContain("watch_ms_below_threshold");
  });

  it("low-quality spam comments do not earn", () => {
    const service = makeService();
    const session = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: session.id, watchMs: 20_000, progressMs: 25_000, foreground: true });
    const first = service.submitComment({ userId: "u1", videoId: "vid1", text: "great great great" });
    expect(first.decision.eligible).toBe(false);
    expect(first.decision.reasonCodes).toContain("comment_low_entropy");
  });

  it("valid quality comments can earn", () => {
    const service = makeService();
    const session = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: session.id, watchMs: 26_000, progressMs: 30_000, foreground: true });
    const result = service.submitComment({ userId: "u1", videoId: "vid1", text: "Loved the breakdown of the ramen broth and neighborhood tips, super useful." });
    expect(result.decision.eligible).toBe(true);
    expect(service.listViewerRewards("u1").some((entry) => entry.action === "comment")).toBe(true);
  });

  it("self-engagement is blocked", () => {
    const service = makeService();
    const session = service.startWatchSession({ userId: "creator_a", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "creator_a", sessionId: session.id, watchMs: 20_000, progressMs: 35_000, foreground: true });
    const decision = service.getEligibility({ userId: "creator_a", videoId: "vid1", action: "watch" });
    expect(decision.eligible).toBe(false);
    expect(decision.reasonCodes).toContain("self_engagement_blocked");
  });

  it("daily caps work", () => {
    const service = makeService();
    const highRule = { ...service.listRules().find((r) => r.action === "watch")!, baseRewardAtomic: 700_000n, cooldownHours: 0, maxPerDay: 10 };
    service.updateRule(highRule);
    const s1 = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: s1.id, watchMs: 20_000, progressMs: 30_000, foreground: true });
    const s2 = service.startWatchSession({ userId: "u1", videoId: "vid2", durationMs: 60_000 });
    const result = service.heartbeat({ userId: "u1", sessionId: s2.id, watchMs: 20_000, progressMs: 30_000, foreground: true });
    expect(result.session.id).toBeTruthy();
    const decision = service.getEligibility({ userId: "u1", videoId: "vid2", action: "watch" });
    expect(decision.reasonCodes).toContain("per_video_daily_cap_reached");
  });

  it("sponsored reward pools decrement correctly", () => {
    const service = makeService();
    const pool = service.createSponsoredPool({
      campaignId: "camp-1",
      sponsorBusinessId: "biz-1",
      fundedAtomic: 1_000_000n,
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 60_000).toISOString(),
      active: true,
      eligibleActions: ["watch"],
      perUserDailyCapAtomic: 400_000n
    });
    service.mapVideoToCampaign({ videoId: "vid1", poolId: pool.id });
    const session = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: session.id, watchMs: 20_000, progressMs: 25_000, foreground: true });
    const campaign = service.getCampaignMetadata("vid1");
    expect(campaign?.remainingAtomic).toBe(920000n);
  });

  it("suspicious activity is flagged", () => {
    const service = makeService();
    for (let i = 0; i < 7; i += 1) {
      const s = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
      service.heartbeat({ userId: "u1", sessionId: s.id, watchMs: 4_000, progressMs: 4_500, foreground: false });
    }
    service.submitRating({ userId: "u1", videoId: "vid1", rating: 4 });
    expect(service.listRiskFlags("u1").length).toBeGreaterThan(0);
  });

  it("reward ledgers are correct", () => {
    const service = makeService();
    const s = service.startWatchSession({ userId: "u1", videoId: "vid1", durationMs: 60_000 });
    service.heartbeat({ userId: "u1", sessionId: s.id, watchMs: 20_000, progressMs: 30_000, foreground: true });
    const ledger = service.listViewerRewards("u1");
    expect(ledger[0]).toMatchObject({ userId: "u1", videoId: "vid1", action: "watch", source: "platform", status: "settled" });
  });
});
