import { describe, expect, it } from "vitest";
import { StubProvider } from "../stubProvider.js";
describe("StubProvider", () => {
    const provider = new StubProvider();
    it("returns plans within radius", async () => {
        const result = await provider.searchPlans({
            location: { lat: 37.775, lng: -122.418 },
            radiusMeters: 500,
            limit: 100
        });
        expect(result.plans.length).toBeGreaterThan(0);
        expect(result.plans.every((plan) => (plan.distanceMeters ?? 0) <= 500)).toBe(true);
        expect(result.plans.every((plan) => plan.id.startsWith("stub:"))).toBe(true);
    });
    it("filters by categories", async () => {
        const result = await provider.searchPlans({
            location: { lat: 37.775, lng: -122.418 },
            radiusMeters: 50000,
            categories: ["coffee"]
        });
        expect(result.plans.length).toBeGreaterThan(0);
        expect(result.plans.every((plan) => plan.category === "coffee")).toBe(true);
    });
    it("supports cursor pagination", async () => {
        const page1 = await provider.searchPlans({
            location: { lat: 37.775, lng: -122.418 },
            radiusMeters: 50000,
            limit: 3
        });
        const page2 = await provider.searchPlans({
            location: { lat: 37.775, lng: -122.418 },
            radiusMeters: 50000,
            limit: 3,
            cursor: page1.nextCursor ?? null
        });
        expect(page1.plans.length).toBe(3);
        expect(page2.plans.length).toBe(3);
        expect(page1.plans[0]?.id).not.toBe(page2.plans[0]?.id);
    });
    it("filters by openNow", async () => {
        const result = await provider.searchPlans({
            location: { lat: 37.775, lng: -122.418 },
            radiusMeters: 50000,
            openNow: true
        });
        expect(result.plans.length).toBeGreaterThan(0);
        expect(result.plans.every((plan) => plan.hours?.openNow === true)).toBe(true);
    });
    it("filters by priceLevelMax", async () => {
        const result = await provider.searchPlans({
            location: { lat: 37.775, lng: -122.418 },
            radiusMeters: 50000,
            priceLevelMax: 1
        });
        expect(result.plans.length).toBeGreaterThan(0);
        expect(result.plans.every((plan) => (plan.priceLevel ?? 0) <= 1)).toBe(true);
    });
});
