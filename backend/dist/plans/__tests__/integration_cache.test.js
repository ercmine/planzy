import { describe, expect, it } from "vitest";
import { defaultConfig } from "../../config/schema.js";
import { ProviderRouter } from "../router/providerRouter.js";
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
    cfg.affiliate = {
        enabled: true,
        mode: "append_params",
        wrapBooking: true,
        wrapTicket: false,
        wrapWebsite: false,
        defaultParams: { aff: "partner" },
        includeSession: true,
        includePlan: true
    };
    return cfg;
}
function makePlan(id, source) {
    return {
        id,
        source,
        sourceId: id,
        title: `Plan ${id}`,
        category: "food",
        location: { lat: 47.6062, lng: -122.3321 },
        deepLinks: {
            bookingLink: `https://example.com/book/${id}`
        }
    };
}
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
        return { plans: this.plans, source: this.name, nextCursor: null };
    }
}
describe("ProviderRouter integration cache", () => {
    const input = {
        location: { lat: 47.6062, lng: -122.3321 },
        radiusMeters: 5_000,
        limit: 10
    };
    it("uses router cache on repeated calls", async () => {
        const provider = new CountingProvider("counting", [makePlan("counting-1", "counting"), makePlan("counting-2", "counting")]);
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers: [provider],
            config: makeConfig([provider.name]),
            includeDebug: true,
            allowPartial: true,
            cache: { enabled: true, ttlMs: 60_000 }
        });
        const first = await router.search(input, { sessionId: "cache-session" });
        const second = await router.search(input, { sessionId: "cache-session" });
        expect(provider.calls).toBe(1);
        expect(first.plans.map((plan) => plan.id)).toEqual(second.plans.map((plan) => plan.id));
        expect(second.debug?.cacheHit).toBe(true);
    });
    it("applies affiliate wrapping on response while staying cache-compatible", async () => {
        const provider = new CountingProvider("affiliate", [makePlan("affiliate-1", "affiliate")]);
        const router = new ProviderRouter({
            enforceNoScrape: false,
            providers: [provider],
            config: makeConfig([provider.name]),
            includeDebug: true,
            allowPartial: true,
            cache: { enabled: true, ttlMs: 60_000 }
        });
        const first = await router.search(input, { sessionId: "cache-session" });
        const second = await router.search(input, { sessionId: "cache-session" });
        expect(provider.calls).toBe(1);
        const firstBooking = first.plans[0]?.deepLinks?.bookingLink;
        const secondBooking = second.plans[0]?.deepLinks?.bookingLink;
        expect(firstBooking).toContain("aff=partner");
        expect(firstBooking).toContain("sid=");
        expect(firstBooking).toContain("pid=");
        expect(secondBooking).toBe(firstBooking);
        expect(second.debug?.cacheHit).toBe(true);
    });
});
