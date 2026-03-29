import { describe, expect, it } from "vitest";
import { MemoryCreatorStore } from "../../creator/memoryStore.js";
import { FeatureQuotaEngine } from "../../subscriptions/accessEngine.js";
import { DevBillingProvider } from "../../subscriptions/billing/provider.js";
import { SubscriptionService } from "../../subscriptions/service.js";
import { SubscriptionTargetType } from "../../subscriptions/types.js";
import { MemoryUsageStore } from "../../subscriptions/usage.js";
import { OutingPlannerService } from "../service.js";
import { MemoryOutingPlannerStore } from "../store.js";
function buildService(places) {
    const subscriptions = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
    const access = new FeatureQuotaEngine(subscriptions);
    const creatorStore = new MemoryCreatorStore();
    subscriptions.ensureAccount("u1", SubscriptionTargetType.USER);
    access.addOverride({
        targetType: SubscriptionTargetType.USER,
        targetId: "u1",
        grantedFeatures: ["ai.trip_assistant"],
        quotaOverrides: {
            "quota.ai.requests_per_day": 50,
            "quota.ai.requests_per_month": 500,
            "quota.lists.saved_lists": 20
        }
    });
    return new OutingPlannerService({
        listPlaces: async () => places,
        creatorStore,
        store: new MemoryOutingPlannerStore(),
        subscriptions,
        access
    });
}
const places = [
    {
        canonicalPlaceId: "p1",
        name: "Morning Roast",
        primaryCategory: "coffee",
        secondaryCategories: ["cafe"],
        city: "Austin",
        neighborhood: "Downtown",
        lat: 30,
        lng: -97,
        imageUrls: ["https://img/1.jpg"],
        sourceAttribution: ["verified_business"],
        qualityScore: 0.9,
        popularityScore: 0.7,
        trendingScore: 0.5,
        keywords: ["coffee"],
        updatedAt: new Date().toISOString(),
        moderationState: "active",
        openNow: true
    },
    {
        canonicalPlaceId: "p2",
        name: "City Museum",
        primaryCategory: "museum",
        secondaryCategories: ["art"],
        city: "Austin",
        neighborhood: "Downtown",
        lat: 30.1,
        lng: -97.1,
        imageUrls: ["https://img/2.jpg"],
        sourceAttribution: ["trusted_source"],
        qualityScore: 0.85,
        popularityScore: 0.6,
        trendingScore: 0.4,
        keywords: ["museum"],
        updatedAt: new Date().toISOString(),
        moderationState: "active"
    },
    {
        canonicalPlaceId: "p3",
        name: "Suppressed Place",
        primaryCategory: "food",
        secondaryCategories: [],
        city: "Austin",
        lat: 30,
        lng: -97,
        imageUrls: [],
        sourceAttribution: ["source"],
        qualityScore: 1,
        popularityScore: 1,
        trendingScore: 1,
        keywords: ["food"],
        updatedAt: new Date().toISOString(),
        moderationState: "suppressed"
    }
];
describe("OutingPlannerService", () => {
    it("creates and saves a structured itinerary", async () => {
        const service = buildService(places);
        const generated = await service.createOutingPlan("u1", { prompt: "coffee and culture", city: "Austin" });
        expect(generated.stops.length).toBeGreaterThan(0);
        expect(generated.stops.some((stop) => stop.placeId === "p3")).toBe(false);
        const saved = await service.saveOutingPlan("u1", generated);
        expect("error" in saved).toBe(false);
        if ("error" in saved)
            return;
        const listed = await service.listSavedItineraries("u1");
        expect(listed).toHaveLength(1);
        const loaded = await service.getSavedItinerary("u1", saved.saved.id);
        expect(loaded.activeRevision?.generated.id).toBe(generated.id);
    });
    it("regenerates and creates a new revision", async () => {
        const service = buildService(places);
        const generated = await service.createOutingPlan("u1", { city: "Austin", prompt: "day outing" });
        const saved = await service.saveOutingPlan("u1", generated);
        if ("error" in saved)
            throw new Error("save should succeed");
        const regenerated = await service.regenerateItinerary("u1", {
            itineraryId: saved.saved.id,
            promptDelta: "make it trendier"
        });
        expect("error" in regenerated).toBe(false);
        if ("error" in regenerated)
            return;
        expect(regenerated.revision.revisionNumber).toBe(2);
    });
});
