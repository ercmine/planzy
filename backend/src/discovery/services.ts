import { Buffer } from "node:buffer";

import type {
  BrowseResponse,
  CityPageResponse,
  CursorPage,
  DiscoveryFeedCard,
  DiscoveryFeedMode,
  DiscoveryFeedResponse,
  DiscoveryQueryContext,
  NearbyResponse,
  PlaceDiscoveryRepository,
  PlaceDocument,
  PlaceResultItem,
  RankingExplain,
  RecommendationConfig,
  RecommendationContext,
  RecommendationProfile,
  RecommendationSignal,
  RecommendationsResponse,
  RelatedPlacesResponse,
  SearchResponse,
  SuggestedCreatorsResponse,
  SuggestedGuidesResponse,
  TrendingResponse,
  UserRecommendationProfile
} from "./types.js";
import { PlanTier } from "../subscriptions/types.js";
import type { PremiumExperienceService } from "../subscriptions/premiumExperience.js";
import { evaluateRankingAdjustments, RankingConfigResolver } from "./tuning.js";
import { scorePlaceForMode } from "./rankingEngine.js";

interface RankedCandidate {
  place: PlaceDocument;
  score: number;
  explain: RankingExplain;
  distanceMeters?: number;
  reasons: string[];
  signalBreakdown?: { finalScore: number; signals: RecommendationSignal[] };
  diversityBucket: string;
}

interface PagingCursorState {
  offset: number;
}

interface SearchTelemetrySnapshot {
  nearbyQueries: number;
  textQueries: number;
  categoryQueries: number;
  cacheHits: number;
  cacheMisses: number;
  zeroResults: number;
}

class SearchInfra {
  private readonly cache = new Map<string, { expiresAt: number; value: RankedCandidate[] }>();
  private readonly telemetry: SearchTelemetrySnapshot = {
    nearbyQueries: 0,
    textQueries: 0,
    categoryQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    zeroResults: 0
  };

  constructor(private readonly ttlMs = 30_000) {}

  read(key: string): RankedCandidate[] | undefined {
    const hit = this.cache.get(key);
    if (!hit || hit.expiresAt <= Date.now()) {
      if (hit) this.cache.delete(key);
      this.telemetry.cacheMisses += 1;
      return undefined;
    }
    this.telemetry.cacheHits += 1;
    return hit.value;
  }

  write(key: string, value: RankedCandidate[]): void {
    this.cache.set(key, { expiresAt: Date.now() + this.ttlMs, value });
  }

  count(mode: "nearby" | "text" | "category", results: number): void {
    if (mode === "nearby") this.telemetry.nearbyQueries += 1;
    if (mode === "text") this.telemetry.textQueries += 1;
    if (mode === "category") this.telemetry.categoryQueries += 1;
    if (results === 0) this.telemetry.zeroResults += 1;
  }

  snapshot(): SearchTelemetrySnapshot {
    return { ...this.telemetry };
  }
}

const searchInfra = new SearchInfra();

function buildSearchCacheKey(mode: string, context: DiscoveryQueryContext): string {
  return JSON.stringify({
    mode,
    query: tokenize(context.query).join(" "),
    category: context.categoryId ?? context.categorySlug,
    city: context.city,
    region: context.region,
    country: context.country,
    lat: context.lat,
    lng: context.lng,
    radius: context.radiusMeters,
    filters: context.filters,
    sort: context.sort
  });
}

function assertSearchInputs(context: DiscoveryQueryContext, mode: "nearby" | "text" | "category"): void {
  if (context.lat !== undefined && (context.lat < -90 || context.lat > 90)) throw new Error("invalid_lat");
  if (context.lng !== undefined && (context.lng < -180 || context.lng > 180)) throw new Error("invalid_lng");
  if (context.radiusMeters !== undefined && (context.radiusMeters < 100 || context.radiusMeters > 50_000)) throw new Error("invalid_radius");
  if (mode === "nearby" && (context.lat === undefined || context.lng === undefined)) throw new Error("nearby_requires_coordinates");
  if (mode === "text" && !context.query?.trim()) throw new Error("text_search_requires_q");
  if (mode === "category" && !(context.categoryId || context.categorySlug)) throw new Error("category_search_requires_category");
}


