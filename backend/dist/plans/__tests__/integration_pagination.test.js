import { describe, expect, it } from "vitest";
import { defaultConfig } from "../../config/schema.js";
import { CuratedProvider } from "../curated/curatedProvider.js";
import { DeterministicStubProvider } from "../providers/stubs/deterministicProvider.js";
import { ProviderRouter } from "../router/providerRouter.js";
const BASE_INPUT = {
    location: { lat: 40.7128, lng: -74.006 },
    radiusMeters: 6_000,
    limit: 20
};
function makeConfig(providerNames) {
    const cfg = defaultConfig("dev");
    cfg.plans.providers = Object.fromEntries(providerNames.map((name) => [
        name,
        {
            name,
            routing: { enabled: true },
            quota: { requestsPerMinute: 1000, burst: 1000 }
        }
    ]));
    return cfg;
}
describe("ProviderRouter integration pagination", () => {
    it("returns deterministic non-overlapping router pages", async () => {
        const providers = [
            new DeterministicStubProvider({ provider: "stub_a", source: "stub_a", count: 120, overlapRate: 0 }),
            new DeterministicStubProvider({ provider: "stub_b", source: "stub_b", count: 120, overlapRate: 0 }),
            new DeterministicStubProvider({ provider: "stub_c", source: "stub_c", count: 120, overlapRate: 0 }),
            new DeterministicStubProvider({ provider: "stub_d", source: "stub_d", count: 120, overlapRate: 0 }),
            new CuratedProvider({ maxTemplates: 10, maxSuggestions: 0 })
        ];
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers,
            config: makeConfig(providers.map((provider) => provider.name)),
            includeDebug: true,
            allowPartial: true,
            cache: { enabled: true, ttlMs: 60_000 },
            neverEmpty: { enabled: true, minResults: 25, hardMinResults: 10 }
        });
        const page1 = await router.search(BASE_INPUT, { sessionId: "paging-session" });
        const page2 = await router.search({ ...BASE_INPUT, cursor: page1.nextCursor ?? null }, { sessionId: "paging-session" });
        expect(page1.plans).toHaveLength(20);
        expect(page2.plans).toHaveLength(20);
        const page1Ids = new Set(page1.plans.map((plan) => plan.id));
        const overlap = page2.plans.filter((plan) => page1Ids.has(plan.id));
        expect(overlap).toHaveLength(0);
        const replayPage2 = await router.search({ ...BASE_INPUT, cursor: page1.nextCursor ?? null }, { sessionId: "paging-session" });
        expect(replayPage2.plans.map((plan) => plan.id)).toEqual(page2.plans.map((plan) => plan.id));
        let cursor = page2.nextCursor ?? null;
        let pages = 2;
        while (cursor && pages < 10) {
            const page = await router.search({ ...BASE_INPUT, cursor }, { sessionId: "paging-session" });
            cursor = page.nextCursor ?? null;
            pages += 1;
        }
        expect(cursor).toBeNull();
    });
});
