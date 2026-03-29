import type { CanonicalPlace } from "./types.js";
export interface MapBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}
export interface MapDiscoveryQuery {
    bounds: MapBounds;
    categories?: string[];
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
    limit?: number;
}
export interface MapDiscoveryPlaceSummary {
    canonicalPlaceId: string;
    name: string;
    category: string;
    city?: string;
    region?: string;
    neighborhood?: string;
    latitude: number;
    longitude: number;
    rating: number;
    distanceMeters?: number;
    descriptionSnippet?: string;
    thumbnailUrl?: string;
    dataCompletenessScore: number;
    openNow?: boolean;
    reviewCount: number;
    creatorVideoCount: number;
}
export declare function searchCanonicalPlacesInBounds(places: CanonicalPlace[], query: MapDiscoveryQuery): MapDiscoveryPlaceSummary[];
