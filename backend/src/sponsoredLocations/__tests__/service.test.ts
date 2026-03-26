import { describe, expect, it } from "vitest";

import { MemorySponsoredLocationStore } from "../memoryStore.js";
import { SponsoredLocationsService } from "../service.js";

function setup() {
  const placeCoordinates = () => ({ lat: 40, lng: -88 });
  return new SponsoredLocationsService(new MemorySponsoredLocationStore(), { platformFeeBps: 1000, placeCoordinates });
}

describe("SponsoredLocationsService", () => {
  it("creates funds and pays claim", async () => {
    const service = setup();
    const { campaign } = service.createCampaign({
      businessId: "biz_1",
      createdBy: "u_biz",
      placeId: "place_1",
      title: "Coffee boost",
      placements: ["map", "nearby"],
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      dailyBudgetDryad: 100,
      totalBudgetDryad: 500,
      rewardRule: { payoutPerVisitDryad: 15, dwellSeconds: 30, requiredActions: ["check_in", "dwell"] }
    });

    const budget = service.fundCampaign({ campaignId: campaign.id, businessId: "biz_1", amountDryad: 100 });
    expect(budget.rewardPoolAtomic).toBeGreaterThan(0n);

    const visit = service.startVisitSession({ userId: "u1", campaignId: campaign.id, lat: 40, lng: -88 });
    service.heartbeatVisit({ visitSessionId: visit.id, lat: 40.00001, lng: -87.9999, elapsedSeconds: 45 });
    const decision = service.verifyVisit({ visitSessionId: visit.id, actions: ["check_in", "dwell"] });
    expect(decision.eligible).toBe(true);

    const claim = await service.claimReward({ visitSessionId: visit.id, userId: "u1" });
    expect(["reserved", "paid"]).toContain(claim.status);
  });

  it("rejects low dwell verification", () => {
    const service = setup();
    const { campaign } = service.createCampaign({
      businessId: "biz_1",
      createdBy: "u_biz",
      placeId: "place_1",
      title: "Coffee boost",
      placements: ["map"],
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      dailyBudgetDryad: 100,
      totalBudgetDryad: 500,
      rewardRule: { payoutPerVisitDryad: 15, dwellSeconds: 300, requiredActions: ["check_in", "dwell"] }
    });
    service.fundCampaign({ campaignId: campaign.id, businessId: "biz_1", amountDryad: 100 });

    const visit = service.startVisitSession({ userId: "u1", campaignId: campaign.id, lat: 40, lng: -88 });
    service.heartbeatVisit({ visitSessionId: visit.id, lat: 40, lng: -88, elapsedSeconds: 10 });
    const decision = service.verifyVisit({ visitSessionId: visit.id, actions: ["check_in", "dwell"] });

    expect(decision.eligible).toBe(false);
    expect(decision.rejectionReasons).toContain("insufficient_dwell_time");
  });
});
