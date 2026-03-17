import { describe, expect, it } from "vitest";

import { MemoryChallengesStore } from "../memoryStore.js";
import { ChallengesService } from "../service.js";

describe("challenges service", () => {
  it("tracks weekly explorer progress with distinct canonical places", async () => {
    const service = new ChallengesService(new MemoryChallengesStore());
    await service.recordEvent({
      eventId: "evt-1",
      userId: "city-explorer",
      type: "place_saved",
      canonicalPlaceId: "p-1",
      cityId: "city-minneapolis",
      categoryIds: ["coffee"]
    });
    const detail = service.getChallengeDetail("city-explorer", "weekly-coffee-explorer");
    expect(detail?.progress.criteria[0]?.current).toBe(1);

    await service.recordEvent({
      eventId: "evt-2",
      userId: "city-explorer",
      type: "place_saved",
      canonicalPlaceId: "p-1",
      cityId: "city-minneapolis",
      categoryIds: ["coffee"]
    });
    const afterDup = service.getChallengeDetail("city-explorer", "weekly-coffee-explorer");
    expect(afterDup?.progress.criteria[0]?.current).toBe(1);
  });

  it("gates creator quests by moderation/trust and completes seasonal hotspot quest", async () => {
    const service = new ChallengesService(new MemoryChallengesStore());
    await service.recordEvent({
      eventId: "creator-1",
      userId: "creator-user",
      type: "video_published",
      canonicalPlaceId: "h-1",
      cityId: "city-minneapolis",
      neighborhoodId: "neighborhood-north-loop",
      categoryIds: ["hidden_gems"],
      contentState: "hidden",
      trustScore: 90
    });
    const blocked = service.getChallengeDetail("creator-user", "weekly-north-loop-creator");
    expect(blocked?.progress.criteria[0]?.current).toBe(0);

    await service.recordEvent({
      eventId: "creator-2",
      userId: "creator-user",
      type: "video_published",
      canonicalPlaceId: "h-1",
      cityId: "city-minneapolis",
      neighborhoodId: "neighborhood-north-loop",
      categoryIds: ["hidden_gems"],
      contentState: "published",
      trustScore: 65
    });
    await service.recordEvent({
      eventId: "creator-3",
      userId: "creator-user",
      type: "video_published",
      canonicalPlaceId: "h-2",
      cityId: "city-minneapolis",
      neighborhoodId: "neighborhood-north-loop",
      categoryIds: ["hidden_gems"],
      contentState: "approved",
      trustScore: 65
    });
    const completed = service.getChallengeDetail("creator-user", "weekly-north-loop-creator");
    expect(completed?.progress.status).toBe("completed");
    expect(completed?.progress.rewardState).toBe("granted");

    await service.recordEvent({
      eventId: "mix-1",
      userId: "creator-user",
      type: "review_created",
      canonicalPlaceId: "n-1",
      cityId: "city-minneapolis",
      neighborhoodId: "neighborhood-downtown",
      categoryIds: ["nightlife"],
      hotspotIds: ["hotspot-downtown-nightlife"],
      contentState: "published"
    });
    await service.recordEvent({
      eventId: "mix-2",
      userId: "creator-user",
      type: "review_created",
      canonicalPlaceId: "n-2",
      cityId: "city-minneapolis",
      neighborhoodId: "neighborhood-downtown",
      categoryIds: ["nightlife"],
      hotspotIds: ["hotspot-downtown-nightlife"],
      contentState: "published"
    });
    await service.recordEvent({
      eventId: "mix-3",
      userId: "creator-user",
      type: "review_created",
      canonicalPlaceId: "n-3",
      cityId: "city-minneapolis",
      neighborhoodId: "neighborhood-downtown",
      categoryIds: ["nightlife"],
      hotspotIds: ["hotspot-downtown-nightlife"],
      contentState: "approved"
    });
    const seasonal = service.getChallengeDetail("creator-user", "seasonal-nightlife-hotspots");
    expect(seasonal?.progress.status).toBe("completed");
  });

  it("builds quest hub with weekly, seasonal, and upcoming windows", () => {
    const service = new ChallengesService(new MemoryChallengesStore());
    const hub = service.getQuestHub("u-quest", { cityId: "city-minneapolis" });
    expect(hub.weekly.length).toBeGreaterThan(0);
    expect(hub.seasonal.length).toBeGreaterThan(0);
    expect(hub.upcoming.some((item) => item.id === "event-waterfront-sprint")).toBe(true);
    expect(hub.weekly[0]?.progress.window.secondsRemaining).toBeGreaterThanOrEqual(0);
  });

  it("supports local personalization filters and suspicious spam blocking", async () => {
    const service = new ChallengesService(new MemoryChallengesStore());
    const filtered = service.listAvailable("u-1", { cityId: "city-minneapolis", categoryId: "nightlife", cadence: "seasonal" });
    expect(filtered.some((item) => item.id === "seasonal-nightlife-hotspots")).toBe(true);

    const blocked = await service.recordEvent({
      eventId: "spam-1",
      userId: "spam-user",
      type: "place_saved",
      canonicalPlaceId: "p-2",
      cityId: "city-minneapolis",
      categoryIds: ["coffee"],
      suspicious: true
    });
    expect(blocked.blockedReason).toBe("suspicious_event");
    const detail = service.getChallengeDetail("spam-user", "weekly-coffee-explorer");
    expect(detail?.progress.qualifyingActions).toBe(0);
  });
});