const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  weights: {
    categoryInterest: 0.19,
    cityRelevance: 0.14,
    savedPlaceSimilarity: 0.15,
    engagementSimilarity: 0.12,
    creatorAffinity: 0.1,
    qualityTrust: 0.13,
    trendingBackstop: 0.07,
    freshness: 0.06,
    novelty: 0.08,
    repetitionPenalty: 0.08,
    negativeFeedbackPenalty: 0.12
  },
  limits: {
    maxCandidates: 200,
    maxPerCategory: 3,
    maxPerCreator: 2,
    maxPerChain: 2,
    qualityFloor: 0.25
  },
  geo: {
    nearbyRadiusMeters: 4_000,
    locationBoost: 0.15
  },
  coldStartMix: {
    trendingWeight: 0.55,
    qualityWeight: 0.45
  }
};

function decodeCursor(cursor: string | undefined): PagingCursorState {
  if (!cursor) return { offset: 0 };
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as PagingCursorState;
    return { offset: Math.max(0, parsed.offset ?? 0) };
  } catch {
    return { offset: 0 };
  }
}

function encodeCursor(state: PagingCursorState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function tokenize(input: string | undefined): string[] {
  return String(input ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6_371_000;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLng = (bLng - aLng) * Math.PI / 180;
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(q));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampPageSize(value: number | undefined): number {
  const requested = Number(value ?? 20);
  return Math.max(1, Math.min(50, Number.isFinite(requested) ? requested : 20));
}

function buildRecommendationContext(context: DiscoveryQueryContext, userId?: string): RecommendationContext {
  return {
    userId,
    anonymous: !userId,
    city: context.city,
    lat: context.lat,
    lng: context.lng,
    radiusMeters: Math.max(200, Math.min(50_000, Number(context.radiusMeters ?? DEFAULT_RECOMMENDATION_CONFIG.geo.nearbyRadiusMeters))),
    surface: context.surface ?? "for_you",
    categoryFilter: context.categoryId ?? context.categorySlug,
    placeId: context.placeId,
    creatorId: context.creatorId,
    cursor: context.cursor,
    pageSize: clampPageSize(context.pageSize),
    explain: Boolean(context.explain)
  };
}

function mapResult(candidate: RankedCandidate, includeExplain: boolean): PlaceResultItem {
  return {
    placeId: candidate.place.canonicalPlaceId,
    title: candidate.place.name,
    shortDescription: candidate.place.shortDescription ?? candidate.place.description,
    primaryCategory: candidate.place.primaryCategory,
    secondaryCategories: candidate.place.secondaryCategories,
    city: candidate.place.city,
    neighborhood: candidate.place.neighborhood,
    coordinates: { lat: candidate.place.lat, lng: candidate.place.lng },
    coverImageUrl: candidate.place.imageUrls[0],
    rating: { score: candidate.place.rating, reviewCount: candidate.place.reviewCount },
    sourceAttribution: candidate.place.sourceAttribution,
    distanceMeters: candidate.distanceMeters,
    openNow: candidate.place.openNow,
    metadata: {
      rankingScore: candidate.score,
      trendingScore: candidate.place.trendingScore,
      recommendationReasons: candidate.reasons,
      description: candidate.place.descriptionMetadata,
      diversityBucket: candidate.diversityBucket,
      explanation: includeExplain ? candidate.signalBreakdown : undefined
    },
    longDescription: candidate.place.longDescription,
    userContext: { saved: false, reviewed: false },
    explain: includeExplain ? candidate.explain : undefined
  };
}

function paginate<T>(items: T[], pageSize: number, cursor?: string): CursorPage<T> {
  const state = decodeCursor(cursor);
  const page = items.slice(state.offset, state.offset + pageSize);
  const nextOffset = state.offset + page.length;
  return {
    items: page,
    nextCursor: nextOffset < items.length ? encodeCursor({ offset: nextOffset }) : undefined
  };
}

function applyBaseEligibility(place: PlaceDocument): boolean {
  if (place.moderationState === "suppressed" || place.isClosed) return false;
  return true;
}


function recommendationLimitMultiplier(planTier: PlanTier): number {
  if (planTier === PlanTier.ELITE) return 2.2;
  if (planTier === PlanTier.PLUS) return 1.5;
  return 1;
}

function applyBaseFilters(place: PlaceDocument, context: DiscoveryQueryContext): boolean {
  if (!applyBaseEligibility(place)) return false;
  if (context.filters?.openNow && place.openNow !== true) return false;
  if (context.filters?.minRating && (place.rating ?? 0) < context.filters.minRating) return false;
  if (context.filters?.hasPhotos && place.imageUrls.length === 0) return false;
  if (context.filters?.hasReviews && (place.reviewCount ?? 0) === 0) return false;
  if (context.filters?.priceLevels?.length && !context.filters.priceLevels.includes(place.priceLevel ?? -1)) return false;
  if (context.filters?.priceLevelMax !== undefined && (place.priceLevel ?? Number.MAX_SAFE_INTEGER) > context.filters.priceLevelMax) return false;
  if (context.city && String(place.city ?? "").toLowerCase() !== context.city.toLowerCase()) return false;
  if (context.region && !(place.neighborhood ?? "").toLowerCase().includes(context.region.toLowerCase())) return false;
  if (context.country && !place.sourceAttribution.join(" ").toLowerCase().includes(context.country.toLowerCase())) return false;
  if ((context.categoryId || context.categorySlug)) {
    const token = String(context.categoryId ?? context.categorySlug).toLowerCase();
    const categories = [place.primaryCategory, ...place.secondaryCategories].join(" ").toLowerCase();
    if (!categories.includes(token)) return false;
  }
  return true;
}

class CandidateGenerator {
  constructor(private readonly repo: PlaceDiscoveryRepository, private readonly premiumExperience?: PremiumExperienceService, private readonly resolver?: RankingConfigResolver) {}

  async generate(profile: UserRecommendationProfile | undefined, context: RecommendationContext): Promise<PlaceDocument[]> {
    const all = (await this.repo.listPlaces()).filter((place) => applyBaseEligibility(place) && place.qualityScore >= DEFAULT_RECOMMENDATION_CONFIG.limits.qualityFloor);
    const byCity = all.filter((place) => !context.city || String(place.city ?? "").toLowerCase() === context.city.toLowerCase());
    const cityPool = byCity.length > 0 ? byCity : all;

    const profileCategoryPool = profile
      ? cityPool.filter((place) => profile.categoryWeights[place.primaryCategory] || profile.savedPlaceCategories[place.primaryCategory])
      : [];
    const creatorPool = profile
      ? cityPool.filter((place) => place.creatorId && (profile.creatorAffinity[place.creatorId] ?? 0) > 0)
      : [];
    const nearbyPool = context.lat !== undefined && context.lng !== undefined
      ? cityPool.filter((place) => distanceMeters(context.lat!, context.lng!, place.lat, place.lng) <= context.radiusMeters)
      : [];
    const trendingPool = [...cityPool].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 60);
    const highQualityPool = [...cityPool].sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 60);

    const merged = new Map<string, PlaceDocument>();
    for (const pool of [nearbyPool, profileCategoryPool, creatorPool, trendingPool, highQualityPool]) {
      for (const place of pool) {
        merged.set(place.canonicalPlaceId, place);
      }
    }

    const tier = context.userId ? this.premiumExperience?.getPlanTier(context.userId) ?? PlanTier.FREE : PlanTier.FREE;
    const maxCandidates = Math.floor(DEFAULT_RECOMMENDATION_CONFIG.limits.maxCandidates * recommendationLimitMultiplier(tier));
    return [...merged.values()].slice(0, maxCandidates);
  }
}

