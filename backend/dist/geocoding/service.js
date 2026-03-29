import { MemoryGeocodingCache } from "./cache.js";
import { GeocodingError } from "./errors.js";
import { NominatimClient } from "./nominatimClient.js";
import { normalizeReverseItem, normalizeSearchItem } from "./normalization.js";
export class GeocodingService {
    options;
    client;
    fallbackClient;
    cache;
    geocodeCacheTtlMs;
    reverseCacheTtlMs;
    defaultLimit;
    metrics = {
        geocodeRequests: 0,
        reverseGeocodeRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        failures: 0,
        timeouts: 0,
        noResults: 0
    };
    constructor(options) {
        this.options = options;
        this.client = new NominatimClient({
            baseUrl: options.baseUrl,
            timeoutMs: options.timeoutMs ?? 2_000,
            userAgent: options.userAgent ?? "dryad-geocoder/1.0"
        });
        this.cache = options.cache ?? new MemoryGeocodingCache();
        this.geocodeCacheTtlMs = options.geocodeCacheTtlMs ?? 60 * 60 * 1_000;
        this.reverseCacheTtlMs = options.reverseCacheTtlMs ?? 24 * 60 * 60 * 1_000;
        this.defaultLimit = options.defaultLimit ?? 5;
        const canUseFallback = options.enableFallback === true && (options.env ?? "dev") !== "prod";
        if (canUseFallback && options.fallbackBaseUrl) {
            this.fallbackClient = new NominatimClient({
                baseUrl: options.fallbackBaseUrl,
                timeoutMs: options.timeoutMs ?? 2_000,
                userAgent: options.userAgent ?? "dryad-geocoder/1.0"
            });
        }
    }
    async geocode(input) {
        this.metrics.geocodeRequests += 1;
        const query = input.query?.trim();
        if (!query)
            throw new GeocodingError("invalid_input", "query is required", 400);
        const limit = Math.min(Math.max(input.limit ?? this.defaultLimit, 1), 10);
        const cacheKey = this.geocodeCacheKey({ ...input, query, limit });
        const fromCache = this.cache.get(cacheKey);
        if (fromCache) {
            this.metrics.cacheHits += 1;
            return fromCache;
        }
        this.metrics.cacheMisses += 1;
        const startedAt = Date.now();
        try {
            const rows = await this.withFallback((client) => client.search({ ...input, query, limit }));
            const normalized = rows.map(normalizeSearchItem).filter((row) => row !== null);
            if (normalized.length === 0) {
                this.metrics.noResults += 1;
                throw new GeocodingError("no_results", "No geocoding results found", 404);
            }
            this.cache.set(cacheKey, normalized, this.geocodeCacheTtlMs);
            console.info(JSON.stringify({ event: "geocode.success", resultCount: normalized.length, latencyMs: Date.now() - startedAt }));
            return normalized;
        }
        catch (error) {
            this.recordFailure(error);
            throw error;
        }
    }
    async reverseGeocode(input) {
        this.metrics.reverseGeocodeRequests += 1;
        this.assertCoordinates(input.lat, input.lng);
        const cacheKey = this.reverseCacheKey(input.lat, input.lng, input.zoom, input.language);
        const fromCache = this.cache.get(cacheKey);
        if (fromCache) {
            this.metrics.cacheHits += 1;
            return fromCache;
        }
        this.metrics.cacheMisses += 1;
        const startedAt = Date.now();
        try {
            const row = await this.withFallback((client) => client.reverse(input));
            const normalized = normalizeReverseItem(row);
            if (!normalized) {
                this.metrics.noResults += 1;
                throw new GeocodingError("malformed_response", "Reverse geocode response missing required fields", 502);
            }
            this.cache.set(cacheKey, normalized, this.reverseCacheTtlMs);
            console.info(JSON.stringify({ event: "reverse_geocode.success", latencyMs: Date.now() - startedAt }));
            return normalized;
        }
        catch (error) {
            this.recordFailure(error);
            throw error;
        }
    }
    async health() {
        const startedAt = Date.now();
        try {
            await this.client.health();
            return { ok: true, latencyMs: Date.now() - startedAt };
        }
        catch (error) {
            return { ok: false, latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) };
        }
    }
    metricsSnapshot() {
        return { ...this.metrics };
    }
    async withFallback(execute) {
        try {
            return await execute(this.client);
        }
        catch (error) {
            if (!this.fallbackClient || !(error instanceof GeocodingError) || error.code === "invalid_input") {
                throw error;
            }
            console.warn(JSON.stringify({ event: "geocode.fallback", reason: error.code }));
            return execute(this.fallbackClient);
        }
    }
    geocodeCacheKey(input) {
        return [
            "geo",
            input.query.trim().toLowerCase(),
            input.language?.toLowerCase() ?? "",
            (input.countryCodes ?? []).map((entry) => entry.toLowerCase()).sort().join(","),
            String(input.limit),
            input.viewbox?.join(",") ?? ""
        ].join(":");
    }
    reverseCacheKey(lat, lng, zoom, language) {
        const normalizedLat = lat.toFixed(5);
        const normalizedLng = lng.toFixed(5);
        return ["reverse", normalizedLat, normalizedLng, String(zoom ?? 0), language?.toLowerCase() ?? ""].join(":");
    }
    assertCoordinates(lat, lng) {
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            throw new GeocodingError("invalid_input", "lat must be within [-90, 90]", 400);
        }
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
            throw new GeocodingError("invalid_input", "lng must be within [-180, 180]", 400);
        }
    }
    recordFailure(error) {
        this.metrics.failures += 1;
        if (error instanceof GeocodingError && error.code === "timeout") {
            this.metrics.timeouts += 1;
        }
    }
}
