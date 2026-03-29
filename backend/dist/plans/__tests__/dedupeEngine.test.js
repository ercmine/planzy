import { describe, expect, it } from "vitest";
import { dedupeAndMergePlans } from "../router/dedupeEngine.js";
function makePlan(overrides) {
    return {
        id: overrides.id,
        source: overrides.source,
        sourceId: overrides.sourceId,
        title: overrides.title,
        category: overrides.category ?? "coffee",
        location: overrides.location ?? { lat: 37.7749, lng: -122.4194 },
        description: overrides.description,
        distanceMeters: overrides.distanceMeters,
        priceLevel: overrides.priceLevel,
        rating: overrides.rating,
        reviewCount: overrides.reviewCount,
        photos: overrides.photos,
        hours: overrides.hours,
        deepLinks: overrides.deepLinks,
        metadata: overrides.metadata
    };
}
describe("dedupeAndMergePlans", () => {
    it("merges Starbucks across providers when near and matching address", () => {
        const plans = [
            makePlan({
                id: "google:1",
                source: "google",
                sourceId: "1",
                title: "Starbucks",
                location: { lat: 37.7749, lng: -122.4194, address: "123 Main Street" },
                deepLinks: { websiteLink: "https://starbucks.com" }
            }),
            makePlan({
                id: "yelp:9",
                source: "yelp",
                sourceId: "9",
                title: "Starbucks Coffee",
                location: { lat: 37.77502, lng: -122.41941, address: "123 Main St" },
                deepLinks: { callLink: "tel:+14155550123" }
            })
        ];
        const result = dedupeAndMergePlans(plans);
        expect(result.plans).toHaveLength(1);
        expect(result.plans[0]?.source).toBe("deduped");
        expect(result.plans[0]?.deepLinks?.websiteLink).toBe("https://starbucks.com");
        expect(result.plans[0]?.deepLinks?.callLink).toBe("tel:+14155550123");
    });
    it("does not merge same name when far apart", () => {
        const plans = [
            makePlan({ id: "google:sf", source: "google", sourceId: "sf", title: "Target", location: { lat: 37.7749, lng: -122.4194, address: "100 Market St" } }),
            makePlan({ id: "yelp:oak", source: "yelp", sourceId: "oak", title: "Target", location: { lat: 37.7899, lng: -122.3944, address: "100 Market St" } })
        ];
        const result = dedupeAndMergePlans(plans);
        expect(result.plans).toHaveLength(2);
        expect(result.plans.map((plan) => plan.id)).toEqual(["google:sf", "yelp:oak"]);
    });
    it("does not merge close places with different names", () => {
        const plans = [
            makePlan({ id: "g-target", source: "google", sourceId: "gt", title: "Target", location: { lat: 37.7749, lng: -122.4194, address: "200 Pine St" } }),
            makePlan({ id: "y-taco", source: "yelp", sourceId: "yt", title: "Taco Bell", location: { lat: 37.775, lng: -122.41939, address: "202 Pine St" } })
        ];
        const result = dedupeAndMergePlans(plans);
        expect(result.plans).toHaveLength(2);
    });
    it("merges high-similarity names without address when very close", () => {
        const plans = [
            makePlan({ id: "google-amc", source: "google", sourceId: "ga", title: "AMC Theater", category: "movies", location: { lat: 37.7749, lng: -122.4194 } }),
            makePlan({ id: "yelp-amc", source: "yelp", sourceId: "ya", title: "AMC Theatres", category: "movies", location: { lat: 37.7751, lng: -122.4193 } })
        ];
        const result = dedupeAndMergePlans(plans);
        expect(result.plans).toHaveLength(1);
        expect(result.plans[0]?.source).toBe("deduped");
    });
    it("normalizes address similarity and merges equivalent forms", () => {
        const plans = [
            makePlan({ id: "g-main", source: "google", sourceId: "gm", title: "Blue Bottle", location: { lat: 37.7749, lng: -122.4194, address: "123 N Main St" } }),
            makePlan({ id: "y-main", source: "yelp", sourceId: "ym", title: "Blue Bottle Coffee", location: { lat: 37.775, lng: -122.41945, address: "123 North Main Street" } })
        ];
        const result = dedupeAndMergePlans(plans);
        expect(result.plans).toHaveLength(1);
        expect(result.plans[0]?.location.address).toContain("Main");
    });
    it("selects merge fields including weighted rating and deep links", () => {
        const plans = [
            makePlan({
                id: "google-a",
                source: "google",
                sourceId: "ga",
                title: "Cafe Mocha",
                location: { lat: 37.7749, lng: -122.4194, address: "77 Howard St" },
                rating: 4.9,
                reviewCount: 10,
                deepLinks: { websiteLink: "http://cafemocha.example" }
            }),
            makePlan({
                id: "yelp-a",
                source: "yelp",
                sourceId: "ya",
                title: "Cafe Mocha Kitchen",
                location: { lat: 37.775, lng: -122.41945, address: "77 Howard Street" },
                rating: 4.0,
                reviewCount: 90,
                deepLinks: { callLink: "tel:+14155550111" }
            })
        ];
        const result = dedupeAndMergePlans(plans);
        const merged = result.plans[0];
        expect(result.plans).toHaveLength(1);
        expect(merged?.deepLinks?.websiteLink).toBe("http://cafemocha.example");
        expect(merged?.deepLinks?.callLink).toBe("tel:+14155550111");
        expect(merged?.rating).toBeCloseTo(4.09, 2);
        expect(merged?.reviewCount).toBe(90);
    });
    it("is deterministic across repeated runs", () => {
        const plans = [
            makePlan({ id: "google-1", source: "google", sourceId: "1", title: "Starbucks", location: { lat: 37.7749, lng: -122.4194, address: "123 Main Street" } }),
            makePlan({ id: "yelp-1", source: "yelp", sourceId: "1", title: "Starbucks Coffee", location: { lat: 37.77502, lng: -122.41941, address: "123 Main St" } }),
            makePlan({ id: "ticket-1", source: "ticketmaster", sourceId: "1", title: "Live Event", category: "music", location: { lat: 37.781, lng: -122.41, address: "1 Music Ave" } })
        ];
        const first = dedupeAndMergePlans(plans);
        const second = dedupeAndMergePlans(plans);
        expect(first.plans.map((plan) => plan.id)).toEqual(second.plans.map((plan) => plan.id));
        expect(first.plans.map((plan) => plan.title)).toEqual(second.plans.map((plan) => plan.title));
    });
});
