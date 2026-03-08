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
  RecommendationsResponse,
  RecommendationProfile,
  SearchResponse,
  TrendingResponse
} from "./types.js";

interface RankedCandidate {
  place: PlaceDocument;
  score: number;
  explain: RankingExplain;
  distanceMeters?: number;
}

interface PagingCursorState {
  offset: number;
}

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

function clampPageSize(value: number | undefined): number {
  const requested = Number(value ?? 20);
  return Math.max(1, Math.min(50, Number.isFinite(requested) ? requested : 20));
}

function mapResult(candidate: RankedCandidate, includeExplain: boolean, reasons?: string[]): PlaceResultItem {
  return {
    placeId: candidate.place.canonicalPlaceId,
    title: candidate.place.name,
    shortDescription: candidate.place.description,
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
      recommendationReasons: reasons
    },
    userContext: { saved: false, reviewed: false },
    explain: includeExplain ? candidate.explain : undefined
  };
}

async function rankPlaces(repo: PlaceDiscoveryRepository, context: DiscoveryQueryContext, profile?: RecommendationProfile): Promise<RankedCandidate[]> {
  const places = await repo.listPlaces();
  const terms = tokenize(context.query);
  const categoryToken = (context.categoryId ?? context.categorySlug ?? "").toLowerCase();
  const cityToken = String(context.city ?? "").toLowerCase();
  const radius = Math.max(100, Math.min(50_000, Number(context.radiusMeters ?? 4_000)));

  return places
    .map((place): RankedCandidate => {
      const textCorpus = [place.name, place.description, ...place.keywords, place.primaryCategory, ...place.secondaryCategories, place.city, place.neighborhood]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const textMatch = terms.length === 0 ? 0.6 : terms.filter((term) => textCorpus.includes(term)).length / terms.length;
      const categoryFit = !categoryToken ? 0.6 : ([place.primaryCategory, ...place.secondaryCategories].join(" ").toLowerCase().includes(categoryToken) ? 1 : 0);
      const cityFit = !cityToken ? 0.5 : String(place.city ?? "").toLowerCase().includes(cityToken) ? 1 : 0;
      const distance = context.lat !== undefined && context.lng !== undefined
        ? distanceMeters(context.lat, context.lng, place.lat, place.lng)
        : undefined;
      const distanceFit = distance === undefined ? 0.5 : Math.max(0, 1 - Math.min(distance, radius) / radius);
      const personalization = !profile ? 0.5 : profile.preferredCategories.some((cat) => place.primaryCategory.includes(cat)) ? 1 : 0.35;
      const quality = place.qualityScore;
      const popularity = place.popularityScore;
      const trending = place.trendingScore;

      const score = (textMatch * 0.28) + (categoryFit * 0.2) + (cityFit * 0.12) + (distanceFit * 0.14) + (quality * 0.1) + (popularity * 0.08) + (trending * 0.03) + (personalization * 0.05);
      return {
        place,
        score,
        distanceMeters: distance,
        explain: {
          score,
          contributions: { textMatch, categoryFit, cityFit, distanceFit, quality, popularity, trending, personalization },
          reasonCodes: [textMatch > 0.7 ? "query_match" : "broad_match", categoryFit > 0.7 ? "category_fit" : "category_backfill"]
        }
      };
    })
    .filter((candidate) => (candidate.distanceMeters === undefined || candidate.distanceMeters <= radius) && candidate.explain.contributions.categoryFit > 0)
    .filter((candidate) => {
      if (!context.filters?.openNow) return true;
      return candidate.place.openNow === true;
    })
    .sort((a, b) => b.score - a.score || a.place.canonicalPlaceId.localeCompare(b.place.canonicalPlaceId));
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

export class PlaceSearchService {
  constructor(private readonly repo: PlaceDiscoveryRepository) {}

  async search(context: DiscoveryQueryContext): Promise<SearchResponse> {
    const ranked = await rankPlaces(this.repo, context);
    const page = paginate(ranked, clampPageSize(context.pageSize), context.cursor);
    return {
      query: { q: context.query, normalizedQ: tokenize(context.query).join(" "), sort: context.sort ?? "relevance" },
      constraints: { categoryId: context.categoryId ?? context.categorySlug, city: context.city, lat: context.lat, lng: context.lng, radiusMeters: context.radiusMeters },
      appliedFilters: context.filters ?? {},
      items: page.items.map((item) => mapResult(item, Boolean(context.explain))),
      nextCursor: page.nextCursor,
      debug: context.explain ? { candidateCount: ranked.length } : undefined
    };
  }
}

export class CategoryBrowseService {
  constructor(private readonly repo: PlaceDiscoveryRepository) {}

  async browse(context: DiscoveryQueryContext): Promise<BrowseResponse> {
    const ranked = await rankPlaces(this.repo, context);
    const page = paginate(ranked, clampPageSize(context.pageSize), context.cursor);
    return {
      category: { id: context.categoryId ?? context.categorySlug ?? "all", slug: context.categorySlug ?? context.categoryId ?? "all" },
      scope: { city: context.city, lat: context.lat, lng: context.lng, radiusMeters: context.radiusMeters },
      appliedFilters: context.filters ?? {},
      items: page.items.map((item) => mapResult(item, Boolean(context.explain))),
      nextCursor: page.nextCursor,
      debug: context.explain ? { categoryThresholdApplied: true } : undefined
    };
  }
}

export class NearbyDiscoveryService {
  constructor(private readonly repo: PlaceDiscoveryRepository) {}

  async nearby(context: DiscoveryQueryContext): Promise<NearbyResponse> {
    const requested = Math.max(200, Math.min(50_000, Number(context.radiusMeters ?? 2_500)));
    const ranked = await rankPlaces(this.repo, { ...context, radiusMeters: requested });
    const expanded = ranked.length >= 3 ? ranked : await rankPlaces(this.repo, { ...context, radiusMeters: Math.min(requested * 2, 50_000) });
    const page = paginate(expanded, clampPageSize(context.pageSize), context.cursor);
    return {
      origin: { lat: context.lat ?? 0, lng: context.lng ?? 0 },
      radius: { requestedMeters: requested, appliedMeters: ranked.length >= 3 ? requested : Math.min(requested * 2, 50_000) },
      items: page.items.map((item) => mapResult(item, Boolean(context.explain))),
      nextCursor: page.nextCursor,
      debug: context.explain ? { fallbackExpanded: ranked.length < 3 } : undefined
    };
  }
}

export class TrendingService {
  constructor(private readonly repo: PlaceDiscoveryRepository) {}

  async list(context: DiscoveryQueryContext): Promise<TrendingResponse> {
    const places = await this.repo.listPlaces();
    const scoped = places.filter((place) => (!context.city || place.city === context.city) && (!context.categoryId || place.primaryCategory.includes(context.categoryId)));
    const sorted = [...scoped].sort((a, b) => b.trendingScore - a.trendingScore || b.popularityScore - a.popularityScore);
    const page = paginate(sorted, clampPageSize(context.pageSize), context.cursor);
    return {
      scope: { type: context.city ? "city" : context.categoryId ? "category" : "global", city: context.city, categoryId: context.categoryId },
      window: { key: "7d" },
      items: page.items.map((place) => mapResult({ place, score: place.trendingScore, explain: { score: place.trendingScore, contributions: { trending: place.trendingScore }, reasonCodes: ["trending"] } }, false)),
      nextCursor: page.nextCursor
    };
  }
}

export class RecommendationService {
  constructor(private readonly repo: PlaceDiscoveryRepository) {}

  async recommend(userId: string | undefined, context: DiscoveryQueryContext): Promise<RecommendationsResponse> {
    const profile = userId ? await this.repo.getRecommendationProfile(userId) : undefined;
    const ranked = await rankPlaces(this.repo, context, profile);
    const filtered = ranked.filter((candidate) => !profile?.excludedPlaceIds.includes(candidate.place.canonicalPlaceId));
    const diversified: RankedCandidate[] = [];
    const categoryRun = new Map<string, number>();
    for (const candidate of filtered) {
      const count = categoryRun.get(candidate.place.primaryCategory) ?? 0;
      if (count >= 2) continue;
      categoryRun.set(candidate.place.primaryCategory, count + 1);
      diversified.push(candidate);
    }
    const fallback = diversified.length > 0 ? diversified : filtered;
    const page = paginate(fallback, clampPageSize(context.pageSize), context.cursor);
    return {
      mode: profile ? "user" : "guest",
      items: page.items.map((item) => mapResult(item, false, [profile ? "similar_to_saved" : "trending_in_city"])),
      nextCursor: page.nextCursor
    };
  }
}

export class AdInsertionService {
  insert(organic: DiscoveryFeedCard[], spacing: number): DiscoveryFeedCard[] {
    const mixed: DiscoveryFeedCard[] = [];
    let shown = 0;
    for (const card of organic) {
      if (shown > 0 && shown % spacing === 0) {
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
    private readonly searchService: PlaceSearchService
  ) {}

  async feed(userId: string | undefined, mode: DiscoveryFeedMode, context: DiscoveryQueryContext): Promise<DiscoveryFeedResponse> {
    let organicItems: PlaceResultItem[] = [];
    if (mode === "for_you") {
      organicItems = (await this.recommendationService.recommend(userId, context)).items;
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
    const cards = this.adService.insert(organicCards, 4);
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
    const recommended = await this.recommendationService.recommend(userId, { city, pageSize: 8 });
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