class RecommendationScorer {
  score(place: PlaceDocument, context: RecommendationContext, profile: RecommendationProfile | undefined): RankedCandidate {
    const weights = DEFAULT_RECOMMENDATION_CONFIG.weights;
    const categories = [place.primaryCategory, ...place.secondaryCategories];
    const categorySignal = profile ? Math.max(...categories.map((c) => profile.categoryWeights[c] ?? profile.engagementCategoryWeights[c] ?? 0), 0.1) : 0.35;
    const citySignal = context.city
      ? clamp01(String(place.city ?? "").toLowerCase() === context.city.toLowerCase() ? 1 : 0.2)
      : profile?.homeCity && place.city
        ? clamp01(place.city.toLowerCase() === profile.homeCity.toLowerCase() ? 0.8 : 0.3)
        : 0.55;

    const savedSimilarity = profile ? clamp01((profile.savedPlaceCategories[place.primaryCategory] ?? 0) * 0.8 + (profile.savedPlaceIds.includes(place.canonicalPlaceId) ? -0.5 : 0.2)) : 0.35;
    const engagement = profile ? clamp01(profile.engagementCategoryWeights[place.primaryCategory] ?? 0.3) : 0.4;
    const creatorAffinity = profile && place.creatorId ? clamp01(profile.creatorAffinity[place.creatorId] ?? 0.2) : 0.2;
    const qualityTrust = clamp01((place.qualityScore * 0.7) + ((place.creatorTrustScore ?? 0.5) * 0.3));
    const trending = clamp01((place.popularityScore * 0.4) + (place.trendingScore * 0.6));

    const freshnessDays = (Date.now() - new Date(place.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const freshness = clamp01(1 - Math.min(120, freshnessDays) / 120);
    const novelty = profile ? clamp01(1 - (profile.categoryWeights[place.primaryCategory] ?? 0.2) * (1 - profile.noveltyTolerance)) : 0.5;
    const repetitionPenalty = profile?.seenPlaceIds.includes(place.canonicalPlaceId) ? 1 : 0;
    const negativeFeedbackPenalty = profile && (profile.hiddenPlaceIds.includes(place.canonicalPlaceId) || profile.excludedPlaceIds.includes(place.canonicalPlaceId)) ? 1 : 0;

    const signals: RecommendationSignal[] = [
      { signal: "category_interest", value: categorySignal, weight: weights.categoryInterest, contribution: categorySignal * weights.categoryInterest, reasonCode: "matched_favorite_category" },
      { signal: "location_relevance", value: citySignal, weight: weights.cityRelevance, contribution: citySignal * weights.cityRelevance, reasonCode: "city_context_match" },
      { signal: "saved_place_similarity", value: savedSimilarity, weight: weights.savedPlaceSimilarity, contribution: savedSimilarity * weights.savedPlaceSimilarity, reasonCode: "similar_to_saved_places" },
      { signal: "engagement_history", value: engagement, weight: weights.engagementSimilarity, contribution: engagement * weights.engagementSimilarity, reasonCode: "aligned_with_recent_engagement" },
      { signal: "creator_affinity", value: creatorAffinity, weight: weights.creatorAffinity, contribution: creatorAffinity * weights.creatorAffinity, reasonCode: "creator_you_engage_with" },
      { signal: "quality_trust", value: qualityTrust, weight: weights.qualityTrust, contribution: qualityTrust * weights.qualityTrust, reasonCode: "trusted_high_quality_place" },
      { signal: "trending_backstop", value: trending, weight: weights.trendingBackstop, contribution: trending * weights.trendingBackstop, reasonCode: "trending_backstop" },
      { signal: "freshness", value: freshness, weight: weights.freshness, contribution: freshness * weights.freshness, reasonCode: "fresh_listing_signal" },
      { signal: "novelty", value: novelty, weight: weights.novelty, contribution: novelty * weights.novelty, reasonCode: "adjacent_discovery" },
      { signal: "repetition_penalty", value: repetitionPenalty, weight: -weights.repetitionPenalty, contribution: repetitionPenalty * -weights.repetitionPenalty, reasonCode: "recently_seen_penalty" },
      { signal: "negative_feedback", value: negativeFeedbackPenalty, weight: -weights.negativeFeedbackPenalty, contribution: negativeFeedbackPenalty * -weights.negativeFeedbackPenalty, reasonCode: "hidden_or_not_interested_penalty" }
    ];

    if (profile?.coldStart) {
      const base = (trending * DEFAULT_RECOMMENDATION_CONFIG.coldStartMix.trendingWeight) + (qualityTrust * DEFAULT_RECOMMENDATION_CONFIG.coldStartMix.qualityWeight);
      signals.push({ signal: "trending_backstop", value: base, weight: 0.4, contribution: base * 0.4, reasonCode: "cold_start_quality_trending_mix" });
    }

    const score = signals.reduce((sum, signal) => sum + signal.contribution, 0);
    const reasonCodes = signals.filter((signal) => signal.contribution > 0.02).map((signal) => signal.reasonCode).slice(0, 4);
    return {
      place,
      score,
      reasons: reasonCodes,
      diversityBucket: `${place.primaryCategory}:${place.city ?? "global"}`,
      explain: {
        score,
        contributions: Object.fromEntries(signals.map((signal) => [signal.signal, signal.contribution])),
        reasonCodes
      },
      signalBreakdown: { finalScore: score, signals }
    };
  }
}

class DiversityBalancer {
  balance(candidates: RankedCandidate[]): RankedCandidate[] {
    const maxPerCategory = DEFAULT_RECOMMENDATION_CONFIG.limits.maxPerCategory;
    const maxPerCreator = DEFAULT_RECOMMENDATION_CONFIG.limits.maxPerCreator;
    const maxPerChain = DEFAULT_RECOMMENDATION_CONFIG.limits.maxPerChain;
    const categoryCount = new Map<string, number>();
    const creatorCount = new Map<string, number>();
    const chainCount = new Map<string, number>();

    const diversified: RankedCandidate[] = [];
    for (const candidate of candidates) {
      const category = candidate.place.primaryCategory;
      const creator = candidate.place.creatorId ?? "";
      const chain = candidate.place.chainId ?? "";
      if ((categoryCount.get(category) ?? 0) >= maxPerCategory) continue;
      if (creator && (creatorCount.get(creator) ?? 0) >= maxPerCreator) continue;
      if (chain && (chainCount.get(chain) ?? 0) >= maxPerChain) continue;
      categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);
      if (creator) creatorCount.set(creator, (creatorCount.get(creator) ?? 0) + 1);
      if (chain) chainCount.set(chain, (chainCount.get(chain) ?? 0) + 1);
      diversified.push(candidate);
    }

    return diversified.length > 0 ? diversified : candidates;
  }
}

async function rankPlaces(repo: PlaceDiscoveryRepository, context: DiscoveryQueryContext, mode: "nearby" | "text" | "category", resolver?: RankingConfigResolver): Promise<RankedCandidate[]> {
  assertSearchInputs(context, mode);
  const cacheKey = buildSearchCacheKey(mode, context);
  const cached = searchInfra.read(cacheKey);
  if (cached) {
    searchInfra.count(mode, cached.length);
    return cached;
  }

  const places = (await repo.listPlaces()).filter((place) => applyBaseFilters(place, context));
  const radius = Math.max(100, Math.min(50_000, Number(context.radiusMeters ?? 4_000)));
  const resolved = resolver?.resolve({ city: context.city, categoryId: context.categoryId ?? context.categorySlug, surface: context.surface });

  const ranked = places
    .map((place): RankedCandidate => {
      const distance = context.lat !== undefined && context.lng !== undefined
        ? distanceMeters(context.lat, context.lng, place.lat, place.lng)
        : undefined;
      const ranking = scorePlaceForMode({ place, mode, context, distanceMeters: distance });
      const tuned = resolved ? evaluateRankingAdjustments(place, ranking.score, resolved, { city: context.city, categoryId: context.categoryId, surface: context.surface, provider: place.sourceAttribution[0] }) : { score: ranking.score, reasons: [], excluded: false };
      return {
        place,
        score: tuned.score,
        distanceMeters: distance,
        reasons: [mode === "text" && ranking.components.text > 0.7 ? "strong_text_match" : `${mode}_match`, ...tuned.reasons],
        diversityBucket: `${place.primaryCategory}:${place.city ?? "global"}`,
        explain: { score: ranking.score, contributions: ranking.components, reasonCodes: [mode] }
      };
    })
    .filter((candidate) => !resolved || !evaluateRankingAdjustments(candidate.place, candidate.score, resolved, { city: context.city, categoryId: context.categoryId, surface: context.surface, provider: candidate.place.sourceAttribution[0] }).excluded)
    .filter((candidate) => candidate.distanceMeters === undefined || candidate.distanceMeters <= radius)
    .sort((a, b) => b.score - a.score || a.place.canonicalPlaceId.localeCompare(b.place.canonicalPlaceId));

  searchInfra.write(cacheKey, ranked);
  searchInfra.count(mode, ranked.length);
  return ranked;
}

export class PlaceSearchService {
  constructor(private readonly repo: PlaceDiscoveryRepository, private readonly resolver?: RankingConfigResolver) {}

