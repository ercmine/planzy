export interface SearchNearbyInput {
    lat: number;
    lng: number;
    radiusMeters: number;
    includedTypes: string[];
    maxResults: number;
}
export interface GooglePlace {
    id: string;
    displayName?: {
        text?: string;
        languageCode?: string;
    };
    formattedAddress?: string;
    location?: {
        latitude?: number;
        longitude?: number;
    };
    primaryType?: string;
    types?: string[];
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    googleMapsUri?: string;
    websiteUri?: string;
    photos?: Array<{
        name?: string;
    }>;
}
export interface GooglePlaceDetail extends GooglePlace {
    nationalPhoneNumber?: string;
    regularOpeningHours?: {
        weekdayDescriptions?: string[];
    };
    editorialSummary?: {
        text?: string;
        languageCode?: string;
    };
}
export type GooglePlacesErrorCode = "missing_api_key" | "invalid_input" | "upstream_error";
export declare class GooglePlacesError extends Error {
    readonly statusCode: number;
    readonly code: GooglePlacesErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: GooglePlacesErrorCode, message: string, statusCode: number, details?: Record<string, unknown>);
}
export declare function searchNearby(input: SearchNearbyInput): Promise<GooglePlace[]>;
export declare function fetchPlaceDetail(placeId: string): Promise<GooglePlaceDetail>;
export declare function categoryToIncludedTypes(category?: string): string[];
