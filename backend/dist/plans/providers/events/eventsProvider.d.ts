import type { PlanProvider, ProviderContext } from "../../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../../types.js";
export interface EventsProviderOptions {
    cacheTtlMs?: number;
    enableCache?: boolean;
    maxResults?: number;
    timeoutMs?: number;
    ticketmasterApiKey?: string;
}
export declare class EventsProvider implements PlanProvider {
    readonly name = "events";
    private readonly opts;
    private readonly fetchFn;
    private readonly now;
    private readonly cache;
    constructor(opts?: EventsProviderOptions, extra?: {
        fetchFn?: typeof fetch;
        now?: () => number;
    });
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
}
