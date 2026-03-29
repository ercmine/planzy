import type { CanonicalPlace, PlaceSourceRecord } from "./types.js";
export declare function computeCanonicalPlaceCompleteness(place: CanonicalPlace, sourceRecord?: PlaceSourceRecord): {
    score: number;
    breakdown: Record<string, number>;
};
