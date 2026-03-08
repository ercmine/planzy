import { describe, expect, it } from "vitest";

import {
  buildCategorySearchPlan,
  getCategoryDefinition,
  rankAndFilterCategoryResults,
  scorePlaceForCategory
} from "../categoryIntelligence.js";

describe("category intelligence", () => {
  it("builds category definitions with expected query/type constraints", () => {
    const coffee = buildCategorySearchPlan("coffee");
    expect(coffee.primaryTypes).toContain("coffee_shop");
    expect(coffee.queryTerms).toContain("espresso");

    const hiking = buildCategorySearchPlan("hiking");
    expect(hiking.definition.id).toBe("outdoors");
    expect(hiking.primaryTypes).toContain("hiking_area");
  });

  it("filters irrelevant provider types for category pages", () => {
    const definition = getCategoryDefinition("outdoors");
    const filtered = rankAndFilterCategoryResults(
      [
        {
          id: "trail",
          displayName: { text: "Sunset Hiking Trail" },
          primaryType: "hiking_area",
          types: ["hiking_area", "park"],
          rating: 4.6,
          userRatingCount: 230
        },
        {
          id: "apt",
          displayName: { text: "River Apartments" },
          primaryType: "apartment_building",
          types: ["apartment_building"],
          rating: 4.7,
          userRatingCount: 400
        }
      ],
      definition
    );

    expect(filtered.kept.map((place) => place.id)).toEqual(["trail"]);
    expect(filtered.rejected[0]?.reason).toContain("banned_type");
  });

  it("coffee prefers cafes over generic restaurants", () => {
    const definition = getCategoryDefinition("coffee");
    const cafeScore = scorePlaceForCategory(
      {
        id: "cafe",
        displayName: { text: "North Loop Coffee" },
        primaryType: "coffee_shop",
        types: ["coffee_shop", "cafe"],
        rating: 4.5,
        userRatingCount: 120
      },
      definition
    );

    const restaurantScore = scorePlaceForCategory(
      {
        id: "restaurant",
        displayName: { text: "All Day Grill" },
        primaryType: "restaurant",
        types: ["restaurant"],
        rating: 4.5,
        userRatingCount: 120
      },
      definition
    );

    expect(cafeScore.score).toBeGreaterThan(restaurantScore.score);
  });

  it("hiking prefers trails/parks over unrelated places", () => {
    const definition = getCategoryDefinition("hiking");
    const ranked = rankAndFilterCategoryResults(
      [
        {
          id: "park",
          displayName: { text: "Eagle Ridge Trailhead" },
          primaryType: "hiking_area",
          types: ["hiking_area", "park"],
          rating: 4.8,
          userRatingCount: 320
        },
        {
          id: "shop",
          displayName: { text: "Random Convenience" },
          primaryType: "convenience_store",
          types: ["convenience_store", "store"],
          rating: 4.9,
          userRatingCount: 500
        }
      ],
      definition
    );

    expect(ranked.kept.map((place) => place.id)).toEqual(["park"]);
  });

  it("nightlife does not rank coffee shops above bars", () => {
    const definition = getCategoryDefinition("nightlife");
    const bar = scorePlaceForCategory(
      {
        id: "bar",
        displayName: { text: "Velvet Lounge" },
        primaryType: "bar",
        types: ["bar", "event_venue"],
        rating: 4.4,
        userRatingCount: 220
      },
      definition
    );

    const coffee = scorePlaceForCategory(
      {
        id: "coffee",
        displayName: { text: "Morning Roast Coffee" },
        primaryType: "coffee_shop",
        types: ["coffee_shop", "cafe"],
        rating: 4.8,
        userRatingCount: 300
      },
      definition
    );

    expect(bar.score).toBeGreaterThan(coffee.score);
  });

  it("weak result sets are filtered to empty", () => {
    const definition = getCategoryDefinition("family");
    const ranked = rankAndFilterCategoryResults(
      [
        {
          id: "weak",
          displayName: { text: "Downtown Office Plaza" },
          primaryType: "office_building",
          types: ["office_building"],
          rating: 4.0,
          userRatingCount: 5
        }
      ],
      definition
    );

    expect(ranked.kept).toHaveLength(0);
    expect(ranked.rejected).toHaveLength(1);
  });

  it("sorts strong matches above weak matches", () => {
    const definition = getCategoryDefinition("date");
    const ranked = rankAndFilterCategoryResults(
      [
        {
          id: "strong",
          displayName: { text: "Romantic Wine Bar" },
          primaryType: "wine_bar",
          types: ["wine_bar", "bar"],
          rating: 4.7,
          userRatingCount: 400,
          photos: [{ name: "p" }]
        },
        {
          id: "weaker",
          displayName: { text: "Generic Eatery" },
          primaryType: "restaurant",
          types: ["restaurant"],
          rating: 4.1,
          userRatingCount: 30
        }
      ],
      definition
    );

    expect(ranked.kept[0]?.id).toBe("strong");
  });
});
