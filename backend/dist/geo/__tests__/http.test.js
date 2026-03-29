import { describe, expect, it, vi } from "vitest";
import { createGeoHttpHandlers } from "../http.js";
describe("createGeoHttpHandlers", () => {
    it("rejects unauthorized v1 request when internal auth is enabled", async () => {
        const protectedHandlers = createGeoHttpHandlers({
            geocode: vi.fn(),
            reverseGeocode: vi.fn(),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        }, { authSecret: "geo-secret" });
        const res = createMockResponse();
        await protectedHandlers.geocode({ method: "POST", headers: {}, url: "/v1/geocode" }, res);
        expect(res.statusCode).toBe(401);
    });
    it("serves public /api/geo/search responses", async () => {
        const handlers = createGeoHttpHandlers({
            geocode: vi.fn(async () => [{ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, source: "nominatim" }]),
            reverseGeocode: vi.fn(),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        });
        const res = createMockResponse();
        await handlers.apiSearch({ method: "GET", headers: {}, url: "/api/geo/search?q=austin" }, res);
        expect(res.statusCode).toBe(200);
        expect(String(res.body)).toContain("Austin, Texas");
    });
    it("validates short /api/geo/search queries", async () => {
        const handlers = createGeoHttpHandlers({
            geocode: vi.fn(),
            reverseGeocode: vi.fn(),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        });
        const res = createMockResponse();
        await handlers.apiSearch({ method: "GET", headers: {}, url: "/api/geo/search?q=a" }, res);
        expect(res.statusCode).toBe(400);
    });
    it("rate limits public geo endpoints", async () => {
        const handlers = createGeoHttpHandlers({
            geocode: vi.fn(async () => [{ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, source: "nominatim" }]),
            reverseGeocode: vi.fn(),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        }, { rateLimitPerMinute: 30 });
        const denied = createMockResponse();
        await handlers.apiSearch({ method: "GET", headers: { "x-forwarded-for": "1.1.1.1" }, url: "/api/geo/search?q=austin" }, denied);
        expect(denied.statusCode).toBe(200);
        for (let i = 0; i < 30; i += 1) {
            const res = createMockResponse();
            await handlers.apiSearch({ method: "GET", headers: { "x-forwarded-for": "2.2.2.2" }, url: "/api/geo/search?q=austin" }, res);
        }
        const blocked = createMockResponse();
        await handlers.apiSearch({ method: "GET", headers: { "x-forwarded-for": "2.2.2.2" }, url: "/api/geo/search?q=austin" }, blocked);
        expect(blocked.statusCode).toBe(429);
    });
    it("serves /api/geo/nearby responses", async () => {
        const handlers = createGeoHttpHandlers({
            geocode: vi.fn(async () => [{ displayName: "Coffee Austin", lat: 30.2672, lng: -97.7431, source: "nominatim" }]),
            reverseGeocode: vi.fn(async () => ({ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, city: "Austin", state: "Texas", source: "nominatim" })),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        });
        const res = createMockResponse();
        await handlers.apiNearby({ method: "GET", headers: {}, url: "/api/geo/nearby?lat=30.2672&lng=-97.7431&radius=1500" }, res);
        expect(res.statusCode).toBe(200);
        expect(String(res.body)).toContain("Coffee Austin");
    });
    it("returns structured 503 when geo gateway is unavailable", async () => {
        const handlers = createGeoHttpHandlers(null, {
            getStatus: () => ({
                mode: "disabled",
                routesMounted: true,
                envValidationErrors: ["Geo disabled"],
                envValidationWarnings: []
            })
        });
        const res = createMockResponse();
        await handlers.apiSearch({ method: "GET", headers: {}, url: "/api/geo/search?q=austin" }, res);
        expect(res.statusCode).toBe(503);
        expect(String(res.body)).toContain("geo_unavailable");
    });
    it("prioritizes canonical places for nearby map discovery", async () => {
        const handlers = createGeoHttpHandlers({
            geocode: vi.fn(async () => []),
            reverseGeocode: vi.fn(async () => ({ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, city: "Austin", state: "Texas", source: "nominatim" })),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        }, {
            listCanonicalPlaces: () => [{
                    canonicalPlaceId: "pl_1",
                    status: "active",
                    primaryDisplayName: "Dryad Cafe",
                    canonicalCategory: "coffee",
                    latitude: 30.2673,
                    longitude: -97.7432,
                    region: "TX",
                    locality: "Austin",
                    neighborhood: "Downtown",
                    dataCompletenessScore: 84,
                    openNow: true,
                    photoGallery: [],
                    providerStats: {},
                    sourceRecordIds: [],
                    tags: [],
                    mergedFromProviders: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }]
        });
        const res = createMockResponse();
        await handlers.apiNearby({ method: "GET", headers: {}, url: "/api/geo/nearby?lat=30.2672&lng=-97.7431&radius=1500" }, res);
        expect(res.statusCode).toBe(200);
        expect(String(res.body)).toContain("Dryad Cafe");
    });
    it("fans out fallback nearby queries and filters broad admin rows", async () => {
        const geocode = vi.fn(async ({ query }) => {
            if (query.includes("Austin")) {
                return [
                    { displayName: "Austin, Travis County, Texas", lat: 30.2672, lng: -97.7431, class: "boundary", type: "administrative", source: "nominatim" },
                    { displayName: "Coffee Lab Austin", lat: 30.268, lng: -97.742, class: "amenity", type: "cafe", source: "nominatim" }
                ];
            }
            return [
                { displayName: "Trail House Gym", lat: 30.266, lng: -97.741, class: "amenity", type: "gym", source: "nominatim" }
            ];
        });
        const handlers = createGeoHttpHandlers({
            geocode,
            reverseGeocode: vi.fn(async () => ({ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, neighborhood: "Downtown", city: "Austin", state: "Texas", source: "nominatim" })),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        }, {
            nearbyConfig: { maxQueryFanout: 8, targetCandidates: 20, cellSubdivisions: 3, perQueryLimit: 10, queryConcurrency: 2 }
        });
        const res = createMockResponse();
        await handlers.apiNearby({ method: "GET", headers: {}, url: "/api/geo/nearby?lat=30.2672&lng=-97.7431&radius=4500&categories=coffee,gym" }, res);
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(String(res.body));
        expect(geocode.mock.calls.length).toBeGreaterThan(1);
        expect(body.sourceBreakdown.geoFallbackCount).toBeGreaterThan(1);
        expect(body.places.length).toBeGreaterThan(0);
        expect(body.places[0].displayName).not.toContain("Travis County");
    });
    it("dedupes fallback places by osm identity when available", async () => {
        const handlers = createGeoHttpHandlers({
            geocode: vi.fn(async () => [
                { displayName: "Coffee House", lat: 30.2672, lng: -97.7431, osmId: 123, osmType: "node", class: "amenity", type: "cafe", source: "nominatim" },
                { displayName: "Coffee House Downtown", lat: 30.26721, lng: -97.74311, osmId: 123, osmType: "node", class: "amenity", type: "cafe", source: "nominatim" }
            ]),
            reverseGeocode: vi.fn(async () => ({ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, city: "Austin", state: "Texas", source: "nominatim" })),
            autocomplete: vi.fn(),
            placeLookup: vi.fn(),
            areaContext: vi.fn(),
            health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
        }, {
            nearbyConfig: { maxQueryFanout: 4, targetCandidates: 10, perQueryLimit: 10 }
        });
        const res = createMockResponse();
        await handlers.apiNearby({ method: "GET", headers: {}, url: "/api/geo/nearby?lat=30.2672&lng=-97.7431&radius=1500&categories=coffee" }, res);
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(String(res.body));
        const names = body.places.map((place) => place.displayName);
        expect(names.filter((name) => name.includes("Coffee House")).length).toBe(1);
    });
});
function createMockResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: "",
        setHeader(name, value) { this.headers[name] = value; },
        end(chunk) { this.body += chunk ?? ""; }
    };
}