  async search(context: DiscoveryQueryContext): Promise<SearchResponse> {
    const ranked = await rankPlaces(this.repo, context, "text", this.resolver);
    const page = paginate(ranked, clampPageSize(context.pageSize), context.cursor);
    return {
      query: { q: context.query, normalizedQ: tokenize(context.query).join(" "), sort: context.sort ?? "relevance" },
      constraints: { categoryId: context.categoryId ?? context.categorySlug, city: context.city, region: context.region, country: context.country, lat: context.lat, lng: context.lng, radiusMeters: context.radiusMeters },
      appliedFilters: context.filters ?? {},
      items: page.items.map((item) => mapResult(item, Boolean(context.explain))),
      nextCursor: page.nextCursor,
      debug: context.explain ? { candidateCount: ranked.length, telemetry: searchInfra.snapshot(), rankingMode: "text" } : undefined
    };
  }
}

export class CategoryBrowseService {
  constructor(private readonly repo: PlaceDiscoveryRepository, private readonly resolver?: RankingConfigResolver) {}

  async browse(context: DiscoveryQueryContext): Promise<BrowseResponse> {
    const ranked = await rankPlaces(this.repo, context, "category", this.resolver);
    const page = paginate(ranked, clampPageSize(context.pageSize), context.cursor);
    return {
      category: { id: context.categoryId ?? context.categorySlug ?? "all", slug: context.categorySlug ?? context.categoryId ?? "all" },
      scope: { city: context.city, region: context.region, country: context.country, lat: context.lat, lng: context.lng, radiusMeters: context.radiusMeters },
      appliedFilters: context.filters ?? {},
      items: page.items.map((item) => mapResult(item, Boolean(context.explain))),
      nextCursor: page.nextCursor,
      debug: context.explain ? { categoryThresholdApplied: true, telemetry: searchInfra.snapshot(), rankingMode: "category" } : undefined
    };
  }
}

export class NearbyDiscoveryService {
  constructor(private readonly repo: PlaceDiscoveryRepository, private readonly resolver?: RankingConfigResolver) {}

