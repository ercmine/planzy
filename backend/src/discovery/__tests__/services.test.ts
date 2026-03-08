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
import type { CreatorDocument, GuideDocument, PlaceDocument, UserRecommendationProfile } from "../types.js";

const NOW = Date.now();
const daysAgo = (days: number) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

const PLACES: PlaceDocument[] = [
  { canonicalPlaceId: "p1", name: "Brunch Bloom", description: "All day brunch and coffee", primaryCategory: "food", secondaryCategories: ["brunch", "coffee"], city: "austin", neighborhood: "downtown", lat: 30.2672, lng: -97.7431, rating: 4.8, reviewCount: 300, imageUrls: ["https://img/1"], sourceAttribution: ["google"], openNow: true, priceLevel: 2, qualityScore: 0.92, popularityScore: 0.81, trendingScore: 0.74, creatorId: "c1", creatorTrustScore: 0.9, chainId: "local-1", keywords: ["brunch", "coffee", "patio"], updatedAt: daysAgo(2) },
  { canonicalPlaceId: "p2", name: "Museum Arc", description: "Modern art museum", primaryCategory: "arts", secondaryCategories: ["museum"], city: "austin", neighborhood: "east", lat: 30.27, lng: -97.75, rating: 4.6, reviewCount: 900, imageUrls: ["https://img/2"], sourceAttribution: ["foursquare"], openNow: true, qualityScore: 0.89, popularityScore: 0.77, trendingScore: 0.9, creatorId: "c2", creatorTrustScore: 0.84, keywords: ["museum", "gallery"], updatedAt: daysAgo(6) },
  { canonicalPlaceId: "p3", name: "Dog Park Trails", description: "Outdoor green space", primaryCategory: "outdoors", secondaryCategories: ["dog park"], city: "dallas", neighborhood: "lake", lat: 32.7767, lng: -96.797, imageUrls: [], sourceAttribution: ["google"], qualityScore: 0.7, popularityScore: 0.6, trendingScore: 0.65, creatorId: "c3", creatorTrustScore: 0.6, keywords: ["outdoor", "park"], updatedAt: daysAgo(14) },
  { canonicalPlaceId: "p4", name: "Coffee Circuit", description: "Specialty espresso bar", primaryCategory: "food", secondaryCategories: ["coffee"], city: "austin", neighborhood: "south", lat: 30.25, lng: -97.74, imageUrls: ["https://img/4"], sourceAttribution: ["google"], qualityScore: 0.93, popularityScore: 0.73, trendingScore: 0.72, creatorId: "c1", creatorTrustScore: 0.9, chainId: "local-1", keywords: ["coffee", "espresso"], updatedAt: daysAgo(1) },
  { canonicalPlaceId: "p5", name: "Night Noodles", description: "Late night ramen", primaryCategory: "food", secondaryCategories: ["ramen"], city: "austin", neighborhood: "central", lat: 30.29, lng: -97.76, imageUrls: ["https://img/5"], sourceAttribution: ["google"], qualityScore: 0.87, popularityScore: 0.86, trendingScore: 0.91, creatorId: "c4", creatorTrustScore: 0.7, chainId: "chain-ramen", keywords: ["ramen", "late night"], updatedAt: daysAgo(3) },
  { canonicalPlaceId: "p6", name: "Hidden Gallery", description: "Tiny rotating exhibits", primaryCategory: "arts", secondaryCategories: ["gallery"], city: "austin", neighborhood: "downtown", lat: 30.265, lng: -97.741, imageUrls: ["https://img/6"], sourceAttribution: ["google"], qualityScore: 0.83, popularityScore: 0.66, trendingScore: 0.6, creatorId: "c2", creatorTrustScore: 0.84, keywords: ["gallery", "exhibit"], updatedAt: daysAgo(30), moderationState: "suppressed" },
  { canonicalPlaceId: "p7", name: "River Walk Bikes", description: "Scenic bike rentals", primaryCategory: "outdoors", secondaryCategories: ["biking"], city: "austin", neighborhood: "river", lat: 30.26, lng: -97.73, imageUrls: ["https://img/7"], sourceAttribution: ["google"], qualityScore: 0.78, popularityScore: 0.58, trendingScore: 0.52, creatorId: "c3", creatorTrustScore: 0.6, keywords: ["bike", "river"], updatedAt: daysAgo(4), isClosed: true }
];

const CREATORS: CreatorDocument[] = [
  { creatorId: "c1", displayName: "Alex Eats", city: "austin", qualityScore: 0.92, trustScore: 0.9, categoryFocus: ["food"] },
  { creatorId: "c2", displayName: "Maya Arts", city: "austin", qualityScore: 0.9, trustScore: 0.88, categoryFocus: ["arts"] },
  { creatorId: "c3", displayName: "Trail Sam", city: "dallas", qualityScore: 0.78, trustScore: 0.65, categoryFocus: ["outdoors"] }
];

const GUIDES: GuideDocument[] = [
  { guideId: "g1", creatorId: "c1", title: "48 Hours of Austin Coffee", city: "austin", category: "food", placeIds: ["p1", "p4"], qualityScore: 0.91 },
  { guideId: "g2", creatorId: "c2", title: "Modern Austin Art Crawl", city: "austin", category: "arts", placeIds: ["p2"], qualityScore: 0.88 }
];

