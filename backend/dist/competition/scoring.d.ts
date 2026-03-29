import type { CompetitionQualityBand, CompetitionReviewEvent, CompetitionScoringConfig } from "./types.js";
export declare function resolveQualityBand(earlyLikeCount: number, config: CompetitionScoringConfig): {
    band: CompetitionQualityBand;
    points: number;
};
export declare function computeCompetitionScore(input: {
    approvedReviewCount: number;
    discoveryEvents: CompetitionReviewEvent[];
    qualityPoints: number;
    streakDays: number;
    engagementBonusPoints?: number;
    tipAtomic: bigint;
    missionCompletionCount: number;
    config: CompetitionScoringConfig;
}): number;
