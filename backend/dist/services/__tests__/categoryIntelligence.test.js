import { describe, expect, it } from "vitest";
import { buildCategorySearchPlan, classifyPlaceCategories, getCategoryDefinition, rankAndFilterCategoryResults, resolveCategoryAlias, scorePlaceForCategory } from "../categoryIntelligence.js";
function googleEvidence(overrides) {
    return {
        provider: "google",
        placeId: "g-1",
        ...overrides
    };
}
describe("category intelligence", () => {
    it("resolves aliases to canonical category IDs", () => {
        expect(resolveCategoryAlias("coffee")).toBe("coffee-shops");
        expect(resolveCategoryAlias("bars near me")).toBe("bars");
        expect(resolveCategoryAlias("unknown")).toBe("food-drink");
    });
    it("builds search plans from provider hints", () => {
        const coffee = buildCategorySearchPlan("coffee");
        expect(coffee.definition.id).toBe("coffee-shops");
        expect(coffee.primaryTypes).toContain("cafe");
        expect(coffee.queryTerms).toContain("espresso");
        const museum = buildCategorySearchPlan("museum");
        expect(museum.definition.id).toBe("museums");
        expect(museum.primaryTypes).toContain("museum");
    });
    it("maps Google and Foursquare coffee types strongly to coffee-shops with agreement bonus", () => {
        const profile = classifyPlaceCategories([
            googleEvidence({
                primaryType: "cafe",
                types: ["cafe", "coffee_shop"],
                name: "North Loop Roastery",
                description: "Espresso and latte bar"
            }),
            {
                provider: "foursquare",
                placeId: "fsq-1",
                subcategories: ["Coffee Shop"],
                name: "North Loop Coffee Shop"
            }
        ]);
        expect(profile.primaryCategoryId).toBe("coffee-shops");
        expect(profile.categoryScores["coffee-shops"]).toBeGreaterThan(0.9);
        expect(profile.evidenceByCategory["coffee-shops"].bonuses.some((entry) => entry.source === "agreement:multi_provider")).toBe(true);
    });
    it("does not strongly map generic restaurant or tourist_attraction to specific categories", () => {
        const brunchProfile = classifyPlaceCategories([
            googleEvidence({ primaryType: "restaurant", types: ["restaurant"], name: "Generic Restaurant" })
        ]);
        expect(brunchProfile.fitByCategory.brunch).not.toBe("strong_match");
        const museumProfile = classifyPlaceCategories([
            googleEvidence({ primaryType: "tourist_attraction", types: ["tourist_attraction"], name: "Downtown Landmark" })
        ]);
        expect(museumProfile.fitByCategory.museums).toBe("mismatch");
    });
    it("keyword signals and negative keywords adjust confidence deterministically", () => {
        const positive = classifyPlaceCategories([
            googleEvidence({
                primaryType: "restaurant",
                types: ["restaurant", "breakfast_restaurant"],
                name: "Sunny Brunch Spot",
                description: "Mimosa flights and eggs benedict"
            })
        ]);
        const negative = classifyPlaceCategories([
            googleEvidence({
                primaryType: "restaurant",
                types: ["restaurant"],
                name: "Late Night Office Kitchen",
                description: "Quick bite"
            })
        ]);
        expect(positive.categoryScores.brunch).toBeGreaterThan(negative.categoryScores.brunch);
    });
    it("prefers specific categories over generic parent when evidence is strong", () => {
        const profile = classifyPlaceCategories([
            googleEvidence({ primaryType: "dog_park", types: ["park", "dog_park"], name: "Riverside Off Leash Dog Park" })
        ]);
        expect(profile.primaryCategoryId).toBe("dog-parks");
        expect(profile.categoryScores["dog-parks"]).toBeGreaterThanOrEqual(profile.categoryScores.outdoors);
    });
    it("classifies nightlife bars vs clubs distinctly", () => {
        const clubs = classifyPlaceCategories([
            googleEvidence({ primaryType: "night_club", types: ["night_club"], name: "Pulse DJ Night Club" })
        ]);
        const bars = classifyPlaceCategories([
            googleEvidence({ primaryType: "bar", types: ["bar"], name: "Velvet Cocktail Bar" })
        ]);
        expect(clubs.primaryCategoryId).toBe("clubs");
        expect(bars.primaryCategoryId).toBe("bars");
    });
    it("supports manual include, exclude, and primary overrides with precedence", () => {
        const place = {
            id: "weak",
            displayName: { text: "Grand Hotel Lounge" },
            primaryType: "lodging",
            types: ["lodging", "bar"],
            rating: 4.2,
            userRatingCount: 150
        };
        const definition = getCategoryDefinition("clubs");
        const without = rankAndFilterCategoryResults([place], definition);
        expect(without.kept).toHaveLength(0);
        const withOverride = rankAndFilterCategoryResults([place], definition, {
            placeOverrides: new Map([
                [
                    "weak",
                    {
                        hardPrimaryCategoryId: "clubs",
                        hardExcludeCategoryIds: ["bars"]
                    }
                ]
            ])
        });
        expect(withOverride.kept).toHaveLength(1);
        expect(withOverride.scoreMap.get("weak")?.fitLabel).toBe("exact_match");
    });
    it("ranks strong matches above weak matches and filters mismatches on strict pages", () => {
        const definition = getCategoryDefinition("coffee");
        const ranked = rankAndFilterCategoryResults([
            {
                id: "strong",
                displayName: { text: "Neighborhood Coffee Roastery" },
                primaryType: "coffee_shop",
                types: ["coffee_shop", "cafe"],
                rating: 4.4,
                userRatingCount: 90,
                photos: [{ name: "p" }]
            },
            {
                id: "weak",
                displayName: { text: "Generic Restaurant" },
                primaryType: "restaurant",
                types: ["restaurant"],
                rating: 4.9,
                userRatingCount: 1000
            }
        ], definition, { strictness: "strict" });
        expect(ranked.kept[0]?.id).toBe("strong");
        expect(ranked.rejected.some((entry) => entry.place.id === "weak")).toBe(true);
    });
    it("broad parent pages keep acceptable child matches", () => {
        const definition = getCategoryDefinition("nightlife");
        const ranked = rankAndFilterCategoryResults([
            {
                id: "bar",
                displayName: { text: "Velvet Cocktail Bar" },
                primaryType: "bar",
                types: ["bar"],
                rating: 4.3,
                userRatingCount: 200
            }
        ], definition, { strictness: "broad" });
        expect(ranked.kept).toHaveLength(1);
    });
    it("scorePlaceForCategory exposes explainable reasons", () => {
        const definition = getCategoryDefinition("museums");
        const score = scorePlaceForCategory({
            id: "museum",
            displayName: { text: "City Science Museum" },
            primaryType: "museum",
            types: ["museum", "tourist_attraction"],
            rating: 4.8,
            userRatingCount: 1200
        }, definition);
        expect(score.keep).toBe(true);
        expect(score.reasons.length).toBeGreaterThan(0);
        expect(score.evidence?.contributions.length).toBeGreaterThan(0);
    });
});
