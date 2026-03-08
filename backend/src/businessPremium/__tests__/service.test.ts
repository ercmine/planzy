import { describe, expect, it } from "vitest";

import { MemoryBusinessPremiumStore } from "../memoryStore.js";
import { BusinessPremiumService } from "../service.js";

describe("BusinessPremiumService", () => {
  it("resolves tier entitlements and helper checks", async () => {
    const service = new BusinessPremiumService(new MemoryBusinessPremiumStore());
    await service.setBusinessTier("b1", "pro");

    expect(await service.getBusinessTier("b1")).toBe("pro");
    expect(await service.canAccessAdvancedBusinessAnalytics("b1")).toBe(true);
    expect(await service.canUseFeaturedPlacement("b1")).toBe(true);
    expect(await service.canManageMultipleLocations("b1")).toBe(false);
    expect(await service.getBusinessQuota("b1", "maxLocations")).toBe(3);
  });

  it("enforces featured placement policy and location limits", async () => {
    const service = new BusinessPremiumService(new MemoryBusinessPremiumStore());
    await service.setBusinessTier("b1", "pro");

    await service.upsertBusinessLocation({ businessId: "b1", locationId: "p1", role: "primary", healthScore: 95, completenessScore: 90 });
    await service.upsertBusinessLocation({ businessId: "b1", locationId: "p2", role: "managed", healthScore: 88, completenessScore: 82 });
    await service.upsertBusinessLocation({ businessId: "b1", locationId: "p3", role: "managed", healthScore: 80, completenessScore: 78 });
    await expect(service.upsertBusinessLocation({ businessId: "b1", locationId: "p4", role: "managed", healthScore: 80, completenessScore: 70 })).rejects.toThrowError("MULTI_LOCATION_LIMIT_REACHED");

    const settings = await service.updateBusinessFeaturedPlacementSettings({
      businessId: "b1",
      placeId: "p1",
      eligible: true,
      enabled: true,
      label: "sponsored",
      assetContentIds: ["asset-1"],
      targetCities: ["austin"],
      targetCategories: ["coffee"],
      linkedCampaignId: undefined,
      scheduledStartAt: "2026-03-08T00:00:00.000Z",
      scheduledEndAt: "2026-03-31T00:00:00.000Z",
      dailyBudgetCap: 120
    });

    expect(settings.enabled).toBe(true);
  });

  it("supports campaign lifecycle transitions", async () => {
    const service = new BusinessPremiumService(new MemoryBusinessPremiumStore());
    await service.setBusinessTier("b1", "elite");

    const campaign = await service.createBusinessCampaign({
      businessId: "b1",
      name: "Spring push",
      status: "draft",
      objective: "seasonal_promotion",
      targetLocationIds: [],
      targetCities: ["austin"],
      targetCategories: ["food"],
      linkedCreatorIds: [],
      linkedFeaturedPlacementIds: [],
      createdByUserId: "owner-1"
    });

    const active = await service.transitionBusinessCampaign(campaign.id, "active");
    const paused = await service.transitionBusinessCampaign(campaign.id, "paused");

    expect(active.status).toBe("active");
    expect(paused.status).toBe("paused");
  });
});
