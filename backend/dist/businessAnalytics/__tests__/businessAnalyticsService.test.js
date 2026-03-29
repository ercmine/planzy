import { describe, expect, it } from "vitest";
import { MemoryBusinessAnalyticsStore } from "../store.js";
import { BusinessAnalyticsService } from "../service.js";
import { MemoryVenueClaimStore } from "../../venues/claims/memoryStore.js";
import { SubscriptionService } from "../../subscriptions/service.js";
import { MemoryUsageStore } from "../../subscriptions/usage.js";
import { DevBillingProvider } from "../../subscriptions/billing/provider.js";
import { FeatureQuotaEngine, MemoryAccessUsageStore } from "../../subscriptions/accessEngine.js";
import { SubscriptionTargetType } from "../../subscriptions/types.js";
async function seedOwnership(store, input) {
    const now = new Date().toISOString();
    await store.upsertOwnership({
        id: `${input.placeId}-ownership`,
        placeId: input.placeId,
        businessProfileId: input.businessProfileId,
        primaryUserId: input.userId,
        ownershipRole: "owner",
        verificationStatus: "verified",
        verificationLevel: "enhanced",
        verificationMethodSummary: ["document"],
        isPrimary: true,
        isActive: true,
        approvedAt: now,
        createdAt: now,
        updatedAt: now
    });
}
describe("BusinessAnalyticsService", () => {
    it("returns scoped analytics for verified business owner", async () => {
        const claimsStore = new MemoryVenueClaimStore();
        await seedOwnership(claimsStore, { placeId: "p1", businessProfileId: "b1", userId: "owner-1" });
        const subs = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
        subs.ensureAccount("b1", SubscriptionTargetType.BUSINESS);
        await subs.startSubscriptionChange("b1", "business-elite");
        const service = new BusinessAnalyticsService(new MemoryBusinessAnalyticsStore(), claimsStore, new FeatureQuotaEngine(subs, new MemoryAccessUsageStore()), undefined, () => new Date("2026-03-08T00:00:00.000Z"));
        await service.recordEvent({ eventType: "place_view", placeId: "p1", businessProfileId: "b1", occurredAt: "2026-03-07T10:00:00.000Z", sessionId: "s1" });
        await service.recordEvent({ eventType: "place_save", placeId: "p1", businessProfileId: "b1", occurredAt: "2026-03-07T10:01:00.000Z", sourceSurface: "creator:c1" });
        await service.recordEvent({ eventType: "outbound_click", placeId: "p1", businessProfileId: "b1", occurredAt: "2026-03-07T10:02:00.000Z", outboundTarget: "website" });
        await service.recordEvent({ eventType: "review_created", placeId: "p1", businessProfileId: "b1", occurredAt: "2026-03-07T10:03:00.000Z", rating: 5 });
        await service.recordEvent({ eventType: "creator_content_clickthrough", placeId: "p1", businessProfileId: "b1", occurredAt: "2026-03-07T10:04:00.000Z", creatorProfileId: "c1" });
        const dashboard = await service.getDashboard("owner-1", {
            businessProfileId: "b1",
            placeIds: ["p1"],
            from: "2026-03-01",
            to: "2026-03-08",
            compareFrom: "2026-02-22",
            compareTo: "2026-02-29"
        });
        expect(dashboard.kpis.views).toBe(1);
        expect(dashboard.kpis.saves).toBe(1);
        expect(dashboard.kpis.averageRating).toBe(5);
        expect(dashboard.timeSeries.length).toBeGreaterThan(0);
        expect(dashboard.creatorImpact[0]?.creatorProfileId).toBe("c1");
        expect(dashboard.entitlements.advancedAnalytics).toBe(true);
    });
    it("blocks non-owner access", async () => {
        const claimsStore = new MemoryVenueClaimStore();
        await seedOwnership(claimsStore, { placeId: "p1", businessProfileId: "b1", userId: "owner-1" });
        const subs = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
        subs.ensureAccount("b1", SubscriptionTargetType.BUSINESS);
        const service = new BusinessAnalyticsService(new MemoryBusinessAnalyticsStore(), claimsStore, new FeatureQuotaEngine(subs, new MemoryAccessUsageStore()));
        await expect(service.getDashboard("intruder", {
            businessProfileId: "b1",
            placeIds: ["p1"],
            from: "2026-03-01",
            to: "2026-03-08"
        })).rejects.toThrowError("ANALYTICS_ACCESS_DENIED");
    });
    it("locks advanced modules on free plans and emits upsell", async () => {
        const claimsStore = new MemoryVenueClaimStore();
        await seedOwnership(claimsStore, { placeId: "p1", businessProfileId: "b1", userId: "owner-1" });
        const subs = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
        subs.ensureAccount("b1", SubscriptionTargetType.BUSINESS);
        const service = new BusinessAnalyticsService(new MemoryBusinessAnalyticsStore(), claimsStore, new FeatureQuotaEngine(subs, new MemoryAccessUsageStore()), undefined, () => new Date("2026-03-08T00:00:00.000Z"));
        for (let i = 0; i < 101; i += 1) {
            await service.recordEvent({ eventType: "place_view", placeId: "p1", businessProfileId: "b1", occurredAt: "2026-03-07T10:00:00.000Z", sessionId: `s${i}` });
        }
        const dashboard = await service.getDashboard("owner-1", {
            businessProfileId: "b1",
            placeIds: ["p1", "p2"],
            from: "2025-01-01",
            to: "2026-03-08"
        });
        expect(dashboard.entitlements.advancedAnalytics).toBe(false);
        expect(dashboard.timeSeries).toHaveLength(0);
        expect(dashboard.scope.from).toBe("2026-02-07");
        expect(dashboard.upsell.some((u) => u.code === "HIGH_TRAFFIC_HISTORY_LOCKED")).toBe(true);
    });
});
