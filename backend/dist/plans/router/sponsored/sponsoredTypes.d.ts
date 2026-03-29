import type { Plan } from "../../plan.js";
export type SponsoredLabel = "sponsored" | "promoted";
export interface SponsoredPlacementOptions {
    enabled?: boolean;
    ratioN?: number;
    maxSponsoredTotal?: number;
    windowSize?: number;
    minGap?: number;
    sponsoredSources?: string[];
    labelText?: SponsoredLabel;
    respectExplicitCategoryFilter?: boolean;
    placeFirstSponsoredAfter?: number;
    requireLabelInMetadata?: boolean;
    includeDebug?: boolean;
}
export interface SponsoredPlacementDebug {
    applied: boolean;
    ratioN: number;
    windowSize: number;
    organicCountBefore: number;
    sponsoredCountBefore: number;
    sponsoredInserted: number;
    sponsoredDroppedByCap: number;
    sponsoredDroppedByCategory: number;
    maxRunSponsoredAfter: number;
}
export interface SponsoredPlacementResult {
    plans: Plan[];
    debug?: SponsoredPlacementDebug;
}
