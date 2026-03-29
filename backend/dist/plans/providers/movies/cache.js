import { RetentionPolicy as DefaultRetentionPolicy } from "../../../retention/policy.js";
const DEFAULT_MOVIES_TTL_MS = 21_600_000;
const DEFAULT_THEATERS_TTL_MS = 900_000;
function roundCoord(value) {
    return Math.round(value * 100) / 100;
}
export function buildNowPlayingCacheKey(language, region) {
    return `movies:now:${language}:${region}`;
}
export function buildTheatersCacheKey(lat, lng, radiusMeters, openNow) {
    return `theaters:${roundCoord(lat)}:${roundCoord(lng)}:${Math.round(radiusMeters)}:${openNow === true}`;
}
export class MoviesCache {
    cache = new Map();
    retentionPolicy;
    constructor(retentionPolicy) {
        this.retentionPolicy = retentionPolicy ?? new DefaultRetentionPolicy();
    }
    getNowPlaying(key, nowMs) {
        return this.get(key, nowMs);
    }
    setNowPlaying(key, value, nowMs, ttlMs = DEFAULT_MOVIES_TTL_MS) {
        this.set(key, value, nowMs, this.retentionPolicy.clampProviderTtl("tmdb", ttlMs));
    }
    getTheaters(key, nowMs) {
        return this.get(key, nowMs);
    }
    setTheaters(key, value, nowMs, ttlMs = DEFAULT_THEATERS_TTL_MS) {
        this.set(key, value, nowMs, this.retentionPolicy.clampTtl("provider_api_cache", ttlMs));
    }
    get(key, nowMs) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (nowMs - entry.storedAtMs >= entry.ttlMs) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, nowMs, ttlMs) {
        this.cache.set(key, {
            value,
            storedAtMs: nowMs,
            ttlMs
        });
    }
}
export const MOVIES_CACHE_DEFAULTS = {
    moviesTtlMs: DEFAULT_MOVIES_TTL_MS,
    theatersTtlMs: DEFAULT_THEATERS_TTL_MS
};
