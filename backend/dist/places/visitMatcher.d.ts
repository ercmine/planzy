import type { CanonicalPlace } from "./types.js";
export interface VisitMatchQuery {
    lat: number;
    lng: number;
    reviewedPlaceIds?: string[];
}
export interface VisitMatchResult {
    matched: boolean;
    canonicalPlaceId?: string;
    placeName?: string;
    distanceMeters?: number;
    confidence?: number;
    reason?: string;
}
export declare function matchVisitToCanonicalPlace(places: CanonicalPlace[], query: VisitMatchQuery): VisitMatchResult;
