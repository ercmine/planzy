import { type ProviderContext } from "../provider.js";
import type { Category, SearchPlansInput } from "../types.js";
import type { ProviderRouterOptions, RouterSearchResult } from "./routerTypes.js";
import type { ProviderHealthSnapshot } from "./health/healthTypes.js";
export declare class ProviderRouter {
    private readonly providers;
    private readonly defaultTimeoutMs;
    private readonly perProviderTimeoutMs;
    private readonly maxFanout;
    private readonly allowPartial;
    private readonly includeDebug;
    private readonly config?;
    private readonly semaphores;
    private readonly neverEmpty;
    private readonly deckBatcher;
    private readonly planSearchCache;
    private readonly optionsCacheTtlMs?;
    private readonly quotaManager;
    private readonly enforceQuotas;
    private readonly gracefulOnQuota;
    private readonly healthMonitor;
    private readonly enforceHealth;
    private readonly sponsoredPlacement;
    private readonly noScrapePolicy;
    private readonly enforceNoScrape;
    constructor(opts: ProviderRouterOptions);
    private resolveCacheTtlMs;
    search(input: SearchPlansInput, ctx?: ProviderContext): Promise<RouterSearchResult>;
    getHealthSnapshots(): ProviderHealthSnapshot[];
    invalidateCache(params: {
        provider?: string;
        cellPrefix?: string;
        category?: Category;
        sessionId?: string;
    }): number;
    private selectPrimaryProviders;
    private orderProvidersForInput;
}
