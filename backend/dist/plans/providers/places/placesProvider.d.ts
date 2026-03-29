import type { PlanProvider, ProviderContext } from "../../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../../types.js";
import { SimpleCache } from "./cache.js";
import { type GooglePlacesConfig } from "./googlePlacesClient.js";
import { type YelpConfig } from "./yelpClient.js";
export interface PlacesProviderOptions {
    google?: Partial<GooglePlacesConfig>;
    yelp?: Partial<YelpConfig>;
    enableGoogle?: boolean;
    enableYelp?: boolean;
    cache?: SimpleCache;
    cacheTtlMs?: number;
    maxCombined?: number;
}
export declare class PlacesProvider implements PlanProvider {
    readonly name = "places";
    private readonly opts;
    private readonly fetchFn;
    private readonly now;
    private readonly cache;
    constructor(opts: PlacesProviderOptions & {
        googleApiKey?: string;
        yelpApiKey?: string;
    }, extra?: {
        fetchFn?: typeof fetch;
        now?: () => number;
    });
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
    private fetchGoogle;
    private fetchYelp;
    private googleToPlan;
    private yelpToPlan;
}
