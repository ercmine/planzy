import { NoScrapePolicy } from "../../../policy/noScrapePolicy.js";
export interface YelpConfig {
    apiKey: string;
    timeoutMs: number;
    limit: number;
    locale?: string;
}
export interface YelpSearchParams {
    lat: number;
    lng: number;
    radiusMeters: number;
    categories?: string[];
    term?: string;
    openNow?: boolean;
    priceLevelMax?: 1 | 2 | 3 | 4;
    limit?: number;
    offset?: number;
}
export interface YelpBusinessLite {
    id: string;
    name?: string;
    url?: string;
    image_url?: string;
    rating?: number;
    review_count?: number;
    price?: string;
    phone?: string;
    display_phone?: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    location?: {
        address1?: string;
        city?: string;
        state?: string;
        zip_code?: string;
        country?: string;
        display_address?: string[];
    };
    categories?: {
        alias?: string;
        title?: string;
    }[];
    is_closed?: boolean;
    distance?: number;
    transactions?: string[];
}
export declare class YelpClient {
    private readonly cfg;
    private readonly fetchFn;
    constructor(cfg: YelpConfig, opts?: {
        fetchFn?: typeof fetch;
        policy?: NoScrapePolicy;
    });
    search(params: YelpSearchParams, ctx?: {
        signal?: AbortSignal;
    }): Promise<{
        businesses: YelpBusinessLite[];
        total?: number;
    }>;
}
