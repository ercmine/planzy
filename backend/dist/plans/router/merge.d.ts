import { type Plan } from "../plan.js";
export interface MergeResult {
    plan: Plan;
    mergedFrom: string[];
}
export declare function mergePlans(candidates: Plan[]): MergeResult;
