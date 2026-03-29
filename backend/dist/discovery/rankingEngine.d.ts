import type { DiscoveryQueryContext, PlaceDocument } from "./types.js";
export type RankingMode = "nearby" | "text" | "category";
export interface PlaceComponentScores {
    distance: number;
    text: number;
    category: number;
    completeness: number;
    quality: number;
    contentRichness: number;
    engagement: number;
    freshness: number;
    openNow: number;
}
export interface RankingWeights {
    distance: number;
    text: number;
    category: number;
    completeness: number;
    quality: number;
    contentRichness: number;
    engagement: number;
    freshness: number;
    openNow: number;
}
export declare const RANKING_PROFILES: Record<RankingMode, RankingWeights>;
export declare function computeCompletenessScore(place: PlaceDocument): number;
export declare function scorePlaceForMode(input: {
    place: PlaceDocument;
    mode: RankingMode;
    context: DiscoveryQueryContext;
    distanceMeters?: number;
}): {
    score: number;
    components: PlaceComponentScores;
};
