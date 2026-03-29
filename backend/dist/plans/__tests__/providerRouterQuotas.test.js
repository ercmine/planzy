import { describe, expect, it } from "vitest";
import { defaultConfig } from "../../config/schema.js";
import { ProviderRouter } from "../router/providerRouter.js";
import { QuotaManager } from "../router/quotas/quotaManager.js";
class CountingProvider {
    name;
    plans;
    calls = 0;
    constructor(name, plans) {
        this.name = name;
        this.plans = plans;
    }
    async searchPlans(_input, _ctx) {
        this.calls += 1;
        return {
            plans: this.plans,
            source: this.name,
            nextCursor: null,
            debug: { tookMs: 0, returned: this.plans.length }
        };
    }
}
function mkPlan(id, source) {
    return {
        id,
        source,
        sourceId: id,
        title: id,
        category: "food",
        location: { lat: 37.775, lng: -122.418 }
    };
}
function makeConfig() {
    const cfg = defaultConfig("dev");
    cfg.plans.providers = {
        p1: { name: "p1", quota: { requestsPerMinute: 1 }, routing: { enabled: true } },
        p2: { name: "p2", quota: { requestsPerMinute: 100 }, routing: { enabled: true } },
        curated: { name: "curated", quota: { requestsPerMinute: 100 }, routing: { enabled: true } },
        byo: { name: "byo", quota: { requestsPerMinute: 100 }, routing: { enabled: true } }
    };
    return cfg;
}
describe("ProviderRouter quota integration", () => {
    const input = {
        location: { lat: 37.775, lng: -122.418 },
        radiusMeters: 5_000,
        limit: 10
    };
    it("skips quota-denied providers when allowPartial=true and records debug", async () => {
        let nowMs = 0;
        const quotaManager = new QuotaManager({ now: () => nowMs });
        const p1 = new CountingProvider("p1", [mkPlan("p1-a", "p1")]);
        const p2 = new CountingProvider("p2", [mkPlan("p2-a", "p2")]);
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers: [p1, p2],
            config: makeConfig(),
            quotaManager,
            includeDebug: true,
            allowPartial: true,
            cache: { enabled: false }
        });
        const first = await router.search(input);
        expect(first.plans.map((p) => p.source).sort()).toEqual(["p1", "p2"]);
        const second = await router.search(input);
        expect(second.plans.map((p) => p.source)).toEqual(["p2"]);
        expect(second.debug?.calls.find((c) => c.provider === "p1")?.error?.code).toBe("QUOTA_DENIED");
        expect(second.debug?.calls.find((c) => c.provider === "p1")?.error?.retryAfterMs).toBeGreaterThan(0);
        expect(p1.calls).toBe(1);
        expect(p2.calls).toBe(2);
    });
    it("throws when allowPartial=false on quota denial", async () => {
        const quotaManager = new QuotaManager({ now: () => 0 });
        const p1 = new CountingProvider("p1", [mkPlan("p1-a", "p1")]);
        const p2 = new CountingProvider("p2", [mkPlan("p2-a", "p2")]);
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers: [p1, p2],
            config: makeConfig(),
            quotaManager,
            includeDebug: true,
            allowPartial: false,
            cache: { enabled: false }
        });
        await router.search(input);
        await expect(router.search(input)).rejects.toThrow("Provider fanout failed");
    });
    it("triggers never-empty fallback when all primary providers are quota-denied", async () => {
        const quotaManager = new QuotaManager({ now: () => 0 });
        const p1 = new CountingProvider("p1", [mkPlan("p1-a", "p1")]);
        const p2 = new CountingProvider("p2", [mkPlan("p2-a", "p2")]);
        const curated = new CountingProvider("curated", [mkPlan("curated-a", "curated")]);
        const byo = new CountingProvider("byo", [mkPlan("byo-a", "byo")]);
        const cfg = makeConfig();
        cfg.plans.providers.p1.quota = { requestsPerMinute: 1 };
        cfg.plans.providers.p2.quota = { requestsPerMinute: 1 };
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers: [p1, p2, curated, byo],
            config: cfg,
            quotaManager,
            includeDebug: true,
            allowPartial: true,
            cache: { enabled: false }
        });
        await router.search(input);
        const second = await router.search(input);
        expect(second.plans.length).toBeGreaterThan(0);
        expect(second.plans.some((p) => p.source === "byo" || p.source === "curated")).toBe(true);
        expect(second.debug?.fallback?.triggered).toBe(true);
        expect(second.debug?.calls.filter((c) => c.error?.code === "QUOTA_DENIED").length).toBe(2);
    });
});
