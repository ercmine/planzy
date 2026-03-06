import type { Plan } from "../plan.js";
import type { SearchPlansInput } from "../types.js";
import { rankPlansAdvanced } from "./rankingEngine.js";

export interface RankContext {
  input: SearchPlansInput;
  now: Date;
}

export function rankPlans(plans: Plan[], ctx: RankContext): Plan[] {
  return rankPlansAdvanced(plans, { input: ctx.input, now: ctx.now }).plans;
}

export { rankPlansAdvanced, scorePlan } from "./rankingEngine.js";