  async nearby(context: DiscoveryQueryContext): Promise<NearbyResponse> {
    const requested = Math.max(200, Math.min(50_000, Number(context.radiusMeters ?? 2_500)));
    const ranked = await rankPlaces(this.repo, { ...context, radiusMeters: requested }, "nearby", this.resolver);
    const expanded = ranked.length >= 3 ? ranked : await rankPlaces(this.repo, { ...context, radiusMeters: Math.min(requested * 2, 50_000) }, "nearby", this.resolver);
    const page = paginate(expanded, clampPageSize(context.pageSize), context.cursor);
    return {
      origin: { lat: context.lat ?? 0, lng: context.lng ?? 0 },
      radius: { requestedMeters: requested, appliedMeters: ranked.length >= 3 ? requested : Math.min(requested * 2, 50_000) },
      items: page.items.map((item) => mapResult(item, Boolean(context.explain))),
      nextCursor: page.nextCursor,
      debug: context.explain ? { fallbackExpanded: ranked.length < 3, telemetry: searchInfra.snapshot(), rankingMode: "nearby" } : undefined
    };
  }
}

export class TrendingService {
  constructor(private readonly repo: PlaceDiscoveryRepository, private readonly resolver?: RankingConfigResolver) {}

  async list(context: DiscoveryQueryContext): Promise<TrendingResponse> {
    const resolved = this.resolver?.resolve({ city: context.city, categoryId: context.categoryId ?? context.categorySlug, surface: context.surface });
    const places = (await this.repo.listPlaces()).filter((place) => applyBaseFilters(place, context));
    const scoped = places.filter((place) => (!context.city || place.city === context.city) && (!context.categoryId || place.primaryCategory.includes(context.categoryId)));
    const sorted = [...scoped].sort((a, b) => {
      const left = resolved ? evaluateRankingAdjustments(a, a.trendingScore, resolved, { city: context.city, categoryId: context.categoryId, provider: a.sourceAttribution[0] }).score : a.trendingScore;
      const right = resolved ? evaluateRankingAdjustments(b, b.trendingScore, resolved, { city: context.city, categoryId: context.categoryId, provider: b.sourceAttribution[0] }).score : b.trendingScore;
      return right - left || b.popularityScore - a.popularityScore;
    });
    const page = paginate(sorted, clampPageSize(context.pageSize), context.cursor);
    return {
      scope: { type: context.city ? "city" : context.categoryId ? "category" : "global", city: context.city, categoryId: context.categoryId },
      window: { key: "7d" },
      items: page.items.map((place) => mapResult({ place, score: place.trendingScore, reasons: ["trending"], diversityBucket: `${place.primaryCategory}:${place.city ?? "global"}`, explain: { score: place.trendingScore, contributions: { trending: place.trendingScore }, reasonCodes: ["trending"] } }, false)),
      nextCursor: page.nextCursor
    };
  }
}

export class RecommendationService {
  private readonly generator: CandidateGenerator;
  private readonly scorer = new RecommendationScorer();
  private readonly balancer = new DiversityBalancer();

