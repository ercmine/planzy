import type { PlanProvider, ProviderContext } from "../../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../../types.js";
import { MoviesCache } from "./cache.js";
export interface MoviesProviderOptions {
    tmdbApiKey?: string;
    googleApiKey?: string;
    yelpApiKey?: string;
    language?: string;
    region?: string;
    timeoutMs?: number;
    maxMovies?: number;
    maxTheaters?: number;
    includeTheaters?: boolean;
    includeMovieShowtimeLinks?: boolean;
    cache?: MoviesCache;
    moviesTtlMs?: number;
    theatersTtlMs?: number;
}
export declare class MoviesProvider implements PlanProvider {
    readonly name = "movies";
    private readonly opts;
    private readonly fetchFn;
    private readonly now;
    private readonly cache;
    constructor(opts?: MoviesProviderOptions, extra?: {
        fetchFn?: typeof fetch;
        now?: () => number;
    });
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
    private tmdbMovieToPlan;
}
