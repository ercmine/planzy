import { NoScrapePolicy } from "../../../policy/noScrapePolicy.js";
export interface TmdbConfig {
    apiKey: string;
    timeoutMs: number;
    language?: string;
    region?: string;
    page?: number;
}
export interface TmdbMovieLite {
    id: number;
    title?: string;
    overview?: string;
    release_date?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
    vote_count?: number;
}
export declare class TmdbClient {
    private readonly cfg;
    private readonly fetchFn;
    constructor(cfg: TmdbConfig, opts?: {
        fetchFn?: typeof fetch;
        policy?: NoScrapePolicy;
    });
    nowPlaying(ctx?: {
        signal?: AbortSignal;
    }): Promise<{
        results: TmdbMovieLite[];
    }>;
}
