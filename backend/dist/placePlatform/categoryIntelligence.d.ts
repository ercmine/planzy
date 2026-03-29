import type { PlaceCategory, SourceCategoryMappingRule } from "./types.js";
export interface CategoryNormalizationMatch {
    categoryId: string;
    confidence: number;
    ruleId: string;
    reason: string;
    priority: number;
}
export interface CategoryNormalizationResult {
    primaryCategoryId?: string;
    secondaryCategoryIds: string[];
    matches: CategoryNormalizationMatch[];
    unmapped: boolean;
    version: string;
}
export declare const CATEGORY_NORMALIZATION_VERSION = "v1";
export declare const DRYAD_CATEGORIES: PlaceCategory[];
export declare const OSM_CATEGORY_RULES: SourceCategoryMappingRule[];
export declare class OsmCategoryNormalizationEngine {
    private readonly rules;
    constructor(rules: SourceCategoryMappingRule[]);
    normalize(tags: Record<string, string>): CategoryNormalizationResult;
}
