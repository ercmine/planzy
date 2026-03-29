import { describe, expect, it } from "vitest";
import { ProviderError } from "../errors.js";
import { ProviderHealthMonitor } from "../router/health/healthMonitor.js";
import { ProviderRouter } from "../router/providerRouter.js";
class AlwaysFailProvider {
    name;
    callCount = 0;
    constructor(name) {
        this.name = name;
    }
    async searchPlans(_input, _ctx) {
        this.callCount += 1;
        throw new ProviderError({
            provider: this.name,
            code: "UPSTREAM_500",
            message: "upstream failed",
            retryable: true
        });
    }
}
class StaticProvider {
    name;
    callCount = 0;
    plans;
    constructor(name, plans) {
        this.name = name;
        this.plans = plans;
    }
    async searchPlans(_input, _ctx) {
        this.callCount += 1;
        return {
            plans: this.plans,
            source: this.name,
            nextCursor: null,
            debug: { tookMs: 0, returned: this.plans.length }
        };
    }
}
function makePlan(id, source) {
    return {
        id,
        source,
        sourceId: id,
        title: id,
        category: "food",
        location: { lat: 37.775, lng: -122.418 }
    };
}
describe("ProviderRouter health integration", () => {
    const input = {
        location: { lat: 37.775, lng: -122.418 },
        radiusMeters: 5_000,
        limit: 10
    };
    it("skips unhealthy provider and keeps fallback provider running when allowPartial=true", async () => {
        let now = 1_000;
        const monitor = new ProviderHealthMonitor({ maxConsecutiveFailures: 2, disableForMs: 60_000, minCallsForRate: 10 }, { now: () => now });
        const bad = new AlwaysFailProvider("bad");
        const good = new StaticProvider("good", [makePlan("good-1", "good")]);
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers: [bad, good],
            allowPartial: true,
            includeDebug: true,
            healthMonitor: monitor,
            cache: { enabled: false }
        });
        const first = await router.search(input);
        now += 10;
        const second = await router.search(input);
        expect(first.plans.map((p) => p.id)).toContain("good-1");
        expect(second.plans.map((p) => p.id)).toContain("good-1");
        expect(bad.callCount).toBe(2);
        expect(good.callCount).toBe(2);
        now += 10;
        const third = await router.search({ ...input, categories: ["food"] });
        expect(third.plans.map((p) => p.id)).toContain("good-1");
        expect(bad.callCount).toBe(2);
        const badDebug = third.debug?.calls.find((entry) => entry.provider === "bad");
        expect(badDebug?.error?.code).toBe("HEALTH_DISABLED");
    });
    it("throws with allowPartial=false when only provider is disabled", async () => {
        let now = 5_000;
        const monitor = new ProviderHealthMonitor({ maxConsecutiveFailures: 1, disableForMs: 60_000, minCallsForRate: 10 }, { now: () => now });
        const bad = new AlwaysFailProvider("solo");
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers: [bad],
            allowPartial: false,
            healthMonitor: monitor,
            cache: { enabled: false }
        });
        await expect(router.search(input)).rejects.toThrow("Provider fanout failed");
        now += 10;
        await expect(router.search(input)).rejects.toThrow("Provider fanout failed");
    });
});
