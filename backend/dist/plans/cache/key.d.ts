export interface CacheKeyParts {
    provider?: string;
    cell: string;
    radiusMeters: number;
    categories?: string[];
    priceLevelMax?: number;
    openNow?: boolean;
    timeWindow?: {
        startISO: string;
        endISO: string;
    } | null;
    locale?: string;
    sessionId?: string | null;
    version?: string;
}
export declare function normalizeKeyParts(parts: CacheKeyParts): CacheKeyParts;
export declare function buildCacheKey(parts: CacheKeyParts): string;
export declare function parseCacheKey(key: string): CacheKeyParts | null;
