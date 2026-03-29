import { describe, expect, it } from "vitest";
import { NoScrapePolicy, PolicyViolationError, defaultNoScrapePolicy } from "../noScrapePolicy.js";
describe("NoScrapePolicy", () => {
    it("default policy allows official API domains", () => {
        const policy = new NoScrapePolicy(defaultNoScrapePolicy());
        expect(() => policy.assertUrlAllowed("https://places.googleapis.com/v1/places:searchNearby", "api")).not.toThrow();
        expect(() => policy.assertUrlAllowed("https://api.yelp.com/v3/businesses/search", "api")).not.toThrow();
        expect(() => policy.assertUrlAllowed("https://app.ticketmaster.com/discovery/v2/events.json", "api")).not.toThrow();
        expect(() => policy.assertUrlAllowed("https://api.themoviedb.org/3/movie/now_playing", "api")).not.toThrow();
    });
    it("blocks unknown API domains", () => {
        const policy = new NoScrapePolicy(defaultNoScrapePolicy());
        expect(() => policy.assertUrlAllowed("https://example.com/scrape", "api")).toThrow(PolicyViolationError);
    });
    it("allows tmdb image domain and blocks unknown image domain", () => {
        const policy = new NoScrapePolicy(defaultNoScrapePolicy());
        expect(() => policy.assertUrlAllowed("https://image.tmdb.org/t/p/w500/path.jpg", "image")).not.toThrow();
        expect(() => policy.assertUrlAllowed("https://example.com/image.jpg", "image")).toThrow(PolicyViolationError);
    });
    it("blocks unknown providers", () => {
        const policy = new NoScrapePolicy(defaultNoScrapePolicy());
        expect(() => policy.assertProviderAllowed("scraper")).toThrow(PolicyViolationError);
    });
    it("blocks unknown plan sources", () => {
        const policy = new NoScrapePolicy(defaultNoScrapePolicy());
        expect(() => policy.assertPlanSourceAllowed("scrape")).toThrow(PolicyViolationError);
    });
});
