import type { Plan } from "../plan.js";
import type { RankingSignals } from "../provider.js";
import type { SearchPlansInput } from "../types.js";
export interface RankContext {
    input: SearchPlansInput;
    now: Date;
    signals?: RankingSignals;
}
export interface PlanScorecard {
    id: string;
    total: number;
    parts: Record<string, number>;
    notes?: string[];
}
export declare function scorePlan(plan: Plan, ctx: RankContext): PlanScorecard;
export declare function rankPlansAdvanced(plans: Plan[], ctx: RankContext, opts?: {
    includeScorecards?: boolean;
}): {
    plans: Plan[];
    scorecards?: PlanScorecard[];
};
