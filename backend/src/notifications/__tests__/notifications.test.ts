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
});
