import { describe, expect, it } from "vitest";

import { PLAN_CATALOG, getAvailablePlans } from "../catalog.js";
import { EntitlementPolicyService } from "../policy.js";
import { resolveEntitlements } from "../resolver.js";
import { SubscriptionService } from "../service.js";
import { MemoryUsageStore } from "../usage.js";
import { DevBillingProvider } from "../billing/provider.js";
import { BillingProviderName, CancellationMode, PlanTier, RenewalStatus, ReasonCode, SubscriptionStatus, SubscriptionTargetType, UsageWindow } from "../types.js";

describe("billing domain", () => {
  it("has at least one FREE plan per target type", () => {
    expect(getAvailablePlans(SubscriptionTargetType.USER).some((p) => p.tier === PlanTier.FREE)).toBe(true);
    expect(getAvailablePlans(SubscriptionTargetType.CREATOR).some((p) => p.tier === PlanTier.FREE)).toBe(true);
    expect(getAvailablePlans(SubscriptionTargetType.BUSINESS).some((p) => p.tier === PlanTier.FREE)).toBe(true);
    expect(PLAN_CATALOG.length).toBeGreaterThanOrEqual(9);
  });

  it("resolves free fallback entitlements for expired paid subscriptions", () => {
    const resolved = resolveEntitlements({
      account: { id: "a1", accountType: SubscriptionTargetType.USER, billingStatus: SubscriptionStatus.EXPIRED, featureFlags: [] },
      subscription: {
        id: "sub1",
        targetType: SubscriptionTargetType.USER,
        targetId: "a1",
        planId: "user-pro",
        provider: BillingProviderName.INTERNAL,
        status: SubscriptionStatus.EXPIRED,
        renewalStatus: RenewalStatus.NON_RENEWING,
        cancellationMode: CancellationMode.NONE,
        startedAt: new Date().toISOString(),
        autoRenews: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    expect(resolved.values.ai_itinerary_generation).toBe(false);
    expect(resolved.sources.ai_itinerary_generation).toBe("fallback_free");
  });

  it("trial eligibility and once-only trial behavior", () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("u_trial", SubscriptionTargetType.USER);
    const eligible = service.canStartTrial({ type: SubscriptionTargetType.USER, id: "u_trial" }, "user-pro");
    expect(eligible.eligible).toBe(true);

    const trialSub = service.startTrial("u_trial", "user-pro");
    expect(trialSub.status).toBe(SubscriptionStatus.TRIALING);

    const ineligible = service.canStartTrial({ type: SubscriptionTargetType.USER, id: "u_trial" }, "user-pro");
    expect(ineligible.eligible).toBe(false);
    expect(ineligible.reasonCodes).toContain("already_used_trial");
  });

  it("cancel at period end preserves access but immediate cancel removes it", async () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("u_cancel", SubscriptionTargetType.USER);
    await service.startSubscriptionChange("u_cancel", "user-plus");

    await service.cancelSubscription("u_cancel");
    const scheduled = service.getCurrentSubscriptionSummary("u_cancel");
    expect(scheduled.willCancelAtPeriodEnd).toBe(true);
    expect(scheduled.hasAccessNow).toBe(true);

    await service.cancelImmediately("u_cancel");
    const immediate = service.getCurrentSubscriptionSummary("u_cancel");
    expect(immediate.status).toBe(SubscriptionStatus.EXPIRED);
    expect(immediate.hasAccessNow).toBe(false);
  });

  it("past due and grace transitions eventually expire", () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("u_due", SubscriptionTargetType.USER);
    service.compPlan("u_due", "user-plus");

    service.markPastDue("u_due");
    expect(service.getSubscription("u_due").status).toBe(SubscriptionStatus.PAST_DUE);

    service.enterGracePeriod("u_due", 0);
    const sub = service.getSubscription("u_due");
    expect([SubscriptionStatus.GRACE_PERIOD, SubscriptionStatus.EXPIRED]).toContain(sub.status);
  });

  it("enforces quota exact-limit vs over-limit", async () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("u2", SubscriptionTargetType.USER);
    const policy = new EntitlementPolicyService(service);

    await service.recordUsage("u2", "text_reviews", UsageWindow.MONTHLY, 9);
    const allowed = await policy.checkQuota("u2", "text_reviews", 10);
    expect(allowed.allowed).toBe(true);

    await service.recordUsage("u2", "text_reviews", UsageWindow.MONTHLY, 1);
    const denied = await policy.checkQuota("u2", "text_reviews", 10);
    expect(denied.allowed).toBe(false);
    expect(denied.reasonCode).toBe(ReasonCode.USAGE_LIMIT_REACHED);
  });

  it("creator plan entitlements do not unlock business action", async () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("creator-1", SubscriptionTargetType.CREATOR);
    await service.startSubscriptionChange("creator-1", "creator-elite");

    const policy = new EntitlementPolicyService(service);
    const decision = await policy.can("creator-1", "reply_business_review");
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe(ReasonCode.FEATURE_NOT_IN_PLAN);
  });

  it("legacy target without rows still resolves to free", () => {
    const service = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    service.ensureAccount("legacy-user", SubscriptionTargetType.USER);
    const summary = service.getCurrentSubscriptionSummary("legacy-user");
    expect(summary.planCode).toBe("user-free");
    expect(summary.hasAccessNow).toBe(true);
  });
});
