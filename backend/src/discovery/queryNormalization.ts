import type { DiscoveryQueryContext, DiscoverySortMode } from "./types.js";

const SORTS: DiscoverySortMode[] = ["relevance", "nearby", "trending", "top_rated", "recommended", "popular", "newest"];

function parseNumber(input: string | null): number | undefined {
  if (input === null || input === "") return undefined;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class QueryNormalizationService {
  normalize(params: URLSearchParams): DiscoveryQueryContext {
    const sort = params.get("sort") ?? "relevance";
    return {
      query: params.get("q")?.trim().replace(/\s+/g, " ") || undefined,
      categoryId: params.get("categoryId") ?? undefined,
      categorySlug: params.get("categorySlug") ?? undefined,
      city: params.get("city")?.trim() || undefined,
      lat: parseNumber(params.get("lat")),
      lng: parseNumber(params.get("lng")),
      radiusMeters: Math.max(100, Math.min(50_000, parseNumber(params.get("radius")) ?? 4_000)),
      sort: SORTS.includes(sort as DiscoverySortMode) ? sort as DiscoverySortMode : "relevance",
      pageSize: Math.max(1, Math.min(50, parseNumber(params.get("pageSize")) ?? 20)),
      cursor: params.get("cursor") ?? undefined,
      explain: params.get("debug") === "1" || params.get("explain") === "1",
      surface: (params.get("surface") as DiscoveryQueryContext["surface"]) ?? undefined,
      placeId: params.get("placeId") ?? undefined,
      creatorId: params.get("creatorId") ?? undefined,
      filters: {
        openNow: params.get("openNow") === "1",
        minRating: parseNumber(params.get("minRating")),
        hasPhotos: params.get("hasPhotos") === "1",
        hasReviews: params.get("hasReviews") === "1"
      }
    };
  }
}
