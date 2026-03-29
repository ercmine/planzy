import { describe, expect, it } from "vitest";
import { MoviesCache } from "../providers/movies/cache.js";
import { MoviesProvider } from "../providers/movies/moviesProvider.js";
const baseInput = {
    location: { lat: 37.775, lng: -122.418 },
    radiusMeters: 3_000,
    limit: 20,
    categories: ["movies"]
};
function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
describe("MoviesProvider", () => {
    it("returns movies + theaters when all sources succeed", async () => {
        const fetchFn = (async (input) => {
            const url = typeof input === "string" ? input : input.toString();
            if (url.includes("api.themoviedb.org")) {
                return jsonResponse({
                    results: [{ id: 1, title: "Dune", overview: "...", vote_average: 8, vote_count: 1000, poster_path: "/p.jpg" }]
                });
            }
            return jsonResponse({
                places: [
                    {
                        id: "g1",
                        displayName: { text: "AMC Theater" },
                        formattedAddress: "100 King St",
                        location: { latitude: 37.774, longitude: -122.419 },
                        regularOpeningHours: { openNow: true },
                        types: ["movie_theater"],
                        googleMapsUri: "https://maps.google.com/amc"
                    }
                ]
            });
        });
        const provider = new MoviesProvider({ tmdbApiKey: "tmdb", googleApiKey: "google" }, { fetchFn });
        const result = await provider.searchPlans(baseInput);
        expect(result.plans).toHaveLength(2);
        expect(result.plans[0]?.source).toBe("tmdb");
        expect(result.plans[1]?.source).toBe("google");
    });
    it("converts TMDB vote_average to 0-5 rating", async () => {
        const fetchFn = (async (input) => {
            const url = typeof input === "string" ? input : input.toString();
            if (url.includes("api.themoviedb.org")) {
                return jsonResponse({
                    results: [{ id: 1, title: "Dune", overview: "...", vote_average: 8, vote_count: 1000, poster_path: "/p.jpg" }]
                });
            }
            return jsonResponse({ places: [] });
        });
        const provider = new MoviesProvider({ tmdbApiKey: "tmdb", googleApiKey: "google" }, { fetchFn });
        const result = await provider.searchPlans(baseInput);
        expect(result.plans[0]?.rating).toBe(4);
    });
    it("uses Google when key present; falls back to Yelp when Google key missing", async () => {
        const googleUrls = [];
        const yelpUrls = [];
        const yelpAuthHeaders = [];
        const fetchFn = (async (input, init) => {
            const url = typeof input === "string" ? input : input.toString();
            if (url.includes("api.themoviedb.org")) {
                return jsonResponse({ results: [] });
            }
            if (url.includes("places.googleapis.com")) {
                googleUrls.push(url);
                return jsonResponse({ places: [] });
            }
            if (url.includes("api.yelp.com")) {
                yelpUrls.push(url);
                yelpAuthHeaders.push(init?.headers?.Authorization ?? "");
                return jsonResponse({
                    businesses: [
                        {
                            id: "y1",
                            name: "Regal Cinema",
                            url: "https://yelp.com/biz/regal",
                            image_url: "https://images.example.com/regal.jpg",
                            coordinates: { latitude: 37.775, longitude: -122.418 },
                            location: { display_address: ["500 Pine St"] },
                            rating: 4.2,
                            review_count: 200,
                            price: "$$",
                            distance: 120
                        }
                    ]
                });
            }
            return jsonResponse({}, 404);
        });
        const googleProvider = new MoviesProvider({ tmdbApiKey: "tmdb", googleApiKey: "google" }, { fetchFn });
        await googleProvider.searchPlans(baseInput);
        const yelpProvider = new MoviesProvider({ tmdbApiKey: "tmdb", yelpApiKey: "yelp" }, { fetchFn });
        await yelpProvider.searchPlans(baseInput);
        expect(googleUrls.length).toBeGreaterThan(0);
        expect(yelpUrls.length).toBeGreaterThan(0);
        expect(yelpAuthHeaders.some((header) => header.includes("Bearer yelp"))).toBe(true);
    });
    it("caches repeated calls within TTL", async () => {
        const calls = { tmdb: 0, google: 0 };
        const fetchFn = (async (input) => {
            const url = typeof input === "string" ? input : input.toString();
            if (url.includes("api.themoviedb.org")) {
                calls.tmdb += 1;
                return jsonResponse({ results: [{ id: 1, title: "Dune" }] });
            }
            calls.google += 1;
            return jsonResponse({
                places: [
                    {
                        id: "g1",
                        displayName: { text: "AMC Theater" },
                        location: { latitude: 37.774, longitude: -122.419 },
                        types: ["movie_theater"]
                    }
                ]
            });
        });
        const nowValues = [1000, 1000, 1200, 1200, 1400, 1400, 1600, 1600];
        let idx = 0;
        const provider = new MoviesProvider({
            tmdbApiKey: "tmdb",
            googleApiKey: "google",
            cache: new MoviesCache(),
            moviesTtlMs: 60_000,
            theatersTtlMs: 60_000
        }, { fetchFn, now: () => nowValues[Math.min(idx++, nowValues.length - 1)] });
        await provider.searchPlans(baseInput);
        await provider.searchPlans(baseInput);
        expect(calls.tmdb).toBe(1);
        expect(calls.google).toBe(1);
    });
    it("returns theaters when TMDB is rate-limited", async () => {
        const fetchFn = (async (input) => {
            const url = typeof input === "string" ? input : input.toString();
            if (url.includes("api.themoviedb.org")) {
                return jsonResponse({}, 429);
            }
            return jsonResponse({
                places: [
                    {
                        id: "g1",
                        displayName: { text: "AMC Theater" },
                        location: { latitude: 37.774, longitude: -122.419 },
                        types: ["movie_theater"]
                    }
                ]
            });
        });
        const provider = new MoviesProvider({ tmdbApiKey: "tmdb", googleApiKey: "google" }, { fetchFn });
        const result = await provider.searchPlans(baseInput);
        expect(result.plans).toHaveLength(1);
        expect(result.plans[0]?.source).toBe("google");
    });
    it("returns movies when theaters lookup is rate-limited", async () => {
        const fetchFn = (async (input) => {
            const url = typeof input === "string" ? input : input.toString();
            if (url.includes("api.themoviedb.org")) {
                return jsonResponse({ results: [{ id: 1, title: "Dune", vote_average: 8, vote_count: 1000 }] });
            }
            return jsonResponse({}, 429);
        });
        const provider = new MoviesProvider({ tmdbApiKey: "tmdb", googleApiKey: "google" }, { fetchFn });
        const result = await provider.searchPlans(baseInput);
        expect(result.plans).toHaveLength(1);
        expect(result.plans[0]?.source).toBe("tmdb");
    });
    it("respects category filter", async () => {
        const provider = new MoviesProvider({ tmdbApiKey: "tmdb", googleApiKey: "google" }, { fetchFn: (async () => jsonResponse({})) });
        const result = await provider.searchPlans({ ...baseInput, categories: ["outdoors"] });
        expect(result.plans).toHaveLength(0);
    });
    it("passes openNow through to Yelp and Google", async () => {
        let googleBody = "";
        let yelpUrl = "";
        const fetchFn = (async (input, init) => {
            const url = typeof input === "string" ? input : input.toString();
            if (url.includes("api.themoviedb.org")) {
                return jsonResponse({ results: [] });
            }
            if (url.includes("places.googleapis.com")) {
                googleBody = String(init?.body ?? "");
                return jsonResponse({ places: [] });
            }
            if (url.includes("api.yelp.com")) {
                yelpUrl = url;
                return jsonResponse({ businesses: [] });
            }
            return jsonResponse({}, 404);
        });
        const googleProvider = new MoviesProvider({ tmdbApiKey: "tmdb", googleApiKey: "google" }, { fetchFn });
        await googleProvider.searchPlans({ ...baseInput, openNow: true });
        expect(googleBody).toContain('"openNow":true');
        const yelpProvider = new MoviesProvider({ tmdbApiKey: "tmdb", yelpApiKey: "yelp", googleApiKey: undefined }, { fetchFn });
        await yelpProvider.searchPlans({ ...baseInput, openNow: true });
        expect(yelpUrl).toContain("open_now=true");
    });
});
