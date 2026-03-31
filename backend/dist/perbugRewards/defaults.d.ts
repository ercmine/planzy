import type { PerbugRewardTier, RewardQualityRating } from "./types.js";
export declare const DEFAULT_DISTINCT_SLOT = "base";
export declare const DEFAULT_RULE_VERSION = "perbug-rewards-v2";
export declare const PERBUG_DECIMALS = 9;
export declare const QUALITY_MULTIPLIERS: Record<RewardQualityRating, number>;
export declare function defaultRewardTiers(): PerbugRewardTier[];
