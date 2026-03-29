import { NoScrapePolicy } from "../../../policy/noScrapePolicy.js";
export interface GooglePlacesConfig {
    apiKey: string;
    timeoutMs: number;
    maxResults: number;
    languageCode?: string;
}
export interface GoogleNearbySearchParams {
    lat: number;
    lng: number;
    radiusMeters: number;
    includedTypes?: string[];
    keyword?: string;
    openNow?: boolean;
    maxResultCount?: number;
}
export interface GooglePlaceLite {
    id: string;
    displayName?: string;
    formattedAddress?: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string | number;
    googleMapsUri?: string;
    websiteUri?: string;
    internationalPhoneNumber?: string;
    regularOpeningHours?: {
        openNow?: boolean;
        weekdayDescriptions?: string[];
    };
    photos?: {
        name?: string;
        widthPx?: number;
        heightPx?: number;
        authorAttributions?: unknown;
    }[];
    types?: string[];
}
export declare class GooglePlacesClient {
    private readonly cfg;
    private readonly fetchFn;
    constructor(cfg: GooglePlacesConfig, opts?: {
        fetchFn?: typeof fetch;
        policy?: NoScrapePolicy;
    });
    searchNearby(params: GoogleNearbySearchParams, ctx?: {
        signal?: AbortSignal;
    }): Promise<GooglePlaceLite[]>;
}
