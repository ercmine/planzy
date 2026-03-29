import type { Plan } from "../../plan.js";
import type { SearchPlansInput } from "../../types.js";
import type { SponsoredPlacementOptions, SponsoredPlacementResult } from "./sponsoredTypes.js";
export declare function isSponsoredPlan(plan: Plan, opts: SponsoredPlacementOptions): boolean;
export declare function ensureSponsoredLabel(plan: Plan, opts: SponsoredPlacementOptions): Plan;
export declare function applySponsoredPlacement(plans: Plan[], ctx: {
    input: SearchPlansInput;
}, opts?: SponsoredPlacementOptions): SponsoredPlacementResult;
