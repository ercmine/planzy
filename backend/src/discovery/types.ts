export type DiscoverySortMode = "relevance" | "nearby" | "trending" | "top_rated" | "recommended" | "popular" | "newest";
export type DiscoveryFeedMode = "for_you" | "nearby" | "category" | "city" | "trending";
export type RecommendationSurface = "home" | "for_you" | "city" | "category" | "place_detail" | "creator" | "guide";

export interface DiscoveryFilterSet {
  openNow?: boolean;
  minRating?: number;
  hasPhotos?: boolean;
  hasReviews?: boolean;
  priceLevels?: number[];
  priceLevelMax?: number;
}

export interface DiscoveryQueryContext {
  query?: string;
  categoryId?: string;
  categorySlug?: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  sort?: DiscoverySortMode;
  pageSize?: number;
  cursor?: string;
  filters?: DiscoveryFilterSet;
  explain?: boolean;
  surface?: RecommendationSurface;
  placeId?: string;
  creatorId?: string;
}

export interface PlaceDocument {
  canonicalPlaceId: string;
  name: string;
  shortDescription?: string;
  longDescription?: string;
  description?: string;
  descriptionMetadata?: {
    sourceType?: string;
    sourceProvider?: string;
    attribution?: string;
    confidence?: number;
    generatedAt?: string;
    version?: number;
    language?: string;
    generationMethod?: string;
  };
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
  creatorId?: string;
  creatorTrustScore?: number;
  chainId?: string;
  moderationState?: "active" | "suppressed";
  isClosed?: boolean;
  firstPartySignals?: {
    reviewCount: number;
    creatorVideoCount: number;
    saveCount: number;
    publicGuideCount: number;
    trustedReviewCount: number;
    helpfulVoteCount: number;
    engagementVelocity30d: number;
    qualityBoost: number;
  };
}

export interface CreatorDocument {
  creatorId: string;
  displayName: string;
  city?: string;
  qualityScore: number;
  trustScore: number;
  categoryFocus: string[];
}

export interface GuideDocument {
  guideId: string;
  creatorId: string;
  title: string;
  city?: string;
  category: string;
  placeIds: string[];
  qualityScore: number;
}

export type RecommendationSignalName =
  | "category_interest"
  | "saved_place_similarity"
  | "location_relevance"
  | "engagement_history"
  | "creator_affinity"
  | "quality_trust"
  | "trending_backstop"
  | "freshness"
  | "novelty"
  | "repetition_penalty"
  | "negative_feedback";

export interface RecommendationSignal {
  signal: RecommendationSignalName;
  value: number;
  weight: number;
  contribution: number;
  reasonCode: string;
}

export interface SignalBreakdown {
  finalScore: number;
  signals: RecommendationSignal[];
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
    description?: PlaceDocument["descriptionMetadata"];
    diversityBucket?: string;
    explanation?: SignalBreakdown;
  };
  longDescription?: string;
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
  constraints: { categoryId?: string; city?: string; region?: string; country?: string; lat?: number; lng?: number; radiusMeters?: number };
  appliedFilters: DiscoveryFilterSet;
  items: PlaceResultItem[];
  nextCursor?: string;
  debug?: Record<string, unknown>;
}

export interface BrowseResponse {
  category: { id: string; slug: string };
  scope: { city?: string; region?: string; country?: string; lat?: number; lng?: number; radiusMeters?: number };
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

export interface RelatedPlacesResponse {
  placeId: string;
  items: PlaceResultItem[];
  nextCursor?: string;
}

export interface SuggestedCreator {
  creatorId: string;
  displayName: string;
  score: number;
  reasons: string[];
}

export interface SuggestedGuide {
  guideId: string;
  creatorId: string;
  title: string;
  score: number;
  reasons: string[];
}

export interface SuggestedCreatorsResponse {
  items: SuggestedCreator[];
}

export interface SuggestedGuidesResponse {
  items: SuggestedGuide[];
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

export interface PlaceStreamReviewSummary {
  reviewId: string;
  creatorId?: string;
  creatorName?: string;
  creatorHandle?: string;
  caption?: string;
  rating?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface PlaceStreamItem {
  canonicalPlaceId: string;
  place: PlaceResultItem;
  hero: {
    mediaType: "video" | "image" | "fallback";
    autoplayEligible: boolean;
    imageUrl?: string;
    videoUrl?: string;
  };
  reviewStack: {
    totalReviews: number;
    currentReviewIndex: number;
    reviews: PlaceStreamReviewSummary[];
  };
  decisionState: {
    saved: boolean;
    passed: boolean;
  };
}

export interface DiscoveryFeedResponse {
  mode: DiscoveryFeedMode;
  items: DiscoveryFeedCard[];
  placeStreamItems?: PlaceStreamItem[];
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

export interface UserRecommendationProfile {
  userId: string;
  categoryWeights: Record<string, number>;
  cityWeights: Record<string, number>;
  savedPlaceIds: string[];
  savedPlaceCategories: Record<string, number>;
  creatorAffinity: Record<string, number>;
  engagementCategoryWeights: Record<string, number>;
  hiddenPlaceIds: string[];
  excludedPlaceIds: string[];
  seenPlaceIds: string[];
  homeCity?: string;
  preferredCity?: string;
  coldStart: boolean;
  noveltyTolerance: number;
}

export type RecommendationProfile = UserRecommendationProfile;

export interface RecommendationContext {
  userId?: string;
  anonymous: boolean;
  city?: string;
  lat?: number;
  lng?: number;
  radiusMeters: number;
  surface: RecommendationSurface;
  categoryFilter?: string;
  placeId?: string;
  creatorId?: string;
  cursor?: string;
  pageSize: number;
  explain: boolean;
}

export interface RecommendationConfig {
  weights: {
    categoryInterest: number;
    cityRelevance: number;
    savedPlaceSimilarity: number;
    engagementSimilarity: number;
    creatorAffinity: number;
    qualityTrust: number;
    trendingBackstop: number;
    freshness: number;
    novelty: number;
    repetitionPenalty: number;
    negativeFeedbackPenalty: number;
  };
  limits: {
    maxCandidates: number;
    maxPerCategory: number;
    maxPerCreator: number;
    maxPerChain: number;
    qualityFloor: number;
  };
  geo: {
    nearbyRadiusMeters: number;
    locationBoost: number;
  };
  coldStartMix: {
    trendingWeight: number;
    qualityWeight: number;
  };
}

export interface PlaceDiscoveryRepository {
  listPlaces(): Promise<PlaceDocument[]>;
  listCreators(): Promise<CreatorDocument[]>;
  listGuides(): Promise<GuideDocument[]>;
  getRecommendationProfile(userId: string): Promise<UserRecommendationProfile | undefined>;
}
