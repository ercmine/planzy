import type { Plan } from "../plan.js";
export interface DedupeOptions {
    geoThresholdMeters?: number;
    nameSimilarityMin?: number;
    addressSimilarityMin?: number;
    requireAddressForMerge?: boolean;
    maxGroupSize?: number;
}
export interface DedupeDebugItem {
    keptId: string;
    mergedIds: string[];
    reason: string;
}
export interface DedupeOutput {
    plans: Plan[];
    debug?: {
        merged: number;
        groups: DedupeDebugItem[];
    };
}
export declare function dedupeAndMergePlans(plans: Plan[], opts?: DedupeOptions): DedupeOutput;
