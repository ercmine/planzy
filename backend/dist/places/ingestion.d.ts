import { PlaceNormalizationService } from "./service.js";
import type { CanonicalPlace } from "./types.js";
export type QueryIntent = "text_search" | "category_search" | "nearby" | "map_viewport" | "detail" | "next_page" | "hydrate";
export type DetailEnrichmentLevel = "minimal" | "standard" | "rich" | "premium";
export type FallbackReason = "insufficient_results" | "sparse_details" | "cache_stale" | "provider_error" | "provider_timeout" | "provider_rate_limited" | "enrichment_needed";
export interface PlaceQueryContext {
    intent: QueryIntent;
    queryText?: string;
    lat?: number;
    lng?: number;
    radiusMeters?: number;
    viewport?: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    category?: string;
    subcategory?: string;
    pricePreferences?: number[];
    openNow?: boolean;
    resultLimit: number;
    paginationToken?: string;
    detailEnrichmentLevel?: DetailEnrichmentLevel;
    locale?: string;
    country?: string;
    sourcePreferences?: string[];
    staleAfterMs?: number;
}
export interface ProviderCapabilities {
    supportsSearch: boolean;
    supportsNearby: boolean;
    supportsPhotos: boolean;
    supportsHours: boolean;
    supportsDescriptions: boolean;
    supportsReviews: boolean;
    supportsCategorySearch: boolean;
    supportsAutocomplete: boolean;
    supportsRichDetails: boolean;
}
export interface ProviderMetadata {
    provider: string;
    costTier: "low" | "medium" | "high";
    priority: number;
    capabilities: ProviderCapabilities;
    enabled: boolean;
}
export interface ProviderSearchRequest {
    context: PlaceQueryContext;
    pageToken?: string;
    limit: number;
}
export interface ProviderRecord {
    provider: string;
    providerPlaceId: string;
    rawPayload: unknown;
    sourceUrl?: string;
}
export interface ProviderSearchResponse {
    records: ProviderRecord[];
    nextPageToken?: string;
}
export interface ProviderPlaceClient {
    readonly metadata: ProviderMetadata;
    searchPlaces(request: ProviderSearchRequest): Promise<ProviderSearchResponse>;
    nearbyPlaces?(request: ProviderSearchRequest): Promise<ProviderSearchResponse>;
    categoryPlaces?(request: ProviderSearchRequest): Promise<ProviderSearchResponse>;
    getPlaceDetails(request: {
        providerPlaceId: string;
        context: PlaceQueryContext;
    }): Promise<ProviderRecord | undefined>;
    getPhotoUrl?(photoRef: string): string | undefined;
}
export interface IngestionCacheEntry<T> {
    value: T;
    fetchedAt: number;
    expiresAt: number;
    provider: string;
    queryFingerprint: string;
    locale?: string;
    status: "ok" | "error" | "empty";
    version?: string;
}
export interface IngestionTtlPolicy {
    searchMs: number;
    detailMs: number;
    canonicalMs: number;
    failureMs: number;
}
export interface IngestionConfig {
    priorities: Record<QueryIntent, string[]>;
    fallbackMinResultsByIntent: Partial<Record<QueryIntent, number>>;
    maxExpensiveProviderCallsPerRequest: number;
    maxEnrichmentCallsPerRequest: number;
    ttl: IngestionTtlPolicy;
}
export interface ProviderFailure {
    provider: string;
    reason: FallbackReason;
    message: string;
}
export interface ContinuationState {
    providers: Array<{
        provider: string;
        nextPageToken?: string;
    }>;
    seenCanonicalPlaceIds: string[];
    originalContext: PlaceQueryContext;
}
export interface CanonicalSearchResponse {
    canonicalPlaces: CanonicalPlace[];
    continuationToken?: string;
    providersUsed: string[];
    fallbackUsed: boolean;
    fallbackReasons: FallbackReason[];
    cacheStats: {
        hits: number;
        misses: number;
    };
    enrichmentStatus: "none" | "partial" | "complete";
    partialFailures: ProviderFailure[];
}
export declare class MultiSourcePlaceIngestionService {
    private readonly normalizationService;
    private readonly providers;
    private readonly config;
    private readonly now;
    private readonly searchCache;
    private readonly detailCache;
    private readonly canonicalCache;
    private readonly failureCache;
    constructor(normalizationService: PlaceNormalizationService, providers: Map<string, ProviderPlaceClient>, config: IngestionConfig, now?: () => number);
    searchCanonicalPlaces(context: PlaceQueryContext): Promise<CanonicalSearchResponse>;
    getCanonicalPlaceDetails(input: {
        canonicalPlaceId?: string;
        providerRef?: {
            provider: string;
            providerPlaceId: string;
        };
        context: PlaceQueryContext;
    }): Promise<CanonicalSearchResponse>;
    nearbyPlaces(context: PlaceQueryContext): Promise<CanonicalSearchResponse>;
    categoryPlaces(context: PlaceQueryContext): Promise<CanonicalSearchResponse>;
    hydrateCanonicalPlace(canonicalPlaceId: string, context: PlaceQueryContext): Promise<CanonicalPlace | undefined>;
    syncProviderRecord(providerName: string, providerPlaceId: string, context: PlaceQueryContext): Promise<CanonicalPlace | undefined>;
    getNextPlacePage(continuationToken: string): Promise<CanonicalSearchResponse>;
    private pickProviders;
}
