import { describe, expect, it } from "vitest";

import { ProgressionService } from "../service.js";

describe("ProgressionService", () => {
  it("creates XP events and accumulates explorer + creator XP", () => {
    const service = new ProgressionService();

    const explorer = service.recordAction({
      userId: "u-mixed",
      type: "explorer_place_saved_first",
      canonicalPlaceId: "place_1",
      targetEntityType: "place",
      targetEntityId: "place_1"
    });

    const creator = service.recordAction({
      userId: "u-mixed",
      type: "creator_video_published",
      canonicalPlaceId: "place_2",
      targetEntityType: "video",
      targetEntityId: "vid_1",
      moderationState: "active"
    });

    expect(explorer.event.status).toBe("awarded");
    expect(creator.event.status).toBe("awarded");
    expect(creator.profile.explorerXp).toBeGreaterThan(0);
    expect(creator.profile.creatorXp).toBeGreaterThan(0);
    expect(service.getRecentXpHistory("u-mixed", 2)).toHaveLength(2);
  });

  it("transitions levels via explicit level tables", () => {
    const service = new ProgressionService();

    for (let i = 0; i < 4; i += 1) {
      service.recordAction({
        userId: "u-explorer",
        type: "explorer_review_submitted",
        targetEntityType: "review",
        targetEntityId: `r${i}`,
        canonicalPlaceId: `p${i}`
      });
    }

    const profile = service.getProgressionProfile("u-explorer");
    expect(profile.explorerLevel.level).toBeGreaterThan(1);
    expect(profile.explorerLevel.nextLevelXp).toBeGreaterThanOrEqual(profile.explorerLevel.currentXp);
  });

  it("maintains and breaks streaks with grace logic", () => {
    const service = new ProgressionService();

    service.recordAction({ userId: "u-streak", type: "explorer_daily_active", occurredAt: new Date("2026-04-01T09:00:00Z") });
    service.recordAction({ userId: "u-streak", type: "explorer_daily_active", occurredAt: new Date("2026-04-02T09:00:00Z") });
    service.recordAction({ userId: "u-streak", type: "explorer_daily_active", occurredAt: new Date("2026-04-04T09:00:00Z") });

    const withGrace = service.getProgressionProfile("u-streak").streaks.find((s) => s.key === "explorer_daily");
    expect(withGrace?.count).toBe(2);

    service.recordAction({ userId: "u-streak", type: "explorer_daily_active", occurredAt: new Date("2026-04-08T09:00:00Z") });
    const reset = service.getProgressionProfile("u-streak").streaks.find((s) => s.key === "explorer_daily");
    expect(reset?.count).toBe(1);
  });

  it("completes milestones for published video and saved places", () => {
    const service = new ProgressionService({
      milestones: [
        { id: "m_video", track: "creator", metric: "published_videos", threshold: 1, title: "First video" },
        { id: "m_saves", track: "explorer", metric: "saved_places", threshold: 2, title: "Two saves" }
      ]
    });

    service.recordAction({ userId: "u-m", type: "creator_video_published", targetEntityType: "video", targetEntityId: "v1" });
    service.recordAction({ userId: "u-m", type: "explorer_place_saved_first", targetEntityType: "place", targetEntityId: "p1", canonicalPlaceId: "p1" });
    const secondSave = service.recordAction({ userId: "u-m", type: "explorer_place_saved_first", targetEntityType: "place", targetEntityId: "p2", canonicalPlaceId: "p2" });

    expect(secondSave.milestoneUnlocks.map((m) => m.id)).toContain("m_saves");
    expect(secondSave.profile.milestones.filter((m) => m.completedAt)).toHaveLength(2);
  });

  it("suppresses duplicate, cooldown, and cap-farming attempts", () => {
    const service = new ProgressionService({
      actionDailyCaps: { explorer_place_open_meaningful: 16 },
      actionCooldownMs: { creator_draft_created: 1000 }
    });

    const first = service.recordAction({ userId: "u-spam", type: "explorer_place_open_meaningful", targetEntityType: "place", targetEntityId: "p1", dedupeKey: "same" });
    const duplicate = service.recordAction({ userId: "u-spam", type: "explorer_place_open_meaningful", targetEntityType: "place", targetEntityId: "p1", dedupeKey: "same" });
    const cooldown = service.recordAction({ userId: "u-spam", type: "creator_draft_created", targetEntityType: "video", targetEntityId: "draft1", dedupeKey: "draft-a", occurredAt: new Date("2026-05-01T10:00:00Z") });
    const cooldownBlocked = service.recordAction({ userId: "u-spam", type: "creator_draft_created", targetEntityType: "video", targetEntityId: "draft1", dedupeKey: "draft-b", occurredAt: new Date("2026-05-01T10:00:00.500Z") });
    const cap = service.recordAction({ userId: "u-spam", type: "explorer_place_open_meaningful", targetEntityType: "place", targetEntityId: "p2" });
    const capBlocked = service.recordAction({ userId: "u-spam", type: "explorer_place_open_meaningful", targetEntityType: "place", targetEntityId: "p3" });

    expect(first.event.status).toBe("awarded");
    expect(duplicate.event.suppressionReason).toBe("duplicate_dedupe_key");
    expect(cooldown.event.status).toBe("awarded");
    expect(cooldownBlocked.event.suppressionReason).toBe("cooldown_active");
    expect(cap.event.status).toBe("awarded");
    expect(capBlocked.event.suppressionReason).toBe("daily_cap_reached");
  });

  it("suppresses trust and moderation disallowed XP", () => {
    const service = new ProgressionService();

    const moderationBlocked = service.recordAction({
      userId: "u-mod",
      type: "creator_video_published",
      targetEntityType: "video",
      targetEntityId: "v-hidden",
      moderationState: "hidden"
    });

    const trustBlocked = service.recordAction({
      userId: "u-mod",
      type: "creator_quality_engagement",
      targetEntityType: "video",
      targetEntityId: "v-low",
      actorTrustTier: "low"
    });

    expect(moderationBlocked.event.status).toBe("suppressed");
    expect(moderationBlocked.event.suppressionReason).toBe("moderation_blocked");
    expect(trustBlocked.event.suppressionReason).toBe("trust_gate");
  });

  it("returns DTO-friendly progression profile, history and admin analytics", () => {
    const service = new ProgressionService();

    service.recordAction({ userId: "u-dto", type: "explorer_new_city", targetEntityType: "city", targetEntityId: "nyc" });
    service.recordAction({ userId: "u-dto", type: "creator_draft_created", targetEntityType: "video", targetEntityId: "draft1" });
    service.recordAction({ userId: "u-dto", type: "creator_draft_created", targetEntityType: "video", targetEntityId: "draft1", dedupeKey: "dup" });
    service.recordAction({ userId: "u-dto", type: "creator_draft_created", targetEntityType: "video", targetEntityId: "draft1", dedupeKey: "dup" });

    const profile = service.getProgressionProfile("u-dto");
    const history = service.getRecentXpHistory("u-dto", 3);
    const admin = service.getAdminSnapshot();

    expect(profile.explorerLevel.level).toBeGreaterThanOrEqual(1);
    expect(profile.creatorLevel.level).toBeGreaterThanOrEqual(1);
    expect(history).toHaveLength(3);
    expect(admin.eventCount).toBeGreaterThanOrEqual(4);
    expect(admin.suppressionCounts.duplicate_dedupe_key).toBe(1);
  });
});
