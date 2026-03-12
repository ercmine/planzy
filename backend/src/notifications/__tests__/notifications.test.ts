import { describe, expect, it } from "vitest";

import { MemoryNotificationStore } from "../memoryStore.js";
import { NotificationService } from "../service.js";

describe("notification service", () => {
  it("creates and reads follow notifications", async () => {
    const service = new NotificationService(new MemoryNotificationStore(), () => new Date("2026-03-08T00:00:00.000Z"));
    await service.notify({ type: "follow.created", recipientUserId: "creator-user", actor: { userId: "u1", displayName: "Alex", profileType: "user" }, objectId: "follow-1" });

    const list = await service.list("creator-user");
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.type).toBe("creator_followed");
    expect(await service.unreadCount("creator-user")).toBe(1);

    await service.markAllRead("creator-user");
    expect(await service.unreadCount("creator-user")).toBe(0);
  });

  it("dedupes moderation approval events", async () => {
    const service = new NotificationService(new MemoryNotificationStore(), () => new Date("2026-03-08T00:00:00.000Z"));
    await service.notify({ type: "review.approved", recipientUserId: "u2", reviewId: "r1", placeId: "p1" });
    await service.notify({ type: "review.approved", recipientUserId: "u2", reviewId: "r1", placeId: "p1" });
    const list = await service.list("u2");
    expect(list.items).toHaveLength(1);
  });

  it("supports preferences and suppression", async () => {
    const service = new NotificationService(new MemoryNotificationStore(), () => new Date("2026-03-08T00:00:00.000Z"));
    await service.updatePreference("u3", "premium", { inAppEnabled: false });
    await service.notify({ type: "premium.feature.upsell", recipientUserId: "u3", featureKey: "ai-planner" });
    const list = await service.list("u3");
    expect(list.items).toHaveLength(0);
  });

  it("throttles repeated upsells", async () => {
    const service = new NotificationService(new MemoryNotificationStore());
    await service.notify({ type: "premium.limit.warning", recipientUserId: "u4", limitKey: "max_video_reviews_per_month", percentUsed: 90 });
    await service.notify({ type: "premium.limit.warning", recipientUserId: "u4", limitKey: "max_video_reviews_per_month", percentUsed: 91 });
    const list = await service.list("u4");
    expect(list.items).toHaveLength(1);
  });

  it("creates retention loop notifications for creator and discovery flows", async () => {
    const service = new NotificationService(new MemoryNotificationStore(), () => new Date("2026-03-09T08:00:00.000Z"));
    await service.notify({ type: "video.processing.finished", recipientUserId: "creator-1", videoId: "vid-1", placeId: "place-1", placeName: "Harbor Cafe" });
    await service.notify({ type: "video.published", recipientUserId: "creator-1", videoId: "vid-1", placeId: "place-1", placeName: "Harbor Cafe" });
    await service.notify({ type: "saved.place.new_videos", recipientUserId: "user-2", placeId: "place-1", placeName: "Harbor Cafe", newVideoCount: 3 });
    await service.notify({ type: "discovery.local.highlights", recipientUserId: "user-2", city: "Austin", highlightsCount: 5 });

    const creator = await service.list("creator-1");
    expect(creator.items.map((item) => item.type).sort()).toEqual(["video_processing_finished", "video_published"]);

    const user = await service.list("user-2");
    expect(user.items).toHaveLength(2);
    expect(user.items[0]?.route?.name).toBe("feed");
    expect(user.items[1]?.route?.name).toBe("place");
  });

  it("registers and revokes device tokens", async () => {
    const service = new NotificationService(new MemoryNotificationStore(), () => new Date("2026-03-09T08:00:00.000Z"));
    await service.registerDeviceToken({ userId: "u-device", token: "token-1", platform: "ios", appVersion: "1.2.0" });
    expect(await service.listActiveDeviceTokens("u-device")).toHaveLength(1);
    expect(await service.unregisterDeviceToken("u-device", "token-1")).toBe(true);
    expect(await service.listActiveDeviceTokens("u-device")).toHaveLength(0);
  });
});
