import { rankPlansAdvanced } from "./rankingEngine.js";
export function rankPlans(plans, ctx) {
    return rankPlansAdvanced(plans, { input: ctx.input, now: ctx.now }).plans;
}
export { rankPlansAdvanced, scorePlan } from "./rankingEngine.js";
