import { describe, expect, it } from "vitest";

import { DevBillingProvider } from "../billing/provider.js";
import { FEATURE_KEYS, FeatureQuotaEngine, MemoryAccessUsageStore, QUOTA_KEYS } from "../accessEngine.js";
import { SubscriptionService } from "../service.js";
import { SubscriptionTargetType } from "../types.js";
import { MemoryUsageStore } from "../usage.js";

function makeEngine() {
  const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
  const engine = new FeatureQuotaEngine(service, new MemoryAccessUsageStore());
  return { service, engine };
}

describe("FeatureQuotaEngine", () => {
  it("resolves free defaults for user targets", async () => {
    const { service, engine } = makeEngine();
    service.ensureAccount("u1", SubscriptionTargetType.USER);

    const features = engine.resolveFeatureSet({ targetType: SubscriptionTargetType.USER, targetId: "u1" });
    expect(features.features[FEATURE_KEYS.REVIEWS_WRITE]).toBe(true);
    expect(features.features[FEATURE_KEYS.AI_TRIP_ASSISTANT]).toBe(false);

    const quota = await engine.checkQuotaAccess({ targetType: SubscriptionTargetType.USER, targetId: "u1" }, QUOTA_KEYS.AI_REQUESTS_PER_DAY, 1);
    expect(quota.allowed).toBe(true);
    expect(quota.limit).toBeGreaterThan(0);
  });

  it("maps paid plan features and quotas", async () => {
    const { service, engine } = makeEngine();
    service.ensureAccount("u2", SubscriptionTargetType.USER);
    await service.startSubscriptionChange("u2", "user-pro");

    const features = engine.resolveFeatureSet({ targetType: SubscriptionTargetType.USER, targetId: "u2" });
    expect(features.features[FEATURE_KEYS.AI_TRIP_ASSISTANT]).toBe(true);
    expect(features.features[FEATURE_KEYS.ADS_AD_FREE]).toBe(true);

    const limit = await engine.checkQuotaAccess({ targetType: SubscriptionTargetType.USER, targetId: "u2" }, QUOTA_KEYS.AI_REQUESTS_PER_MONTH, 500);
    expect(limit.allowed).toBe(true);
    expect(limit.limit).toBeGreaterThan(100);
  });

  it("keeps creator features scoped to creator targets", async () => {
    const { service, engine } = makeEngine();
    service.ensureAccount("u3", SubscriptionTargetType.USER);
    service.ensureAccount("c1", SubscriptionTargetType.CREATOR);

    const userFeatures = engine.resolveFeatureSet({ targetType: SubscriptionTargetType.USER, targetId: "u3" });
    const creatorFeatures = engine.resolveFeatureSet({ targetType: SubscriptionTargetType.CREATOR, targetId: "c1" });

    expect(userFeatures.features[FEATURE_KEYS.CREATOR_PROFILE_ENABLED]).toBe(false);
    expect(creatorFeatures.features[FEATURE_KEYS.CREATOR_PROFILE_ENABLED]).toBe(true);
  });

  it("increments usage and enforces monthly quotas", async () => {
    const { service, engine } = makeEngine();
    service.ensureAccount("u4", SubscriptionTargetType.USER);

    for (let i = 0; i < 2; i += 1) {
      const result = await engine.checkAndConsumeQuota({ targetType: SubscriptionTargetType.USER, targetId: "u4" }, QUOTA_KEYS.AI_REQUESTS_PER_DAY, 1, new Date("2026-01-01T12:00:00.000Z"));
      expect(result.allowed).toBe(true);
    }

    const denied = await engine.checkAndConsumeQuota({ targetType: SubscriptionTargetType.USER, targetId: "u4" }, QUOTA_KEYS.AI_REQUESTS_PER_DAY, 1, new Date("2026-01-01T13:00:00.000Z"));
    expect(denied.allowed).toBe(false);
    expect(denied.denialReason).toBe("ai_limit_reached");

    const nextDay = await engine.checkAndConsumeQuota({ targetType: SubscriptionTargetType.USER, targetId: "u4" }, QUOTA_KEYS.AI_REQUESTS_PER_DAY, 1, new Date("2026-01-02T01:00:00.000Z"));
    expect(nextDay.allowed).toBe(true);
  });

  it("applies overrides with hard disable precedence", async () => {
    const { service, engine } = makeEngine();
    service.ensureAccount("u5", SubscriptionTargetType.USER);

    engine.addOverride({
      targetType: SubscriptionTargetType.USER,
      targetId: "u5",
      grantedFeatures: [FEATURE_KEYS.AI_TRIP_ASSISTANT],
      hardDisabledFeatures: [FEATURE_KEYS.AI_TRIP_ASSISTANT],
      quotaOverrides: { [QUOTA_KEYS.LISTS_SAVED_LISTS]: 99 }
    });

    const feature = await engine.checkFeatureAccess({ targetType: SubscriptionTargetType.USER, targetId: "u5" }, FEATURE_KEYS.AI_TRIP_ASSISTANT);
    expect(feature.allowed).toBe(false);
    expect(feature.denialReason).toBe("admin_disabled");

    const quota = await engine.checkQuotaAccess({ targetType: SubscriptionTargetType.USER, targetId: "u5" }, QUOTA_KEYS.LISTS_SAVED_LISTS, 80);
    expect(quota.allowed).toBe(true);
    expect(quota.limit).toBe(99);
  });

  it("enforces premium content visibility and quota", async () => {
    const { service, engine } = makeEngine();
    service.ensureAccount("u6", SubscriptionTargetType.USER);

    const deniedPremium = await engine.checkPremiumContentAccess(
      { targetType: SubscriptionTargetType.USER, targetId: "u6" },
      { contentId: "premium", visibility: "premium" }
    );
    expect(deniedPremium.allowed).toBe(false);
    expect(deniedPremium.denialReason).toBe("premium_access_required");

    await service.startSubscriptionChange("u6", "user-pro");
    const allowedPremium = await engine.checkPremiumContentAccess(
      { targetType: SubscriptionTargetType.USER, targetId: "u6" },
      { contentId: "premium", visibility: "premium" }
    );
    expect(allowedPremium.allowed).toBe(true);

    const wrongType = await engine.checkPremiumContentAccess(
      { targetType: SubscriptionTargetType.USER, targetId: "u6" },
      { contentId: "biz", visibility: "business_only" }
    );
    expect(wrongType.allowed).toBe(false);
    expect(wrongType.denialReason).toBe("wrong_profile_type");
  });
});