const PROFILE: UserRecommendationProfile = {
  userId: "u1",
  categoryWeights: { food: 0.9, arts: 0.5 },
  cityWeights: { austin: 0.95 },
  savedPlaceIds: ["p1", "p4"],
  savedPlaceCategories: { food: 0.85 },
  creatorAffinity: { c1: 0.95, c2: 0.5 },
  engagementCategoryWeights: { food: 0.9, arts: 0.4 },
  hiddenPlaceIds: ["p3"],
  excludedPlaceIds: ["p3"],
  seenPlaceIds: ["p5"],
  homeCity: "austin",
  preferredCity: "austin",
  coldStart: false,
  noveltyTolerance: 0.45
};

const COLD_START: UserRecommendationProfile = {
  userId: "new-user",
  categoryWeights: {},
  cityWeights: {},
  savedPlaceIds: [],
  savedPlaceCategories: {},
  creatorAffinity: {},
  engagementCategoryWeights: {},
  hiddenPlaceIds: [],
  excludedPlaceIds: [],
  seenPlaceIds: [],
  coldStart: true,
  noveltyTolerance: 0.7
};

describe("discovery services", () => {
  const repo = new InMemoryDiscoveryRepository(PLACES, [PROFILE, COLD_START], CREATORS, GUIDES);
  const search = new PlaceSearchService(repo);
  const browse = new CategoryBrowseService(repo);
  const nearby = new NearbyDiscoveryService(repo);
  const trending = new TrendingService(repo);
  const recommendations = new RecommendationService(repo);
  const cityPage = new CityPageService(trending, recommendations, browse);
  const feed = new DiscoveryFeedService(recommendations, nearby, trending, browse, search);

  it("searches and paginates with cursor", async () => {
    const first = await search.search({ query: "coffee", city: "austin", pageSize: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBeDefined();

    const second = await search.search({ query: "coffee", city: "austin", pageSize: 1, cursor: first.nextCursor });
    expect(second.items).toHaveLength(1);
    expect(first.items[0]?.placeId).not.toBe(second.items[0]?.placeId);
  });

  it("supports category browse and nearby fallback", async () => {
    const browseRes = await browse.browse({ categoryId: "museum", city: "austin" });
    expect(browseRes.category.id).toBe("museum");

    const nearbyRes = await nearby.nearby({ lat: 30.2672, lng: -97.7431, radiusMeters: 50, query: "museum" });
    expect(nearbyRes.radius.appliedMeters).toBeGreaterThanOrEqual(50);
    expect(nearbyRes.items.length).toBeGreaterThan(0);
  });

  it("returns personalized recommendations with explainability and suppression", async () => {
    const rec = await recommendations.recommend("u1", { city: "austin", explain: true, pageSize: 10 });
    expect(rec.mode).toBe("user");
    expect(rec.items.some((item) => item.placeId === "p3")).toBe(false);
    expect(rec.items.some((item) => item.placeId === "p6")).toBe(false);
    expect(rec.items[0]?.metadata.recommendationReasons?.length).toBeGreaterThan(0);
    expect(rec.items[0]?.metadata.explanation?.signals.length).toBeGreaterThan(5);
  });

  it("balances diversity and avoids creator spam", async () => {
    const rec = await recommendations.recommend("u1", { city: "austin", pageSize: 10 });
    const creatorCounts = rec.items.reduce<Record<string, number>>((acc, item) => {
      const creator = PLACES.find((p) => p.canonicalPlaceId === item.placeId)?.creatorId;
      if (creator) acc[creator] = (acc[creator] ?? 0) + 1;
      return acc;
    }, {});

    expect(Object.values(creatorCounts).every((count) => count <= 2)).toBe(true);
  });

  it("provides cold-start fallback for guests and sparse profiles", async () => {
    const guest = await recommendations.recommend(undefined, { city: "austin", pageSize: 5 });
    expect(guest.mode).toBe("guest");
    expect(guest.items.length).toBeGreaterThan(0);

    const cold = await recommendations.recommend("new-user", { city: "austin", pageSize: 5 });
    expect(cold.items.length).toBeGreaterThan(0);
  });

  it("returns related places, creators, guides, and mixed feed cards", async () => {
    const related = await recommendations.getRelatedPlacesForPlace("u1", "p1", { city: "austin", pageSize: 4 });
    expect(related.items.length).toBeGreaterThan(0);
    expect(related.items.some((item) => item.placeId === "p1")).toBe(false);

    const creators = await recommendations.getSuggestedCreators("u1", { city: "austin" });
    expect(creators.items[0]?.creatorId).toBe("c1");

    const guides = await recommendations.getSuggestedGuides("u1", { city: "austin" });
    expect(guides.items[0]?.guideId).toBe("g1");

    const mixedFeed = await feed.feed("u1", "for_you", { city: "austin", pageSize: 10 });
    expect(mixedFeed.items.length).toBeGreaterThan(0);
    expect(mixedFeed.items.every((item) => item.type === "place" || item.type === "ad")).toBe(true);
  });

  it("composes city page sections", async () => {
    const page = await cityPage.getCityPage("u1", "austin");
    expect(page.city.slug).toBe("austin");
    expect(page.sections.map((section) => section.type)).toEqual(["trending", "recommended", "category_shelf"]);
    expect(page.sections[1]?.items.length).toBeGreaterThan(0);
  });
});
