import type { LeaderboardEntityType, LeaderboardFormula } from "./types.js";

function base(version: string): LeaderboardFormula {
  return {
    version,
    weights: {
      meaningfulAction: 1,
      quality: 1.4,
      engagement: 1.1,
      diversity: 1,
      consistency: 0.7,
      trust: 1,
      antiSpamPenalty: 2.2,
      moderationPenalty: 3
    },
    minimumQualityThreshold: 0.35,
    maxActionsPerPlacePerDay: 3,
    requireDistinctPlaces: 2
  };
}

export const DEFAULT_LEADERBOARD_FORMULAS: Record<LeaderboardEntityType, LeaderboardFormula> = {
  creator: {
    ...base("creator_v1"),
    weights: { ...base("x").weights, meaningfulAction: 1.2, quality: 1.6, trust: 1.3, engagement: 1.15 }
  },
  explorer: {
    ...base("explorer_v1"),
    weights: { ...base("x").weights, diversity: 1.35, consistency: 0.95, meaningfulAction: 1.1 }
  },
  city: {
    ...base("city_v1"),
    weights: { ...base("x").weights, diversity: 1.25, trust: 1.25, quality: 1.25, meaningfulAction: 0.9 },
    requireDistinctPlaces: 1
  },
  category: {
    ...base("category_v1"),
    weights: { ...base("x").weights, diversity: 1.2, trust: 1.2, engagement: 1.2 },
    requireDistinctPlaces: 1
  }
};