  constructor(private readonly repo: PlaceDiscoveryRepository, private readonly premiumExperience?: PremiumExperienceService, private readonly resolver?: RankingConfigResolver) {
    this.generator = new CandidateGenerator(repo, premiumExperience);
  }

  async getPersonalizedRecommendations(userId: string | undefined, context: DiscoveryQueryContext): Promise<RecommendationsResponse> {
    return this.recommend(userId, context);
  }

  async getRecommendedPlacesForContext(userId: string | undefined, context: DiscoveryQueryContext): Promise<RecommendationsResponse> {
    return this.recommend(userId, context);
  }

  async recommend(userId: string | undefined, context: DiscoveryQueryContext): Promise<RecommendationsResponse> {
    const profile = userId ? await this.repo.getRecommendationProfile(userId) : undefined;
    const recommendationContext = buildRecommendationContext(context, userId);
    const candidates = await this.generator.generate(profile, recommendationContext);
    const premiumTier = userId ? (this.premiumExperience?.getRecommendationTierContext(userId)?.tier ?? "standard") : "standard";
    const rerankBoost = premiumTier === "elite" ? 1.12 : premiumTier === "enhanced" ? 1.06 : 1;

    const ranked = candidates
      .filter((place) => applyBaseFilters(place, context))
      .map((place) => {
        const base = this.scorer.score(place, recommendationContext, profile);
        const resolved = this.resolver?.resolve({ city: recommendationContext.city, categoryId: recommendationContext.categoryFilter, surface: recommendationContext.surface });
        if (resolved) {
          const tuned = evaluateRankingAdjustments(place, base.score, resolved, { city: recommendationContext.city, categoryId: recommendationContext.categoryFilter, surface: recommendationContext.surface, provider: place.sourceAttribution[0] });
          base.score = tuned.score;
          base.reasons = [...base.reasons, ...tuned.reasons];
        }
        if (premiumTier === "standard") return base;
        const qualityLift = 1 + ((place.qualityScore + (place.creatorTrustScore ?? 0.4)) / 2) * 0.08;
        const personalizedLift = base.reasons.some((reason) => reason.includes("you")) ? rerankBoost : 1;
        return { ...base, score: base.score * qualityLift * personalizedLift };
      })
      .filter((candidate) => !profile?.hiddenPlaceIds.includes(candidate.place.canonicalPlaceId))
      .sort((a, b) => b.score - a.score || a.place.canonicalPlaceId.localeCompare(b.place.canonicalPlaceId));
    const diversified = this.balancer.balance(ranked);
    const page = paginate(diversified, recommendationContext.pageSize, recommendationContext.cursor);
    return {
      mode: profile ? "user" : "guest",
      items: page.items.map((item) => mapResult(item, recommendationContext.explain)),
      nextCursor: page.nextCursor
    };
  }

