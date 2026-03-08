export type DiscoverySortMode = "relevance" | "nearby" | "trending" | "top_rated" | "recommended" | "popular" | "newest";
export type DiscoveryFeedMode = "for_you" | "nearby" | "category" | "city" | "trending";

export interface DiscoveryFilterSet {
  openNow?: boolean;
  minRating?: number;
  hasPhotos?: boolean;
  hasReviews?: boolean;
  priceLevels?: number[];
}

export interface DiscoveryQueryContext {
  query?: string;
  categoryId?: string;
  categorySlug?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  sort?: DiscoverySortMode;
  pageSize?: number;
  cursor?: string;
  filters?: DiscoveryFilterSet;
  explain?: boolean;
}

export interface PlaceDocument {
  canonicalPlaceId: string;
  name: string;
  description?: string;
  primaryCategory: string;
  secondaryCategories: string[];
  city?: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  imageUrls: string[];
  sourceAttribution: string[];
  openNow?: boolean;
  priceLevel?: number;
  qualityScore: number;
  popularityScore: number;
  trendingScore: number;
  keywords: string[];
  updatedAt: string;
}

export interface RankingExplain {
  score: number;
  contributions: Record<string, number>;
  reasonCodes: string[];
}

export interface PlaceResultItem {
  placeId: string;
  title: string;
  shortDescription?: string;
  primaryCategory: string;
  secondaryCategories: string[];
  city?: string;
  neighborhood?: string;
  coordinates?: { lat: number; lng: number };
  coverImageUrl?: string;
  rating?: { score?: number; reviewCount?: number };
  sourceAttribution: string[];
  distanceMeters?: number;
  openNow?: boolean;
  metadata: {
    rankingScore: number;
    trendingScore?: number;
    recommendationReasons?: string[];
  };
  userContext?: {
    saved: boolean;
    reviewed: boolean;
  };
  explain?: RankingExplain;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface SearchResponse {
  query: { q?: string; normalizedQ?: string; sort: DiscoverySortMode };
  constraints: { categoryId?: string; city?: string; lat?: number; lng?: number; radiusMeters?: number };
  appliedFilters: DiscoveryFilterSet;
  items: PlaceResultItem[];
  nextCursor?: string;
  debug?: Record<string, unknown>;
}

export interface BrowseResponse {
  category: { id: string; slug: string };
  scope: { city?: string; lat?: number; lng?: number; radiusMeters?: number };
  appliedFilters: DiscoveryFilterSet;
  items: PlaceResultItem[];
  nextCursor?: string;
  debug?: Record<string, unknown>;
}

export interface NearbyResponse {
  origin: { lat: number; lng: number };
  radius: { requestedMeters: number; appliedMeters: number };
  items: PlaceResultItem[];
  nextCursor?: string;
  debug?: Record<string, unknown>;
}

export interface TrendingResponse {
  scope: { type: "global" | "city" | "category"; city?: string; categoryId?: string };
  window: { key: string };
  items: PlaceResultItem[];
  nextCursor?: string;
}

export interface RecommendationsResponse {
  mode: "user" | "guest";
  items: PlaceResultItem[];
  nextCursor?: string;
}

export interface DiscoveryFeedCardPlace {
  type: "place";
  id: string;
  place: PlaceResultItem;
}

export interface DiscoveryFeedCardAd {
  type: "ad";
  id: string;
  placementKey: string;
}

export type DiscoveryFeedCard = DiscoveryFeedCardPlace | DiscoveryFeedCardAd;

export interface DiscoveryFeedResponse {
  mode: DiscoveryFeedMode;
  items: DiscoveryFeedCard[];
  nextCursor?: string;
}

export interface CityPageSection {
  type: "trending" | "recommended" | "category_shelf";
  title: string;
  items: PlaceResultItem[];
  nextCursor?: string;
}

export interface CityPageResponse {
  city: { id: string; slug: string; name: string };
  sections: CityPageSection[];
}

export interface RecommendationProfile {
  userId: string;
  preferredCategories: string[];
  excludedPlaceIds: string[];
  seenPlaceIds: string[];
  homeCity?: string;
  coldStart: boolean;
}

export interface PlaceDiscoveryRepository {
  listPlaces(): Promise<PlaceDocument[]>;
  getRecommendationProfile(userId: string): Promise<RecommendationProfile | undefined>;
}
