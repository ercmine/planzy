import { describe, expect, it } from "vitest";

import { InMemoryDiscoveryRepository } from "../memoryRepository.js";
import {
  CategoryBrowseService,
  CityPageService,
  DiscoveryFeedService,
  NearbyDiscoveryService,
  PlaceSearchService,
  RecommendationService,
  TrendingService
} from "../services.js";
import type { PlaceDocument, RecommendationProfile } from "../types.js";

const PLACES: PlaceDocument[] = [
  {
    canonicalPlaceId: "p1",
    name: "Brunch Bloom",
    description: "All day brunch and coffee",
    primaryCategory: "food",
    secondaryCategories: ["brunch", "coffee"],
    city: "austin",
    neighborhood: "downtown",
    lat: 30.2672,
    lng: -97.7431,
    rating: 4.8,
    reviewCount: 300,
    imageUrls: ["https://img/1"],
    sourceAttribution: ["google"],
    openNow: true,
    priceLevel: 2,
    qualityScore: 0.92,
    popularityScore: 0.81,
    trendingScore: 0.74,
    keywords: ["brunch", "coffee", "patio"],
    updatedAt: new Date().toISOString()
  },
  {
    canonicalPlaceId: "p2",
    name: "Museum Arc",
    description: "Modern art museum",
    primaryCategory: "arts",
    secondaryCategories: ["museum"],
    city: "austin",
    neighborhood: "east",
    lat: 30.27,
    lng: -97.75,
    rating: 4.6,
    reviewCount: 900,
    imageUrls: ["https://img/2"],
    sourceAttribution: ["foursquare"],
    openNow: true,
    qualityScore: 0.89,
    popularityScore: 0.77,
    trendingScore: 0.9,
    keywords: ["museum", "gallery"],
    updatedAt: new Date().toISOString()
  },
  {
    canonicalPlaceId: "p3",
    name: "Dog Park Trails",
    description: "Outdoor green space",
    primaryCategory: "outdoors",
    secondaryCategories: ["dog park"],
    city: "dallas",
    lat: 32.7767,
    lng: -96.797,
    imageUrls: [],
    sourceAttribution: ["google"],
    qualityScore: 0.7,
    popularityScore: 0.6,
    trendingScore: 0.65,
    keywords: ["outdoor", "park"],
    updatedAt: new Date().toISOString()
  }
];

const PROFILE: RecommendationProfile = {
  userId: "u1",
  preferredCategories: ["food"],
  excludedPlaceIds: ["p3"],
  seenPlaceIds: [],
  homeCity: "austin",
  coldStart: false
};

describe("discovery services", () => {
  const repo = new InMemoryDiscoveryRepository(PLACES, [PROFILE]);
  const search = new PlaceSearchService(repo);
  const browse = new CategoryBrowseService(repo);
  const nearby = new NearbyDiscoveryService(repo);
  const trending = new TrendingService(repo);
  const recommendations = new RecommendationService(repo);
  const cityPage = new CityPageService(trending, recommendations, browse);
  const feed = new DiscoveryFeedService(recommendations, nearby, trending, browse, search);

  it("searches and paginates with cursor", async () => {
    const first = await search.search({ query: "brunch", city: "austin", pageSize: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.items[0]?.title).toContain("Brunch");
    expect(first.nextCursor).toBeDefined();

    const second = await search.search({ query: "brunch", city: "austin", pageSize: 1, cursor: first.nextCursor });
    expect(second.items).toHaveLength(1);
  });

  it("supports category browse and nearby fallback", async () => {
    const browseRes = await browse.browse({ categoryId: "museum", city: "austin" });
    expect(browseRes.category.id).toBe("museum");

    const nearbyRes = await nearby.nearby({ lat: 30.2672, lng: -97.7431, radiusMeters: 100, query: "museum" });
    expect(nearbyRes.radius.appliedMeters).toBeGreaterThanOrEqual(100);
    expect(nearbyRes.items.length).toBeGreaterThan(0);
  });

  it("returns scoped trending, personalized recommendations and mixed feed cards", async () => {
    const trend = await trending.list({ city: "austin" });
    expect(trend.scope.type).toBe("city");

    const rec = await recommendations.recommend("u1", { city: "austin" });
    expect(rec.mode).toBe("user");
    expect(rec.items.some((item) => item.placeId === "p3")).toBe(false);

    const mixedFeed = await feed.feed("u1", "for_you", { city: "austin", pageSize: 10 });
    expect(mixedFeed.items.length).toBeGreaterThan(0);
    expect(mixedFeed.items.every((item) => item.type === "place" || item.type === "ad")).toBe(true);
  });

  it("composes city page sections", async () => {
    const page = await cityPage.getCityPage("u1", "austin");
    expect(page.city.slug).toBe("austin");
    expect(page.sections.map((section) => section.type)).toEqual(["trending", "recommended", "category_shelf"]);
  });
});
