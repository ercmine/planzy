import type { FirstPartyPlaceMetrics, FirstPartyRankingSignals } from "./types.js";
export interface FirstPartyRankingConfig {
    hasReviewsWeight: number;
    reviewCountWeight: number;
    creatorVideoWeight: number;
    saveCountWeight: number;
    guideWeight: number;
    trustedWeight: number;
    engagementWeight: number;
    velocityWeight: number;
    qualityWeight: number;
    maxTotalBoost: number;
}
export declare const DEFAULT_FIRST_PARTY_RANKING_CONFIG: FirstPartyRankingConfig;
export declare function computeFirstPartyRankingSignals(metrics: FirstPartyPlaceMetrics, config?: FirstPartyRankingConfig): FirstPartyRankingSignals;
