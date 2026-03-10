import type { FirstPartyPlaceMetrics, FirstPartyRankingSignals } from "./types.js";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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

export const DEFAULT_FIRST_PARTY_RANKING_CONFIG: FirstPartyRankingConfig = {
  hasReviewsWeight: 0.06,
  reviewCountWeight: 0.14,
  creatorVideoWeight: 0.14,
  saveCountWeight: 0.16,
  guideWeight: 0.12,
  trustedWeight: 0.14,
  engagementWeight: 0.1,
  velocityWeight: 0.07,
  qualityWeight: 0.07,
  maxTotalBoost: 0.35
};

export function computeFirstPartyRankingSignals(metrics: FirstPartyPlaceMetrics, config: FirstPartyRankingConfig = DEFAULT_FIRST_PARTY_RANKING_CONFIG): FirstPartyRankingSignals {
  const hasReviewsBoost = metrics.reviewCount > 0 ? config.hasReviewsWeight : 0;
  const reviewCountBoost = clamp01(Math.log10(1 + metrics.reviewCount) / 2) * config.reviewCountWeight;
  const creatorVideoBoost = clamp01(Math.log10(1 + metrics.creatorVideoCount) / 1.5) * config.creatorVideoWeight;
  const saveCountBoost = clamp01(Math.log10(1 + metrics.saveCount) / 2.5) * config.saveCountWeight;
  const guideInclusionBoost = clamp01(Math.log10(1 + metrics.publicGuideCount) / 1.3) * config.guideWeight;
  const trustedContentBoost = clamp01(metrics.trustScore) * config.trustedWeight;
  const engagementBoost = clamp01(Math.log10(1 + metrics.helpfulVoteCount) / 2.5) * config.engagementWeight;
  const recencyVelocityBoost = clamp01(metrics.engagementVelocity30d) * config.velocityWeight;
  const firstPartyQualityBoost = clamp01(metrics.firstPartyQualityBoost) * config.qualityWeight;

  const cappedTotalBoost = Math.min(
    config.maxTotalBoost,
    hasReviewsBoost
      + reviewCountBoost
      + creatorVideoBoost
      + saveCountBoost
      + guideInclusionBoost
      + trustedContentBoost
      + engagementBoost
      + recencyVelocityBoost
      + firstPartyQualityBoost
  );

  return {
    hasReviewsBoost,
    reviewCountBoost,
    creatorVideoBoost,
    saveCountBoost,
    guideInclusionBoost,
    trustedContentBoost,
    engagementBoost,
    recencyVelocityBoost,
    firstPartyQualityBoost,
    cappedTotalBoost
  };
}
