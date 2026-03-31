import { GeocodingService } from "./service.js";
export * from "./types.js";
export * from "./errors.js";
export * from "./cache.js";
export * from "./normalization.js";
export * from "./nominatimClient.js";
export * from "./service.js";
export * from "./http.js";
export function createGeocodingServiceFromEnv() {
    const baseUrl = process.env.NOMINATIM_BASE_URL;
    if (!baseUrl)
        return null;
    const timeoutMs = Number(process.env.NOMINATIM_TIMEOUT_MS ?? 2_000);
    const geocodeCacheTtlMs = Number(process.env.NOMINATIM_GEOCODE_CACHE_TTL_MS ?? 3_600_000);
    const reverseCacheTtlMs = Number(process.env.NOMINATIM_REVERSE_CACHE_TTL_MS ?? 86_400_000);
    const defaultLimit = Number(process.env.NOMINATIM_DEFAULT_LIMIT ?? 5);
    return new GeocodingService({
        baseUrl,
        timeoutMs,
        geocodeCacheTtlMs,
        reverseCacheTtlMs,
        defaultLimit,
        userAgent: process.env.NOMINATIM_USER_AGENT ?? "perbug-geocoder/1.0",
        fallbackBaseUrl: process.env.NOMINATIM_FALLBACK_BASE_URL,
        enableFallback: process.env.NOMINATIM_ENABLE_FALLBACK === "true",
        env: process.env.APP_ENV ?? "dev"
    });
}
