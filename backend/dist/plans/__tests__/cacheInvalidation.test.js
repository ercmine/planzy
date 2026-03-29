import { describe, expect, it } from "vitest";
import { geoCell } from "../cache/geoCell.js";
import { MemoryCache } from "../cache/memoryCache.js";
import { PlanSearchCache } from "../cache/planSearchCache.js";
function makePlan(id, category) {
    return {
        id,
        source: "test",
        sourceId: id,
        title: `Plan ${id}`,
        category,
        location: { lat: 44.972, lng: -93.283 }
    };
}
function baseInput(overrides = {}) {
    return {
        location: { lat: 44.9723, lng: -93.2831 },
        radiusMeters: 5_000,
        limit: 10,
        ...overrides
    };
}
describe("PlanSearchCache invalidation + memory bounds", () => {
    it("invalidates by category", () => {
        const cache = new PlanSearchCache();
        cache.set(baseInput({ categories: ["food"] }), undefined, [makePlan("f1", "food")]);
        cache.set(baseInput({ categories: ["coffee"] }), undefined, [makePlan("c1", "coffee")]);
        const removed = cache.invalidate({ category: "coffee" });
        expect(removed).toBe(1);
        expect(cache.get(baseInput({ categories: ["coffee"] }))).toBeNull();
        expect(cache.get(baseInput({ categories: ["food"] }))).not.toBeNull();
    });
    it("invalidates by session only for session scoped entries", () => {
        const cache = new PlanSearchCache();
        const input = baseInput({ categories: ["food"] });
        cache.set(input, { sessionId: "s1" }, [makePlan("s1", "food")]);
        cache.set(input, { sessionId: "s2" }, [makePlan("s2", "food")]);
        const removed = cache.invalidate({ sessionId: "s1" });
        expect(removed).toBe(1);
        expect(cache.get(input, { sessionId: "s1" })).toBeNull();
        expect(cache.get(input, { sessionId: "s2" })).not.toBeNull();
    });
    it("invalidates by provider tag", () => {
        const shared = new MemoryCache();
        const routerCache = new PlanSearchCache(shared, { providerName: "router" });
        const placesCache = new PlanSearchCache(shared, { providerName: "places" });
        const input = baseInput({ categories: ["food"] });
        routerCache.set(input, undefined, [makePlan("r", "food")]);
        placesCache.set(input, undefined, [makePlan("p", "food")]);
        expect(routerCache.invalidate({ provider: "router" })).toBe(1);
        expect(routerCache.get(input)).toBeNull();
        expect(placesCache.get(input)).not.toBeNull();
    });
    it("invalidates by coarser cell prefix tags", () => {
        const cache = new PlanSearchCache(undefined, { precision: 5 });
        const i1 = baseInput({ location: { lat: 44.97231, lng: -93.28311 } });
        const i2 = baseInput({ location: { lat: 44.97239, lng: -93.28319 } });
        cache.set(i1, undefined, [makePlan("a", "food")]);
        cache.set(i2, undefined, [makePlan("b", "food")]);
        const coarseCell = geoCell(44.97231, -93.28311, 3);
        const removed = cache.invalidate({ cellPrefix: coarseCell });
        expect(removed).toBeGreaterThanOrEqual(2);
        expect(cache.get(i1)).toBeNull();
        expect(cache.get(i2)).toBeNull();
    });
    it("evicts older entries when maxEntries is exceeded", () => {
        const memory = new MemoryCache({ maxEntries: 2, pruneIntervalMs: 0 });
        const cache = new PlanSearchCache(memory);
        const i1 = baseInput({ categories: ["food"] });
        const i2 = baseInput({ categories: ["coffee"] });
        const i3 = baseInput({ categories: ["movies"] });
        cache.set(i1, undefined, [makePlan("1", "food")]);
        cache.set(i2, undefined, [makePlan("2", "coffee")]);
        cache.set(i3, undefined, [makePlan("3", "movies")]);
        expect(cache.get(i1)).toBeNull();
        expect(cache.get(i2)).not.toBeNull();
        expect(cache.get(i3)).not.toBeNull();
    });
});
