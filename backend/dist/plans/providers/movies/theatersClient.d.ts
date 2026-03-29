import type { Plan } from "../../plan.js";
import { NoScrapePolicy } from "../../../policy/noScrapePolicy.js";
export interface TheatersSearchParams {
    lat: number;
    lng: number;
    radiusMeters: number;
    openNow?: boolean;
    limit?: number;
    locale?: string;
}
export declare class TheatersClient {
    private readonly googleApiKey?;
    private readonly yelpApiKey?;
    private readonly timeoutMs;
    private readonly fetchFn;
    private readonly policy;
    constructor(opts: {
        googleApiKey?: string;
        yelpApiKey?: string;
        timeoutMs: number;
        fetchFn?: typeof fetch;
        policy?: NoScrapePolicy;
    });
    search(params: TheatersSearchParams, ctx?: {
        signal?: AbortSignal;
    }): Promise<Plan[]>;
    private googleToPlan;
    private yelpToPlan;
}
