import type { RetentionPolicy } from "../../../retention/policy.js";
import { RetentionPolicy as DefaultRetentionPolicy } from "../../../retention/policy.js";
import type { Plan } from "../../plan.js";

const DEFAULT_MOVIES_TTL_MS = 21_600_000;
const DEFAULT_THEATERS_TTL_MS = 900_000;

interface CacheEntry<T> {
  value: T;
  storedAtMs: number;
  ttlMs: number;
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildNowPlayingCacheKey(language: string, region: string): string {
  return `movies:now:${language}:${region}`;
}

export function buildTheatersCacheKey(lat: number, lng: number, radiusMeters: number, openNow: boolean | undefined): string {
  return `theaters:${roundCoord(lat)}:${roundCoord(lng)}:${Math.round(radiusMeters)}:${openNow === true}`;
}

export class MoviesCache {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly retentionPolicy: RetentionPolicy;

  constructor(retentionPolicy?: RetentionPolicy) {
    this.retentionPolicy = retentionPolicy ?? new DefaultRetentionPolicy();
  }

  public getNowPlaying(key: string, nowMs: number): Plan[] | undefined {
    return this.get<Plan[]>(key, nowMs);
  }

  public setNowPlaying(key: string, value: Plan[], nowMs: number, ttlMs = DEFAULT_MOVIES_TTL_MS): void {
    this.set(key, value, nowMs, this.retentionPolicy.clampProviderTtl("tmdb", ttlMs));
  }

  public getTheaters(key: string, nowMs: number): Plan[] | undefined {
    return this.get<Plan[]>(key, nowMs);
  }

  public setTheaters(key: string, value: Plan[], nowMs: number, ttlMs = DEFAULT_THEATERS_TTL_MS): void {
    this.set(key, value, nowMs, this.retentionPolicy.clampTtl("provider_api_cache", ttlMs));
  }

  private get<T>(key: string, nowMs: number): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (nowMs - entry.storedAtMs >= entry.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  private set<T>(key: string, value: T, nowMs: number, ttlMs: number): void {
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
