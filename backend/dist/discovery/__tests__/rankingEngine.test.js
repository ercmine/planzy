import { describe, expect, it } from "vitest";
import { computeCompletenessScore, scorePlaceForMode } from "../rankingEngine.js";
function place(overrides) {
    return {
        canonicalPlaceId: "p",
        name: "Base Place",
        primaryCategory: "food",
        secondaryCategories: [],
        lat: 30,
        lng: -97,
        imageUrls: [],
        sourceAttribution: ["osm"],
        qualityScore: 0.5,
        popularityScore: 0.4,
        trendingScore: 0.4,
        keywords: [],
        updatedAt: new Date().toISOString(),
        ...overrides
    };
}
describe("ranking engine", () => {
    it("scores rich place completeness above sparse place", () => {
        const rich = computeCompletenessScore(place({
            description: "great place",
            city: "austin",
            secondaryCategories: ["coffee"],
            imageUrls: ["a", "b"],
            reviewCount: 120,
            openNow: true
        }));
        const sparse = computeCompletenessScore(place({ name: "", sourceAttribution: [], imageUrls: [] }));
        expect(rich).toBeGreaterThan(sparse);
    });
    it("keeps distance strong in nearby mode", () => {
        const context = { lat: 30, lng: -97, radiusMeters: 2000 };
        const near = scorePlaceForMode({ place: place({ qualityScore: 0.6 }), mode: "nearby", context, distanceMeters: 100 }).score;
        const far = scorePlaceForMode({ place: place({ qualityScore: 0.95 }), mode: "nearby", context, distanceMeters: 1800 }).score;
        expect(near).toBeGreaterThan(far);
    });
    it("allows content-rich place to outrank poor place in category mode", () => {
        const context = { categoryId: "food", radiusMeters: 4000 };
        const rich = scorePlaceForMode({
            place: place({ imageUrls: ["1", "2", "3"], reviewCount: 400, description: "rich", qualityScore: 0.9, popularityScore: 0.85, trendingScore: 0.8 }),
            mode: "category",
            context,
            distanceMeters: 900
        }).score;
        const poor = scorePlaceForMode({
            place: place({ canonicalPlaceId: "p2", imageUrls: [], reviewCount: 0, description: undefined, qualityScore: 0.35, popularityScore: 0.2, trendingScore: 0.1 }),
            mode: "category",
            context,
            distanceMeters: 500
        }).score;
        expect(rich).toBeGreaterThan(poor);
    });
    it("incorporates first-party engagement signals without overpowering distance", () => {
        const context = { categoryId: "food", radiusMeters: 4000 };
        const nearLowContent = scorePlaceForMode({
            place: place({ canonicalPlaceId: "near", qualityScore: 0.6, popularityScore: 0.4, trendingScore: 0.4 }),
            mode: "nearby",
            context,
            distanceMeters: 120
        }).score;
        const farHighContent = scorePlaceForMode({
            place: place({
                canonicalPlaceId: "far",
                qualityScore: 0.8,
                popularityScore: 0.8,
                trendingScore: 0.7,
                firstPartySignals: {
                    reviewCount: 40,
                    creatorVideoCount: 12,
                    saveCount: 80,
                    publicGuideCount: 8,
                    trustedReviewCount: 18,
                    helpfulVoteCount: 120,
                    engagementVelocity30d: 0.9,
                    qualityBoost: 0.85
                }
            }),
            mode: "nearby",
            context,
            distanceMeters: 2200
        }).score;
        expect(nearLowContent).toBeGreaterThan(farHighContent);
    });
    it("prioritizes textual relevance in text mode", () => {
        const context = { query: "coffee", radiusMeters: 3000 };
        const relevant = scorePlaceForMode({ place: place({ name: "Coffee House", keywords: ["espresso"] }), mode: "text", context, distanceMeters: 1200 }).score;
        const irrelevant = scorePlaceForMode({ place: place({ name: "City Park", primaryCategory: "parks" }), mode: "text", context, distanceMeters: 400 }).score;
        expect(relevant).toBeGreaterThan(irrelevant);
    });
});
