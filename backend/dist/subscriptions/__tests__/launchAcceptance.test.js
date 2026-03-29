import { describe, expect, it } from "vitest";
import { DevBillingProvider } from "../billing/provider.js";
import { PremiumExperienceService } from "../premiumExperience.js";
import { SubscriptionService } from "../service.js";
import { PlanTier, SubscriptionStatus, SubscriptionTargetType } from "../types.js";
import { MemoryUsageStore } from "../usage.js";
function setup() {
    const subscriptions = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    subscriptions.ensureAccount("launch-free", SubscriptionTargetType.USER);
    return { subscriptions, premium: new PremiumExperienceService(subscriptions) };
}
describe("launch subscription acceptance", () => {
    it("keeps free users locked and ad-supported until upgraded", async () => {
        const { subscriptions, premium } = setup();
        expect(premium.getPlanTier("launch-free")).toBe(PlanTier.FREE);
        expect(premium.shouldShowPremiumContent("launch-free", "plus")).toBe(false);
        expect(premium.shouldShowAdsForPlacement("launch-free", "results")).toBe(true);
        await subscriptions.startSubscriptionChange("launch-free", "user-pro");
        expect(premium.getPlanTier("launch-free")).toBe(PlanTier.ELITE);
        expect(premium.shouldShowPremiumContent("launch-free", "plus")).toBe(true);
        expect(premium.shouldShowAdsForPlacement("launch-free", "results")).toBe(false);
    });
    it("reflects trial, cancel-at-period-end, and immediate expiration behavior", async () => {
        const { subscriptions } = setup();
        const trial = subscriptions.startTrial("launch-free", "user-plus");
        expect(trial.status).toBe(SubscriptionStatus.TRIALING);
        expect(subscriptions.getCurrentSubscriptionSummary("launch-free").hasAccessNow).toBe(true);
        await subscriptions.cancelSubscription("launch-free");
        const activeUntilEnd = subscriptions.getCurrentSubscriptionSummary("launch-free");
        expect(activeUntilEnd.willCancelAtPeriodEnd).toBe(true);
        expect(activeUntilEnd.hasAccessNow).toBe(true);
        await subscriptions.cancelImmediately("launch-free");
        const expired = subscriptions.getCurrentSubscriptionSummary("launch-free");
        expect(expired.status).toBe(SubscriptionStatus.EXPIRED);
        expect(expired.hasAccessNow).toBe(false);
    });
    it("handles past_due/grace lifecycle without entitlement desync", () => {
        const { subscriptions, premium } = setup();
        subscriptions.compPlan("launch-free", "user-plus");
        expect(premium.adTierForUser("launch-free")).toBe("reduced");
        subscriptions.markPastDue("launch-free");
        expect(subscriptions.getSubscription("launch-free").status).toBe(SubscriptionStatus.PAST_DUE);
        subscriptions.enterGracePeriod("launch-free", 1);
        const inGrace = subscriptions.getSubscription("launch-free");
        expect([SubscriptionStatus.GRACE_PERIOD, SubscriptionStatus.EXPIRED]).toContain(inGrace.status);
        // Account should continue to resolve through subscription service without throwing.
        expect(subscriptions.getCurrentEntitlements("launch-free").planId.length).toBeGreaterThan(0);
    });
});
