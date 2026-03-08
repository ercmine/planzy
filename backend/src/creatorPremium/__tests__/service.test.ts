import { describe, expect, it } from "vitest";

import { CreatorProfileStatus, ProfileVisibility, VerificationStatus } from "../../accounts/types.js";
import { MemoryUsageStore } from "../../subscriptions/usage.js";
import { SubscriptionService } from "../../subscriptions/service.js";
import { DevBillingProvider } from "../../subscriptions/billing/provider.js";
import { SubscriptionTargetType } from "../../subscriptions/types.js";
import { MemoryCreatorPremiumStore } from "../memoryStore.js";
import { CreatorPremiumService } from "../service.js";
import { CREATOR_ENTITLEMENTS, CREATOR_QUOTAS } from "../types.js";

describe("CreatorPremiumService", () => {
  function buildService(planId: string) {
    const subscriptions = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    subscriptions.ensureAccount("cp-1", SubscriptionTargetType.CREATOR);
    subscriptions.compPlan("cp-1", planId);
    const service = new CreatorPremiumService(new MemoryCreatorPremiumStore(), subscriptions, {
      getCreatorProfile: () => ({
        id: "cp-1",
        userId: "user-1",
        creatorName: "Ava",
        displayName: "Ava",
        slug: "ava",
        tags: [],
        socialLinks: [],
        followerCount: 0,
        followingCount: 0,
        publicReviewsCount: 0,
        publicGuidesCount: 0,
        badges: [],
        status: CreatorProfileStatus.ACTIVE,
        isPublic: true,
        verificationStatus: VerificationStatus.UNVERIFIED,
        visibility: ProfileVisibility.PUBLIC,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
    return service;
  }

  it("computes tier and advanced analytics entitlement by subscription plan", () => {
    const standard = buildService("creator-free");
    expect(standard.getCreatorTier("cp-1")).toBe("standard");
    expect(standard.canAccessAdvancedCreatorAnalytics("cp-1")).toBe(false);

    const elite = buildService("creator-elite");
    expect(elite.getCreatorTier("cp-1")).toBe("elite");
    expect(elite.hasCreatorEntitlement("cp-1", CREATOR_ENTITLEMENTS.ANALYTICS_ADVANCED)).toBe(true);
  });

  it("enforces tier quotas and aggregates analytics", () => {
    const pro = buildService("creator-pro");
    const quota = pro.getCreatorQuota("cp-1", CREATOR_QUOTAS.VIDEOS_PER_MONTH);
    expect(quota.limit).toBeGreaterThan(10);

    pro.recordAnalyticsEvent({ creatorProfileId: "cp-1", eventType: "video_view", contentId: "v1", contentType: "video", city: "Austin", category: "Food", source: "feed", happenedAt: new Date().toISOString() });
    pro.recordAnalyticsEvent({ creatorProfileId: "cp-1", eventType: "video_complete", contentId: "v1", contentType: "video", city: "Austin", category: "Food", source: "feed", happenedAt: new Date().toISOString() });
    const overview = pro.getCreatorAnalyticsOverview("cp-1");
    expect(overview.videoViews).toBe(1);
    expect(overview.completionRate).toBe(1);
    expect(overview.topCities[0]).toMatchObject({ city: "Austin" });
  });

  it("blocks branding/monetization updates when entitlement missing", () => {
    const standard = buildService("creator-free");
    expect(() => standard.updateCreatorBranding("user-1", "cp-1", { tagline: "x" })).toThrow("CREATOR_ENTITLEMENT_REQUIRED");
    expect(() => standard.updateCreatorMonetizationSettings("user-1", "cp-1", { tipsEnabled: true })).toThrow("CREATOR_ENTITLEMENT_REQUIRED");
  });

  it("builds discoverability decisions with trust and premium constraints", () => {
    const elite = buildService("creator-elite");
    const blocked = elite.getCreatorDiscoverabilityEligibility("cp-1", { trustScore: 0.3, moderationHealthy: true, profileCompleteness: 0.9, relevanceScore: 0.9 });
    expect(blocked.eligible).toBe(false);

    const allowed = elite.getCreatorDiscoverabilityEligibility("cp-1", { trustScore: 0.9, moderationHealthy: true, profileCompleteness: 0.9, relevanceScore: 0.8 });
    expect(allowed.eligible).toBe(true);
    expect(allowed.candidatePools).toContain("premium_creator_shelf");
  });
});