  async getRelatedPlacesForPlace(userId: string | undefined, placeId: string, context: DiscoveryQueryContext): Promise<RelatedPlacesResponse> {
    const places = await this.repo.listPlaces();
    const anchor = places.find((place) => place.canonicalPlaceId === placeId);
    if (!anchor) return { placeId, items: [] };

    const profile = userId ? await this.repo.getRecommendationProfile(userId) : undefined;
    const recommendationContext = buildRecommendationContext({ ...context, city: context.city ?? anchor.city, categoryId: context.categoryId ?? anchor.primaryCategory, surface: "place_detail" }, userId);

    const related = places
      .filter((place) => place.canonicalPlaceId !== placeId)
      .filter((place) => applyBaseFilters(place, context))
      .map((place) => {
        const candidate = this.scorer.score(place, recommendationContext, profile);
        const overlap = [place.primaryCategory, ...place.secondaryCategories].some((category) => [anchor.primaryCategory, ...anchor.secondaryCategories].includes(category)) ? 0.15 : 0;
        candidate.score += overlap;
        if (overlap > 0) candidate.reasons = [...candidate.reasons, "related_category_overlap"];
        return candidate;
      })
      .sort((a, b) => b.score - a.score);

    const deduped = this.balancer.balance(related);
    const page = paginate(deduped, clampPageSize(context.pageSize ?? 8), context.cursor);
    return { placeId, items: page.items.map((item) => mapResult(item, Boolean(context.explain))), nextCursor: page.nextCursor };
  }

