import { describe, expect, it } from "vitest";

import { PLAN_CATALOG, getAvailablePlans } from "../catalog.js";
import { EntitlementPolicyService } from "../policy.js";
import { resolveEntitlements } from "../resolver.js";
import { SubscriptionService } from "../service.js";
import { MemoryUsageStore } from "../usage.js";
import { DevBillingProvider } from "../billing/provider.js";
import { AccountType, BillingInterval, PlanTier, ReasonCode, SubscriptionStatus, UsageWindow } from "../types.js";

describe("subscription scaffolding", () => {
  it("has at least one FREE plan per account type", () => {
    expect(getAvailablePlans(AccountType.USER).some((p) => p.tier === PlanTier.FREE)).toBe(true);
    expect(getAvailablePlans(AccountType.CREATOR).some((p) => p.tier === PlanTier.FREE)).toBe(true);
    expect(getAvailablePlans(AccountType.BUSINESS).some((p) => p.tier === PlanTier.FREE)).toBe(true);
    expect(PLAN_CATALOG.length).toBeGreaterThanOrEqual(9);
  });

  it("resolves grace-period entitlements while preserving overrides", () => {
    const resolved = resolveEntitlements({
      account: { id: "a1", accountType: AccountType.USER, billingStatus: SubscriptionStatus.EXPIRED, featureFlags: ["beta-ai-itinerary"] },
      subscription: { accountId: "a1", planId: "user-pro", status: SubscriptionStatus.EXPIRED, billingInterval: BillingInterval.MONTHLY, graceEndsAt: new Date(Date.now() + 1_000_000).toISOString() },
      overrides: [{ key: "max_saved_places", value: 77 }]
    });

    expect(resolved.values.ai_itinerary_generation).toBe(true);
    expect(resolved.values.max_saved_places).toBe(77);
    expect(resolved.sources.max_saved_places).toBe("override");
    expect(resolved.sources.priority_support).toBe("grace");
  });

  it("returns downgrade blockers when active usage exceeds target limits", async () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("creator-1", AccountType.CREATOR);
    await service.startSubscriptionChange("creator-1", "creator-elite");
    await service.recordUsage("creator-1", "creator_guides", UsageWindow.ACTIVE, 12);

    const preview = await service.previewPlanChange("creator-1", "creator-free");
    expect(preview.allowed).toBe(false);
    expect(preview.blockers.some((b) => b.metric === "creator_guides")).toBe(true);
  });

  it("rejects creator plan for user account type", async () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("user-1", AccountType.USER);
    const preview = await service.previewPlanChange("user-1", "creator-pro");
    expect(preview.allowed).toBe(false);
  });

  it("enforces quota exact-limit vs over-limit", async () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("u2", AccountType.USER);
    const policy = new EntitlementPolicyService(service);

    await service.recordUsage("u2", "text_reviews", UsageWindow.MONTHLY, 9);
    const allowed = await policy.checkQuota("u2", "text_reviews", 10);
    expect(allowed.allowed).toBe(true);

    await service.recordUsage("u2", "text_reviews", UsageWindow.MONTHLY, 1);
    const denied = await policy.checkQuota("u2", "text_reviews", 10);
    expect(denied.allowed).toBe(false);
    expect(denied.reasonCode).toBe(ReasonCode.PLAN_LIMIT_EXCEEDED);
  });

  it("returns permission denial reason for paid-only feature", async () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("u3", AccountType.USER);
    const policy = new EntitlementPolicyService(service);
    const decision = await policy.can("u3", "generate_ai_itinerary");
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe(ReasonCode.PLAN_REQUIRED);
  });
});
