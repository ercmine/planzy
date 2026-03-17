import { describe, expect, it } from "vitest";

import { CreatorGamificationService } from "../service.js";

describe("CreatorGamificationService", () => {
  it("builds publishing streaks and applies break/recovery behavior", () => {
    const service = new CreatorGamificationService();

    service.recordPublish({ creatorId: "c-streak", videoId: "v1", canonicalPlaceId: "p1", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.8, engagementScore: 0.8, occurredAt: new Date("2026-01-01T12:00:00Z") });
    service.recordPublish({ creatorId: "c-streak", videoId: "v2", canonicalPlaceId: "p2", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.8, engagementScore: 0.8, occurredAt: new Date("2026-01-02T12:00:00Z") });
    const recovered = service.recordPublish({ creatorId: "c-streak", videoId: "v3", canonicalPlaceId: "p3", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.8, engagementScore: 0.8, occurredAt: new Date("2026-01-04T12:00:00Z") });

    expect(recovered.profile.streaks.dailyCount).toBe(3);

    const reset = service.recordPublish({ creatorId: "c-streak", videoId: "v4", canonicalPlaceId: "p4", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.8, engagementScore: 0.8, occurredAt: new Date("2026-01-10T12:00:00Z") });
    expect(reset.profile.streaks.dailyCount).toBe(1);
  });

  it("gates low-quality and moderated content and tracks anti-spam suppression", () => {
    const service = new CreatorGamificationService({ repeatedPlaceCooldownDays: 10 });

    const lowQuality = service.recordPublish({ creatorId: "c-spam", videoId: "v0", canonicalPlaceId: "p1", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.2, engagementScore: 0.8 });
    const firstGood = service.recordPublish({ creatorId: "c-spam", videoId: "v1", canonicalPlaceId: "p1", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.9, engagementScore: 0.7, occurredAt: new Date("2026-02-01T12:00:00Z") });
    const repeated = service.recordPublish({ creatorId: "c-spam", videoId: "v2", canonicalPlaceId: "p1", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.9, engagementScore: 0.7, occurredAt: new Date("2026-02-04T12:00:00Z") });
    const moderated = service.recordPublish({ creatorId: "c-spam", videoId: "v3", canonicalPlaceId: "p3", cityId: "minneapolis", categoryIds: ["coffee"], qualityScore: 0.9, engagementScore: 0.7, moderationState: "removed" });

    expect(lowQuality.suppressionReason).toBe("quality_gate");
    expect(firstGood.qualifies).toBe(true);
    expect(repeated.suppressionReason).toBe("repeat_place_cooldown");
    expect(moderated.suppressionReason).toBe("moderation_blocked");
  });

  it("unlocks quality, trusted, city/category/district milestones and prestige showcases", () => {
    const service = new CreatorGamificationService();

    for (let i = 0; i < 25; i += 1) {
      service.recordPublish({
        creatorId: "c-pro",
        videoId: `v-${i}`,
        canonicalPlaceId: `place-${i}`,
        cityId: "minneapolis",
        neighborhoodId: `n-${i % 6}`,
        districtId: "nightlife_downtown",
        categoryIds: ["coffee"],
        trustTier: "high",
        qualityScore: 0.95,
        engagementScore: 0.9,
        trustedSignals: { helpfulSaves: 2, verifiedCompletes: 1 },
        occurredAt: new Date(`2026-03-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`)
      });
    }

    const summary = service.getSummary("c-pro");
    const completed = summary.profile.milestones.filter((item) => item.completedAt).map((item) => item.milestoneId);

    expect(completed).toEqual(expect.arrayContaining([
      "creator_quality_10",
      "creator_quality_25",
      "trusted_reviewer_20",
      "city_minneapolis_10_places",
      "city_minneapolis_5_neighborhoods",
      "category_coffee_12",
      "district_nightlife_5"
    ]));

    expect(summary.profile.showcases.map((item) => item.showcaseId)).toEqual(expect.arrayContaining([
      "showcase_trusted_voice",
      "showcase_city_specialist",
      "showcase_quality_archivist"
    ]));
  });

  it("supports creator profile showcase featuring and admin analytics", () => {
    const service = new CreatorGamificationService();

    for (let i = 0; i < 12; i += 1) {
      service.recordPublish({
        creatorId: "c-admin",
        videoId: `v-${i}`,
        canonicalPlaceId: `place-${i}`,
        cityId: "minneapolis",
        neighborhoodId: `n-${i}`,
        categoryIds: ["coffee"],
        trustTier: "trusted",
        qualityScore: 0.9,
        engagementScore: 0.9,
        trustedSignals: { helpfulSaves: 1, verifiedCompletes: 0 },
        occurredAt: new Date(`2026-04-${String(i + 1).padStart(2, "0")}T12:00:00Z`)
      });
    }

    const featured = service.featureShowcases("c-admin", ["showcase_city_specialist", "showcase_trusted_voice"]);
    expect(featured.showcases.filter((item) => item.featured)).toHaveLength(1);
    expect(featured.showcases.find((item) => item.showcaseId === "showcase_city_specialist")?.featured).toBe(true);

    const admin = service.getAdminSnapshot();
    expect(admin.milestoneCompletionCounts.city_minneapolis_10_places).toBeGreaterThanOrEqual(1);
  });
});
