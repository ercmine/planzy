import type { RewardQualityRating, RewardTier } from "./types.js";

export const DEFAULT_RULE_VERSION = "per-place-v1";
export const DEFAULT_DISTINCT_SLOT = "standard";
export const QUALITY_MULTIPLIERS: Record<RewardQualityRating, number> = {
  low: 0.5,
  standard: 1,
  high: 1.25,
  featured: 1.5
};

export function defaultRewardTiers(now = new Date()): RewardTier[] {
  const createdAt = now.toISOString();
  return [
    { id: "tier-1", name: "Tier 1", startPosition: 1, endPosition: 1, tokenAmount: 200, active: true, createdAt },
    { id: "tier-2", name: "Tier 2", startPosition: 2, endPosition: 5, tokenAmount: 100, active: true, createdAt },
    { id: "tier-3", name: "Tier 3", startPosition: 6, endPosition: 10, tokenAmount: 50, active: true, createdAt },
    { id: "tier-4", name: "Tier 4", startPosition: 11, endPosition: 20, tokenAmount: 20, active: true, createdAt },
    { id: "tier-5", name: "Tier 5", startPosition: 21, endPosition: null, tokenAmount: 5, active: true, createdAt }
  ];
}
