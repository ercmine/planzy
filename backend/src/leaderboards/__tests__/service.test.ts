import { describe, expect, it } from "vitest";

import { MemoryLeaderboardsStore } from "../memoryStore.js";
import { LeaderboardsService } from "../service.js";

function createService(now = "2026-04-10T12:00:00.000Z") {
  return new LeaderboardsService(new MemoryLeaderboardsStore(), undefined, undefined, () => new Date(now));
}

describe("LeaderboardsService", () => {
  it("aggregates creator/explorer/city/category leaderboards with windows", async () => {
    const service = createService();
    await service.recordEvent({ eventId: "1", actorUserId: "u1", creatorUserId: "u1", explorerUserId: "u1", canonicalPlaceId: "p1", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "review_published", qualityScore: 0.9, engagementScore: 0.7, actorTrustTier: "trusted", occurredAt: "2026-04-10T10:00:00.000Z" });
    await service.recordEvent({ eventId: "2", actorUserId: "u2", creatorUserId: "u2", explorerUserId: "u2", canonicalPlaceId: "p2", normalizedCityId: "city_sf", normalizedCategoryId: "nightlife", actionType: "review_published", qualityScore: 0.8, engagementScore: 0.6, actorTrustTier: "trusted", occurredAt: "2026-04-08T10:00:00.000Z" });
    await service.recordEvent({ eventId: "2b", actorUserId: "u2", creatorUserId: "u2", explorerUserId: "u2", canonicalPlaceId: "p22", normalizedCityId: "city_sf", normalizedCategoryId: "nightlife", actionType: "review_published", qualityScore: 0.8, engagementScore: 0.6, actorTrustTier: "trusted", occurredAt: "2026-04-09T10:00:00.000Z" });
    await service.recordEvent({ eventId: "3", actorUserId: "u1", creatorUserId: "u1", explorerUserId: "u1", canonicalPlaceId: "p3", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "place_explored", qualityScore: 0.7, engagementScore: 0.4, actorTrustTier: "high", occurredAt: "2026-04-10T11:00:00.000Z" });
    service.rebuildSnapshots();

    expect(service.getLeaderboard({ type: "creator", window: "daily" })[0]?.entityId).toBe("u1");
    expect(service.getLeaderboard({ type: "creator", window: "weekly" }).length).toBe(2);
    expect(service.getLeaderboard({ type: "city", window: "weekly" })[0]?.entityId).toBe("city_nyc");
    expect(service.getLeaderboard({ type: "category", window: "weekly" })[0]?.entityId).toBe("coffee");
  });

  it("suppresses moderation blocked and spam-repeat attempts", async () => {
    const service = createService();
    await service.recordEvent({ eventId: "a", actorUserId: "spam", creatorUserId: "spam", canonicalPlaceId: "p1", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "video_published", qualityScore: 0.9, occurredAt: "2026-04-10T02:00:00.000Z" });
    await service.recordEvent({ eventId: "b", actorUserId: "spam", creatorUserId: "spam", canonicalPlaceId: "p1", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "video_published", qualityScore: 0.9, occurredAt: "2026-04-10T03:00:00.000Z" });
    await service.recordEvent({ eventId: "c", actorUserId: "spam", creatorUserId: "spam", canonicalPlaceId: "p1", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "video_published", qualityScore: 0.9, occurredAt: "2026-04-10T04:00:00.000Z" });
    await service.recordEvent({ eventId: "d", actorUserId: "spam", creatorUserId: "spam", canonicalPlaceId: "p1", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "video_published", qualityScore: 0.9, occurredAt: "2026-04-10T05:00:00.000Z", suspicious: true });
    await service.recordEvent({ eventId: "good", actorUserId: "good", creatorUserId: "good", canonicalPlaceId: "p2", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "video_published", qualityScore: 0.8, occurredAt: "2026-04-10T06:00:00.000Z" });
    await service.recordEvent({ eventId: "good2", actorUserId: "good", creatorUserId: "good", canonicalPlaceId: "p3", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "video_published", qualityScore: 0.75, occurredAt: "2026-04-10T06:10:00.000Z" });
    await service.recordEvent({ eventId: "mod", actorUserId: "mod", creatorUserId: "mod", canonicalPlaceId: "p9", normalizedCityId: "city_nyc", normalizedCategoryId: "coffee", actionType: "video_published", qualityScore: 0.9, moderationState: "hidden", occurredAt: "2026-04-10T07:00:00.000Z" });
    service.rebuildSnapshots();

    const rows = service.getLeaderboard({ type: "creator", window: "daily" });
    expect(rows[0]?.entityId).toBe("good");
    expect(rows.find((r) => r.entityId === "mod")).toBeUndefined();
  });

  it("uses trust multipliers and stable tie-breaks", async () => {
    const service = createService();
    await service.recordEvent({ eventId: "t1", actorUserId: "a", explorerUserId: "a", canonicalPlaceId: "p1", normalizedCityId: "city_a", normalizedCategoryId: "parks", actionType: "place_explored", qualityScore: 0.7, engagementScore: 0.4, actorTrustTier: "trusted", occurredAt: "2026-04-10T01:00:00.000Z" });
    await service.recordEvent({ eventId: "t2", actorUserId: "a", explorerUserId: "a", canonicalPlaceId: "p2", normalizedCityId: "city_a", normalizedCategoryId: "parks", actionType: "place_explored", qualityScore: 0.7, engagementScore: 0.4, actorTrustTier: "trusted", occurredAt: "2026-04-10T01:10:00.000Z" });
    await service.recordEvent({ eventId: "u1", actorUserId: "b", explorerUserId: "b", canonicalPlaceId: "p3", normalizedCityId: "city_a", normalizedCategoryId: "parks", actionType: "place_explored", qualityScore: 0.7, engagementScore: 0.4, actorTrustTier: "low", occurredAt: "2026-04-10T01:20:00.000Z" });
    await service.recordEvent({ eventId: "u2", actorUserId: "b", explorerUserId: "b", canonicalPlaceId: "p4", normalizedCityId: "city_a", normalizedCategoryId: "parks", actionType: "place_explored", qualityScore: 0.7, engagementScore: 0.4, actorTrustTier: "low", occurredAt: "2026-04-10T01:30:00.000Z" });
    service.rebuildSnapshots();

    const rows = service.getLeaderboard({ type: "explorer", window: "daily" });
    expect(rows[0]?.entityId).toBe("a");
    expect(rows[0]?.score).toBeGreaterThan(rows[1]?.score ?? 0);
  });
});
