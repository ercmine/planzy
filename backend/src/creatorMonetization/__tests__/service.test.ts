import { describe, expect, it } from "vitest";

import { MemoryAccountsStore } from "../../accounts/memoryStore.js";
import { AccountsService } from "../../accounts/service.js";
import { MemoryCreatorStore } from "../../creator/memoryStore.js";
import { CreatorService } from "../../creator/service.js";
import { MemoryReviewsStore } from "../../reviews/memoryStore.js";
import { FeatureQuotaEngine, MemoryAccessUsageStore } from "../../subscriptions/accessEngine.js";
import { DevBillingProvider } from "../../subscriptions/billing/provider.js";
import { SubscriptionService } from "../../subscriptions/service.js";
import { MemoryUsageStore } from "../../subscriptions/usage.js";
import { MemoryCreatorMonetizationStore } from "../memoryStore.js";
import { CreatorMonetizationService } from "../service.js";

describe("creator monetization service", () => {
  function setup() {
    const accounts = new AccountsService(new MemoryAccountsStore());
    const creatorStore = new MemoryCreatorStore();
    const subscriptions = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    const accessEngine = new FeatureQuotaEngine(subscriptions, new MemoryAccessUsageStore());
    const monetization = new CreatorMonetizationService(new MemoryCreatorMonetizationStore(), accounts, subscriptions, creatorStore, accessEngine);
    const creatorService = new CreatorService(creatorStore, accounts, new MemoryReviewsStore(), subscriptions, accessEngine, monetization);
    return { accounts, creatorService, monetization, subscriptions };
  }

  it("blocks monetization until creator is verified and on monetization plan", async () => {
    const { accounts, creatorService, monetization, subscriptions } = setup();
    accounts.createCreatorProfile("u1", { creatorName: "Monetize Me" });
    creatorService.bootstrapFromAccounts("u1");
    const creator = await creatorService.createOrSyncCreatorProfile("u1", { displayName: "Monetize Me", slug: "monetize-me" });

    expect(monetization.evaluateEligibility(creator.id).eligible).toBe(false);
    subscriptions.ensureAccount(creator.id, "CREATOR" as never);
    await subscriptions.startSubscriptionChange(creator.id, "creator-elite");

    expect(monetization.evaluateEligibility(creator.id).eligible).toBe(true);
  });

  it("locks premium guides for viewers without entitlement", async () => {
    const { accounts, creatorService, monetization, subscriptions } = setup();
    accounts.createCreatorProfile("u2", { creatorName: "Guide Pro" });
    creatorService.bootstrapFromAccounts("u2");
    const creator = await creatorService.createOrSyncCreatorProfile("u2", { displayName: "Guide Pro", slug: "guide-pro" });
    await subscriptions.startSubscriptionChange(creator.id, "creator-elite");
    monetization.adminUpdateStatus("admin", creator.id, { status: "active" });
    monetization.updateSettings("u2", creator.id, { premiumContentEnabled: true });

    const guide = await creatorService.createGuide("u2", creator.id, { title: "Hidden", summary: "Secret", body: "full premium", status: "published", placeItems: [{ placeId: "x" }] as never });
    monetization.setGuidePremiumMode("u2", creator.id, guide.id, { mode: "premium", previewSummary: "preview" });

    const publicView = creatorService.getGuideBySlug("guide-pro", guide.slug, "viewer");
    expect(publicView.body).toBe("");
    expect(publicView.monetization?.previewSummary).toBe("preview");
  });
});
