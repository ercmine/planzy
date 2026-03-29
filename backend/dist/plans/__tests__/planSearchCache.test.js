import { describe, expect, it } from "vitest";
import { MemoryCache } from "../cache/memoryCache.js";
import { PlanSearchCache } from "../cache/planSearchCache.js";
function makePlan(id, category = "food") {
    return {
        id,
        source: "test",
        sourceId: id,
        title: `Plan ${id}`,
        category,
        location: { lat: 44.972, lng: -93.283 }
    };
}
describe("PlanSearchCache", () => {
    const baseInput = {
        location: { lat: 44.9723, lng: -93.2831 },
        radiusMeters: 5_000,
        categories: ["food"],
        limit: 10
    };
    it("returns hit for equivalent inputs and miss for differing categories", () => {
        const cache = new PlanSearchCache();
        const plans = [makePlan("a", "food")];
        cache.set(baseInput, undefined, plans);
        expect(cache.get(baseInput)).toEqual(plans);
        expect(cache.get({ ...baseInput, categories: ["coffee"] })).toBeNull();
    });
    it("expires entries based on ttl using injected clock", () => {
        let now = 1_000;
        const memory = new MemoryCache({ pruneIntervalMs: 0 }, { now: () => now });
        const cache = new PlanSearchCache(memory, { ttlMs: 1_500 }, { now: () => now });
        cache.set(baseInput, undefined, [makePlan("b")], 1_500);
        expect(cache.get(baseInput)).not.toBeNull();
        now += 1_600;
        expect(cache.get(baseInput)).toBeNull();
    });
});
