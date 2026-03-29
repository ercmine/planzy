import { describe, expect, it } from "vitest";
import { RateLimitError } from "../errors.js";
import { validatePlan } from "../planValidation.js";
import { applyNeverEmptyFallback } from "../router/fallback.js";
const INPUT = {
    location: { lat: 44.98, lng: -93.26 },
    radiusMeters: 4000,
    limit: 50
};
function makePlan(id, source, category = "movies") {
    return validatePlan({
        id,
        source,
        sourceId: id.split(":").at(-1) ?? id,
        title: id,
        category,
        location: { lat: 44.98, lng: -93.26, address: "123 Main St" }
    });
}
class ArrayProvider {
    name;
    plans;
    calls = 0;
    seenCategories;
    constructor(name, plans) {
        this.name = name;
        this.plans = plans;
    }
    async searchPlans(input, _ctx) {
        this.calls += 1;
        this.seenCategories = input.categories;
        return { plans: this.plans, source: this.name, nextCursor: null };
    }
}
class ThrowingProvider {
    name;
    error;
    calls = 0;
    constructor(name, error) {
        this.name = name;
        this.error = error;
    }
    async searchPlans() {
        this.calls += 1;
        throw this.error;
    }
}
describe("never-empty fallback logic", () => {
    it("triggers on empty base with provider errors and backfills to min", async () => {
        const byo = new ArrayProvider("byo", [makePlan("byo:1", "byo"), makePlan("byo:2", "byo")]);
        const curated = new ArrayProvider("curated", Array.from({ length: 30 }, (_, i) => makePlan(`curated:${i + 1}`, "curated", i % 2 === 0 ? "movies" : "food")));
        const result = await applyNeverEmptyFallback({
            input: INPUT,
            basePlans: [],
            providers: [byo, curated],
            providerErrors: [{ provider: "places", error: new RateLimitError("places") }],
            opts: { minResults: 25, maxBackfill: 30, includeDebug: true }
        });
        expect(result.plans.length).toBeGreaterThanOrEqual(25);
        expect(result.debug?.triggered).toBe(true);
    });
    it("triggers on too few base plans and appends backfill", async () => {
        const basePlans = [makePlan("base:1", "places"), makePlan("base:2", "places"), makePlan("base:3", "places")];
        const byo = new ArrayProvider("byo", [makePlan("byo:1", "byo")]);
        const curated = new ArrayProvider("curated", [makePlan("curated:1", "curated"), makePlan("curated:2", "curated")]);
        const result = await applyNeverEmptyFallback({
            input: INPUT,
            basePlans,
            providers: [byo, curated],
            providerErrors: [],
            opts: { minResults: 8, includeDebug: true }
        });
        expect(result.debug?.reason).toBe("too_few");
        expect(result.plans.length).toBeGreaterThan(basePlans.length);
    });
    it("dedupes backfill ids already present in base", async () => {
        const basePlans = [makePlan("byo:1", "places"), makePlan("curated:1", "places")];
        const byo = new ArrayProvider("byo", [makePlan("byo:1", "byo"), makePlan("byo:2", "byo")]);
        const curated = new ArrayProvider("curated", [makePlan("curated:1", "curated"), makePlan("curated:2", "curated")]);
        const result = await applyNeverEmptyFallback({
            input: INPUT,
            basePlans,
            providers: [byo, curated],
            providerErrors: [],
            opts: { minResults: 5 }
        });
        const ids = result.plans.map((plan) => plan.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
    it("respects preferByoFirst ordering", async () => {
        const byo = new ArrayProvider("byo", [makePlan("byo:1", "byo"), makePlan("byo:2", "byo")]);
        const curated = new ArrayProvider("curated", [makePlan("curated:1", "curated"), makePlan("curated:2", "curated")]);
        const result = await applyNeverEmptyFallback({
            input: INPUT,
            basePlans: [],
            providers: [byo, curated],
            providerErrors: [],
            opts: { minResults: 4, preferByoFirst: true }
        });
        expect(result.plans.map((plan) => plan.id).slice(0, 4)).toEqual(["byo:1", "byo:2", "curated:1", "curated:2"]);
    });
    it("rethrows aborted context without fallback attempts", async () => {
        const controller = new AbortController();
        controller.abort("cancelled");
        const byo = new ArrayProvider("byo", [makePlan("byo:1", "byo")]);
        const curated = new ArrayProvider("curated", [makePlan("curated:1", "curated")]);
        await expect(applyNeverEmptyFallback({
            input: INPUT,
            ctx: { signal: controller.signal },
            basePlans: [],
            providers: [byo, curated],
            providerErrors: [],
            opts: { includeDebug: true }
        })).rejects.toMatchObject({ code: "ABORTED" });
        expect(byo.calls).toBe(0);
        expect(curated.calls).toBe(0);
    });
    it("passes categories through and tolerates partial fallback failures", async () => {
        const byo = new ThrowingProvider("byo", new Error("BYO down"));
        const curated = new ArrayProvider("curated", [makePlan("curated:movies", "curated", "movies"), makePlan("curated:food", "curated", "food")]);
        const result = await applyNeverEmptyFallback({
            input: { ...INPUT, categories: ["movies"] },
            basePlans: [],
            providers: [byo, curated],
            providerErrors: [],
            opts: { includeDebug: true }
        });
        expect(curated.seenCategories).toEqual(["movies"]);
        expect(result.debug?.errors.some((entry) => entry.provider === "byo")).toBe(true);
        expect(result.plans.length).toBeGreaterThan(0);
        expect(result.plans.some((plan) => plan.category === "movies")).toBe(true);
    });
});
