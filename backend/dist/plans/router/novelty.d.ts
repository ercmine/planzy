import type { Plan } from "../plan.js";
import type { RankingSignals } from "../provider.js";
export declare function planSignature(plan: Plan): string;
export declare function noveltyPenalty(plan: Plan, signals?: RankingSignals): {
    penalty: number;
    reason?: string;
};
