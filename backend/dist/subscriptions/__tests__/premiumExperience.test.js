import { describe, expect, it } from "vitest";
import { DevBillingProvider } from "../billing/provider.js";
import { PremiumExperienceService } from "../premiumExperience.js";
import { SubscriptionService } from "../service.js";
import { SubscriptionTargetType } from "../types.js";
import { MemoryUsageStore } from "../usage.js";
function makeService() {
    const subscriptions = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    subscriptions.ensureAccount("free-user", SubscriptionTargetType.USER);
    subscriptions.ensureAccount("plus-user", SubscriptionTargetType.USER);
    subscriptions.ensureAccount("elite-user", SubscriptionTargetType.USER);
    return { subscriptions, premium: new PremiumExperienceService(subscriptions) };
}
describe("PremiumExperienceService", () => {
    it("derives ad behavior by tier", async () => {
        const { subscriptions, premium } = makeService();
        await subscriptions.startSubscriptionChange("plus-user", "user-plus");
        await subscriptions.startSubscriptionChange("elite-user", "user-pro");
        expect(premium.adTierForUser("free-user")).toBe("standard");
        expect(premium.adTierForUser("plus-user")).toBe("reduced");
        expect(premium.adTierForUser("elite-user")).toBe("none");
        expect(premium.shouldShowAdsForPlacement("elite-user", "results")).toBe(false);
    });
    it("returns quota and module expansion for premium tiers", async () => {
        const { subscriptions, premium } = makeService();
        await subscriptions.startSubscriptionChange("plus-user", "user-plus");
        expect(premium.getQuotaForFeature("plus-user", "custom_lists")).toBeGreaterThan(premium.getQuotaForFeature("free-user", "custom_lists"));
        expect(premium.getPremiumDiscoveryModules("free-user")).toHaveLength(0);
        expect(premium.getPremiumDiscoveryModules("plus-user")).toContain("premium_hidden_gems");
    });
    it("enforces ad placement allowlist and safe fallback", async () => {
        const { subscriptions, premium } = makeService();
        await subscriptions.startSubscriptionChange("plus-user", "user-plus");
        await subscriptions.startSubscriptionChange("elite-user", "user-pro");
        expect(premium.shouldShowAdsForPlacement("free-user", "detail")).toBe(true);
        expect(premium.shouldShowAdsForPlacement("plus-user", "detail")).toBe(false);
        expect(premium.shouldShowAdsForPlacement("elite-user", "results")).toBe(false);
        expect(premium.shouldShowAdsForPlacement("free-user", "unknown-surface")).toBe(false);
    });
});
