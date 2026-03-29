import type { Plan } from "../plan.js";
import type { SearchPlansInput } from "../types.js";
export interface RankContext {
    input: SearchPlansInput;
    now: Date;
}
export declare function rankPlans(plans: Plan[], ctx: RankContext): Plan[];
export { rankPlansAdvanced, scorePlan } from "./rankingEngine.js";
