import type { CanonicalPlace } from "./types.js";
export interface PlaceAutocompleteQuery {
    q: string;
    limit?: number;
    lat?: number;
    lng?: number;
    city?: string;
    region?: string;
    category?: string;
    scope?: "local" | "regional" | "global";
}
export interface PlaceAutocompleteSuggestion {
    canonicalPlaceId: string;
    displayName: string;
    category: string;
    addressSnippet: string;
    city?: string;
    region?: string;
    distanceMeters?: number;
    thumbnailUrl?: string;
    lat: number;
    lng: number;
    score: number;
}
export declare function autocompleteCanonicalPlaces(places: CanonicalPlace[], query: PlaceAutocompleteQuery): PlaceAutocompleteSuggestion[];
