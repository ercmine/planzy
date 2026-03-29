import { describe, expect, it } from "vitest";
import { validatePlan } from "../planValidation.js";
import { dedupeAndMergePlans } from "../router/dedupeEngine.js";
import { addressSimilarity } from "../router/similarity.js";
function makePlan(input) {
    return validatePlan({
        id: input.id,
        source: input.source,
        sourceId: input.sourceId,
        title: input.title,
        category: input.category ?? "coffee",
        location: input.location ?? { lat: 44.9801, lng: -93.2636, address: "123 Main St" },
        rating: input.rating,
        reviewCount: input.reviewCount,
        deepLinks: input.deepLinks,
        metadata: input.metadata
    });
}
describe("dedupe matching and merge", () => {
    it("merges normalized name variants at the same address within geo threshold", () => {
        const google = makePlan({
            id: "google:1",
            source: "google",
            sourceId: "1",
            title: "The Coffee Bar",
            location: { lat: 44.9801, lng: -93.2636, address: "123 Main Street" }
        });
        const yelp = makePlan({
            id: "yelp:1",
            source: "yelp",
            sourceId: "1",
            title: "Coffee Bar",
            location: { lat: 44.98022, lng: -93.26362, address: "123 Main St" }
        });
        const result = dedupeAndMergePlans([google, yelp], { geoThresholdMeters: 120 });
        expect(result.plans).toHaveLength(1);
        expect(result.debug?.groups[0]?.mergedIds).toHaveLength(2);
    });
    it("normalizes address forms and merges when nearby", () => {
        expect(addressSimilarity("123 North Main Street", "123 N Main St")).toBeGreaterThan(0.75);
        const a = makePlan({
            id: "google:2",
            source: "google",
            sourceId: "2",
            title: "North Main Coffee",
            location: { lat: 44.9801, lng: -93.2636, address: "123 North Main Street" }
        });
        const b = makePlan({
            id: "yelp:2",
            source: "yelp",
            sourceId: "2",
            title: "North Main Coffee",
            location: { lat: 44.98012, lng: -93.26358, address: "123 N Main St" }
        });
        expect(dedupeAndMergePlans([a, b]).plans).toHaveLength(1);
    });
    it("does not merge same names far apart or different names close together", () => {
        const farA = makePlan({
            id: "google:far",
            source: "google",
            sourceId: "far",
            title: "Target",
            location: { lat: 44.9801, lng: -93.2636, address: "1 Main St" }
        });
        const farB = makePlan({
            id: "yelp:far",
            source: "yelp",
            sourceId: "far",
            title: "Target",
            location: { lat: 44.998, lng: -93.244, address: "1 Main St" }
        });
        const closeA = makePlan({
            id: "google:close",
            source: "google",
            sourceId: "close",
            title: "Target",
            location: { lat: 44.9801, lng: -93.2636, address: "1 Main St" }
        });
        const closeB = makePlan({
            id: "yelp:close",
            source: "yelp",
            sourceId: "close",
            title: "Taco Bell",
            location: { lat: 44.98011, lng: -93.26361, address: "2 Main St" }
        });
        expect(dedupeAndMergePlans([farA, farB]).plans).toHaveLength(2);
        expect(dedupeAndMergePlans([closeA, closeB]).plans).toHaveLength(2);
    });
    it("merges complementary fields and weighted rating by review count", () => {
        const withWebsite = makePlan({
            id: "google:merge",
            source: "google",
            sourceId: "merge",
            title: "Coffee Bar",
            location: { lat: 44.9801, lng: -93.2636, address: "123 Main St" },
            rating: 4,
            reviewCount: 100,
            deepLinks: { websiteLink: "https://coffee.example.com" }
        });
        const withCall = makePlan({
            id: "yelp:merge",
            source: "yelp",
            sourceId: "merge",
            title: "The Coffee Bar",
            location: { lat: 44.98011, lng: -93.26361, address: "123 Main Street" },
            rating: 5,
            reviewCount: 25,
            deepLinks: { callLink: "tel:+16125551212" }
        });
        const merged = dedupeAndMergePlans([withWebsite, withCall]).plans[0];
        expect(merged?.deepLinks?.websiteLink).toBe("https://coffee.example.com");
        expect(merged?.deepLinks?.callLink).toBe("tel:+16125551212");
        expect(merged?.rating).toBeCloseTo(4.2, 3);
    });
    it("is deterministic across repeated runs", () => {
        const plans = [
            makePlan({ id: "google:a", source: "google", sourceId: "a", title: "The Coffee Bar" }),
            makePlan({ id: "yelp:a", source: "yelp", sourceId: "a", title: "Coffee Bar" }),
            makePlan({ id: "google:b", source: "google", sourceId: "b", title: "Park Trail", category: "outdoors" })
        ];
        const first = dedupeAndMergePlans(plans);
        const second = dedupeAndMergePlans(plans);
        expect(first.plans.map((plan) => plan.id)).toEqual(second.plans.map((plan) => plan.id));
    });
});
