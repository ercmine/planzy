import type { RetentionPolicy } from "../../../retention/policy.js";
import type { SearchPlansInput } from "../../types.js";
export interface CacheEntry<T> {
    value: T;
    storedAtMs: number;
    ttlMs: number;
}
export declare class SimpleCache {
    private readonly cache;
    private readonly retentionPolicy;
    constructor(retentionPolicy?: RetentionPolicy);
    get<T>(key: string, nowMs: number): T | undefined;
    set<T>(key: string, value: T, nowMs: number, ttlMs: number, provider?: string): void;
}
export declare function buildEventsCacheKey(input: SearchPlansInput): string;
