import type { RetentionPolicy } from "../../../retention/policy.js";
import type { Plan } from "../../plan.js";
export declare function buildNowPlayingCacheKey(language: string, region: string): string;
export declare function buildTheatersCacheKey(lat: number, lng: number, radiusMeters: number, openNow: boolean | undefined): string;
export declare class MoviesCache {
    private readonly cache;
    private readonly retentionPolicy;
    constructor(retentionPolicy?: RetentionPolicy);
    getNowPlaying(key: string, nowMs: number): Plan[] | undefined;
    setNowPlaying(key: string, value: Plan[], nowMs: number, ttlMs?: number): void;
    getTheaters(key: string, nowMs: number): Plan[] | undefined;
    setTheaters(key: string, value: Plan[], nowMs: number, ttlMs?: number): void;
    private get;
    private set;
}
export declare const MOVIES_CACHE_DEFAULTS: {
    moviesTtlMs: number;
    theatersTtlMs: number;
};
