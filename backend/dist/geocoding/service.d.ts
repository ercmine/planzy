import { type GeocodingCache } from "./cache.js";
import type { GeocodeRequest, GeocodeResult, GeocodingMetricsSnapshot, GeocodingProviderHealth, ReverseGeocodeRequest, ReverseGeocodeResult } from "./types.js";
export interface GeocodingServiceOptions {
    baseUrl: string;
    timeoutMs?: number;
    userAgent?: string;
    geocodeCacheTtlMs?: number;
    reverseCacheTtlMs?: number;
    defaultLimit?: number;
    fallbackBaseUrl?: string;
    enableFallback?: boolean;
    env?: "dev" | "stage" | "prod";
    cache?: GeocodingCache;
}
export declare class GeocodingService {
    private readonly options;
    private readonly client;
    private readonly fallbackClient?;
    private readonly cache;
    private readonly geocodeCacheTtlMs;
    private readonly reverseCacheTtlMs;
    private readonly defaultLimit;
    private readonly metrics;
    constructor(options: GeocodingServiceOptions);
    geocode(input: GeocodeRequest): Promise<GeocodeResult[]>;
    reverseGeocode(input: ReverseGeocodeRequest): Promise<ReverseGeocodeResult>;
    health(): Promise<GeocodingProviderHealth>;
    metricsSnapshot(): GeocodingMetricsSnapshot;
    private withFallback;
    private geocodeCacheKey;
    private reverseCacheKey;
    private assertCoordinates;
    private recordFailure;
}
