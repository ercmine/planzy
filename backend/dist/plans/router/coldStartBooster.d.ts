import type { Plan } from "../plan.js";
import type { BoostResult, BoosterContext, BoosterOptions } from "./boosterTypes.js";
export declare function applyColdStartBooster(plans: Plan[], ctx: BoosterContext, opts?: BoosterOptions & {
    includeDebug?: boolean;
}): BoostResult;
