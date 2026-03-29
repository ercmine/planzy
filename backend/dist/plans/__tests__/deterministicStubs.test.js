import { describe, expect, it } from "vitest";
import { dedupeAndMergePlans } from "../router/dedupeEngine.js";
import { rankPlansAdvanced } from "../router/rankingEngine.js";
import { DeterministicStubProvider } from "../providers/stubs/deterministicProvider.js";
const baseInput = {
    location: { lat: 37.7749, lng: -122.4194 },
    radiusMeters: 4000,
    categories: ["food", "coffee"],
    openNow: true,
    limit: 24
};
describe("deterministic stubs", () => {
    it("returns stable first page ids/titles for same input", async () => {
        const provider = new DeterministicStubProvider({
            provider: "google_stub",
            source: "google",
            count: 80,
            overlapKey: "overlap-v1",
            overlapRate: 0.3
        });
        const first = await provider.searchPlans(baseInput);
        const second = await provider.searchPlans(baseInput);
        expect(first.plans.map((plan) => plan.id)).toEqual(second.plans.map((plan) => plan.id));
        expect(first.plans.map((plan) => plan.title)).toEqual(second.plans.map((plan) => plan.title));
    });
    it("varies result ids for different geo/filter seeds", async () => {
        const provider = new DeterministicStubProvider({
            provider: "google_stub",
            source: "google",
            count: 80,
            overlapKey: "overlap-v1",
            overlapRate: 0.3
        });
        const near = await provider.searchPlans(baseInput);
        const far = await provider.searchPlans({
            ...baseInput,
            location: { lat: 34.0522, lng: -118.2437 }
        });
        const nearIds = new Set(near.plans.map((plan) => plan.id));
        const farIds = new Set(far.plans.map((plan) => plan.id));
        const overlapCount = [...nearIds].filter((id) => farIds.has(id)).length;
        const sharedRatio = overlapCount / Math.max(nearIds.size, 1);
        expect(sharedRatio).toBeLessThan(0.5);
    });
    it("creates cross-provider overlaps that dedupe can merge", async () => {
        const google = new DeterministicStubProvider({
            provider: "google_stub",
            source: "google",
            count: 100,
            overlapKey: "overlap-v1",
            overlapRate: 0.35
        });
        const yelp = new DeterministicStubProvider({
            provider: "yelp_stub",
            source: "yelp",
            count: 100,
            overlapKey: "overlap-v1",
            overlapRate: 0.35
        });
        const [googleResult, yelpResult] = await Promise.all([google.searchPlans(baseInput), yelp.searchPlans(baseInput)]);
        const combined = [...googleResult.plans, ...yelpResult.plans];
        const merged = dedupeAndMergePlans(combined);
        expect(merged.plans.length).toBeLessThan(combined.length);
    });
    it("is compatible with rankPlansAdvanced", async () => {
        const provider = new DeterministicStubProvider({
            provider: "ticketmaster_stub",
            source: "ticketmaster",
            count: 60,
            kind: "events",
            overlapRate: 0
        });
        const result = await provider.searchPlans({
            ...baseInput,
            categories: ["music"],
            openNow: undefined
        });
        const ranked = rankPlansAdvanced(result.plans, {
            input: baseInput,
            now: new Date("2026-03-01T12:00:00.000Z")
        });
        expect(ranked.plans).toHaveLength(result.plans.length);
        expect(ranked.plans.map((plan) => plan.id).slice().sort()).toEqual(result.plans.map((plan) => plan.id).slice().sort());
    });
});
