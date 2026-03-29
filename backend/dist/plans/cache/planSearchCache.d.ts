import type { RetentionPolicy } from "../../retention/policy.js";
import type { Plan } from "../plan.js";
import type { ProviderContext } from "../provider.js";
import type { Category, SearchPlansInput } from "../types.js";
import { MemoryCache } from "./memoryCache.js";
export interface PlanSearchCacheOptions {
    enabled?: boolean;
    ttlMs?: number;
    precision?: 3 | 4 | 5;
    providerName?: string;
}
export declare class PlanSearchCache {
    private readonly cache;
    private readonly opts;
    private readonly retentionPolicy;
    constructor(cache?: MemoryCache<Plan[]>, opts?: PlanSearchCacheOptions, deps?: {
        now?: () => number;
        retentionPolicy?: RetentionPolicy;
    });
    buildKey(input: SearchPlansInput, ctx?: ProviderContext): string;
    get(input: SearchPlansInput, ctx?: ProviderContext): Plan[] | null;
    set(input: SearchPlansInput, ctx: ProviderContext | undefined, plans: Plan[], ttlMs?: number): void;
    invalidate(params: {
        provider?: string;
        cellPrefix?: string;
        category?: Category;
        sessionId?: string;
    }): number;
    stats(): {
        entries: number;
        hits: number;
        misses: number;
    };
    private toParts;
}
