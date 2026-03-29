export interface CacheEntry<T> {
    key: string;
    value: T;
    storedAtMs: number;
    expiresAtMs: number;
    tags: string[];
    hits: number;
}
export interface MemoryCacheOptions {
    maxEntries?: number;
    maxBytesApprox?: number;
    pruneIntervalMs?: number;
}
export declare class MemoryCache<T> {
    private readonly store;
    private readonly tagIndex;
    private readonly opts;
    private readonly now;
    private totalBytesApprox;
    private totalHits;
    private totalMisses;
    private lastPruneMs;
    constructor(opts?: MemoryCacheOptions, deps?: {
        now?: () => number;
    });
    get(key: string): T | null;
    set(key: string, value: T, ttlMs: number, tags?: string[]): void;
    delete(key: string): void;
    invalidateByTag(tag: string): number;
    invalidateByPrefix(prefix: string): number;
    stats(): {
        entries: number;
        hits: number;
        misses: number;
    };
    private pruneIfNeeded;
    private enforceCapacity;
}
