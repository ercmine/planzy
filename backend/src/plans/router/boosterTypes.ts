import type { RankingSignals } from "../provider.js";
import type { Plan } from "../plan.js";
import type { SearchPlansInput } from "../types.js";

export interface BoosterOptions {
  enabled?: boolean;
  maxRun?: number;
  targetWindow?: number;
  minCategories?: number;
  categoryCapInWindow?: number;
  respectExplicitCategoryFilter?: boolean;
}

export interface BoosterDebug {
  beforeTopCategories: Record<string, number>;
  afterTopCategories: Record<string, number>;
  maxRunBefore: number;
  maxRunAfter: number;
  applied: boolean;
  reason?: string;
}

export interface BoostResult {
  plans: Plan[];
  debug?: BoosterDebug;
}

export interface BoosterContext {
  input: SearchPlansInput;
  signals?: RankingSignals;
}