  async getSuggestedCreators(userId: string | undefined, context: DiscoveryQueryContext): Promise<SuggestedCreatorsResponse> {
    const profile = userId ? await this.repo.getRecommendationProfile(userId) : undefined;
    const creators = await this.repo.listCreators();
    const items = creators
      .map((creator) => {
        const affinity = profile ? profile.creatorAffinity[creator.creatorId] ?? 0.2 : 0.2;
        const categoryFit = profile ? Math.max(...creator.categoryFocus.map((category) => profile.categoryWeights[category] ?? 0), 0.2) : 0.3;
        const cityFit = context.city && creator.city ? (creator.city.toLowerCase() === context.city.toLowerCase() ? 1 : 0.4) : 0.7;
        const score = affinity * 0.45 + categoryFit * 0.25 + creator.qualityScore * 0.15 + creator.trustScore * 0.15 * cityFit;
        return {
          creatorId: creator.creatorId,
          displayName: creator.displayName,
          score,
          reasons: [affinity > 0.4 ? "creator_you_follow_or_view" : "trusted_creator", cityFit > 0.8 ? "active_in_current_city" : "broad_creator_discovery"]
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, clampPageSize(context.pageSize ?? 6));

    return { items };
  }

  async getSuggestedGuides(userId: string | undefined, context: DiscoveryQueryContext): Promise<SuggestedGuidesResponse> {
    const profile = userId ? await this.repo.getRecommendationProfile(userId) : undefined;
    const guides = await this.repo.listGuides();
    const items = guides
      .filter((guide) => !context.city || !guide.city || guide.city.toLowerCase() === context.city.toLowerCase())
      .map((guide) => {
        const categoryWeight = profile ? profile.categoryWeights[guide.category] ?? profile.engagementCategoryWeights[guide.category] ?? 0.3 : 0.3;
        const creatorWeight = profile ? profile.creatorAffinity[guide.creatorId] ?? 0.25 : 0.25;
        const score = categoryWeight * 0.4 + creatorWeight * 0.3 + guide.qualityScore * 0.3;
        return {
          guideId: guide.guideId,
          creatorId: guide.creatorId,
          title: guide.title,
          score,
          reasons: [categoryWeight > 0.45 ? "guide_matches_your_interests" : "high_quality_guide", creatorWeight > 0.45 ? "from_creator_you_engage_with" : ""
          ].filter(Boolean)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, clampPageSize(context.pageSize ?? 6));

    return { items };
  }
}

export class AdInsertionService {
  insertEveryTen(organic: DiscoveryFeedCard[]): DiscoveryFeedCard[] {
    const mixed: DiscoveryFeedCard[] = [];
    let shown = 0;

    for (const card of organic) {
      if (shown > 0 && shown % 10 === 0) {
        mixed.push({ type: "ad", id: `ad-${shown}`, placementKey: "feed-inline" });
      }
      mixed.push(card);
      shown += 1;
    }

    return mixed;
  }
}

export class DiscoveryFeedService {
  private readonly adService = new AdInsertionService();

  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly nearbyService: NearbyDiscoveryService,
    private readonly trendingService: TrendingService,
    private readonly browseService: CategoryBrowseService,
    private readonly searchService: PlaceSearchService,
    private readonly premiumExperience?: PremiumExperienceService
  ) {}

  async feed(userId: string | undefined, mode: DiscoveryFeedMode, context: DiscoveryQueryContext): Promise<DiscoveryFeedResponse> {
    let organicItems: PlaceResultItem[] = [];
    if (mode === "for_you") {
      organicItems = (await this.recommendationService.recommend(userId, { ...context, surface: "home" })).items;
    } else if (mode === "nearby") {
      organicItems = (await this.nearbyService.nearby(context)).items;
    } else if (mode === "trending") {
      organicItems = (await this.trendingService.list(context)).items;
    } else if (mode === "category") {
      organicItems = (await this.browseService.browse(context)).items;
    } else {
      organicItems = (await this.searchService.search(context)).items;
    }

    const organicCards: DiscoveryFeedCard[] = organicItems.map((item) => ({ type: "place", id: item.placeId, place: item }));
    const cards = this.adService.insertEveryTen(organicCards);
    return {
      mode,
      items: cards,
      nextCursor: undefined
    };
  }
}

export class CityPageService {
  constructor(
    private readonly trendingService: TrendingService,
    private readonly recommendationService: RecommendationService,
    private readonly browseService: CategoryBrowseService
  ) {}

  async getCityPage(userId: string | undefined, city: string): Promise<CityPageResponse> {
    const trending = await this.trendingService.list({ city, pageSize: 8 });
    const recommended = await this.recommendationService.recommend(userId, { city, pageSize: 8, surface: "city" });
    const foodShelf = await this.browseService.browse({ city, categoryId: "food", pageSize: 8 });
    return {
      city: { id: city.toLowerCase().replace(/\s+/g, "-"), slug: city.toLowerCase().replace(/\s+/g, "-"), name: city },
      sections: [
        { type: "trending", title: "Trending now", items: trending.items, nextCursor: trending.nextCursor },
        { type: "recommended", title: "For you in this city", items: recommended.items, nextCursor: recommended.nextCursor },
        { type: "category_shelf", title: "Food picks", items: foodShelf.items, nextCursor: foodShelf.nextCursor }
      ]
    };
  }
}
