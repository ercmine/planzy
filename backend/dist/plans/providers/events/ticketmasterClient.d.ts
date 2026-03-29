import { NoScrapePolicy } from "../../../policy/noScrapePolicy.js";
export interface TicketmasterConfig {
    apiKey: string;
    timeoutMs: number;
    size: number;
}
export interface TicketmasterSearchParams {
    lat: number;
    lng: number;
    radiusMiles: number;
    startDateTimeISO?: string;
    endDateTimeISO?: string;
    classificationName?: string;
    keyword?: string;
    page?: number;
    size?: number;
}
export interface TicketmasterEventLite {
    id: string;
    name?: string;
    url?: string;
    images?: Array<{
        url?: string;
        width?: number;
        height?: number;
        ratio?: string;
    }>;
    dates?: {
        start?: {
            dateTime?: string;
        };
    };
    classifications?: Array<{
        segment?: {
            name?: string;
        };
        genre?: {
            name?: string;
        };
        subGenre?: {
            name?: string;
        };
        type?: {
            name?: string;
        };
        subType?: {
            name?: string;
        };
    }>;
    priceRanges?: Array<{
        min?: number;
        max?: number;
        currency?: string;
    }>;
    _embedded?: {
        venues?: Array<{
            name?: string;
            location?: {
                latitude?: string;
                longitude?: string;
            };
            address?: {
                line1?: string;
            };
            city?: {
                name?: string;
            };
            state?: {
                stateCode?: string;
            };
            postalCode?: string;
        }>;
    };
}
export declare class TicketmasterClient {
    private readonly cfg;
    private readonly fetchFn;
    constructor(cfg: TicketmasterConfig, opts?: {
        fetchFn?: typeof fetch;
        policy?: NoScrapePolicy;
    });
    search(params: TicketmasterSearchParams, ctx?: {
        signal?: AbortSignal;
    }): Promise<TicketmasterEventLite[]>;
}
