import type { GooglePlace } from "./googlePlaces.js";
export type CategoryStrictnessMode = "strict" | "balanced" | "broad";
export type CategoryFitLabel = "exact_match" | "strong_match" | "decent_match" | "weak_match" | "mismatch";
export type ProviderId = "google" | "foursquare" | "unknown";
export interface CategoryDefinition {
    id: string;
    title: string;
    semanticIntent: string;
    parentId?: string;
    aliases: string[];
    synonyms: string[];
    primaryTerms: string[];
    secondaryTerms: string[];
    phraseTerms: string[];
    negativeTerms: string[];
    providerHints: Partial<Record<ProviderId, string[]>>;
    strictness: CategoryStrictnessMode;
    minConfidence: number;
}
export interface CategorySearchPlan {
    definition: CategoryDefinition;
    primaryTypes: string[];
    fallbackTypes: string[];
    queryTerms: string[];
}
export interface CategoryScore {
    score: number;
    keep: boolean;
    confidence: number;
    reasons: string[];
    fitLabel: CategoryFitLabel;
    rejectionReason?: string;
    evidence?: CategoryEvidenceBreakdown;
}
export interface ProviderPlaceEvidence {
    provider: ProviderId;
    placeId: string;
    primaryType?: string;
    types?: string[];
    subcategories?: string[];
    name?: string;
    description?: string;
    tags?: string[];
    features?: string[];
    menuTerms?: string[];
    website?: string;
}
export interface ManualCategoryOverride {
    hardExcludeCategoryIds?: string[];
    hardPrimaryCategoryId?: string;
    addSecondaryCategoryIds?: string[];
    removeCategoryIds?: string[];
    categoryAdjustments?: Record<string, number>;
    suppressedCategoryIds?: string[];
}
export interface CategoryEvidenceContribution {
    source: string;
    value: string;
    delta: number;
}
export interface CategoryEvidenceBreakdown {
    contributions: CategoryEvidenceContribution[];
    bonuses: CategoryEvidenceContribution[];
    penalties: CategoryEvidenceContribution[];
    overrideApplied?: string;
    finalScore: number;
}
export interface CategoryCandidate {
    categoryId: string;
    score: number;
    confidence: number;
    fit: CategoryFitLabel;
    evidence: CategoryEvidenceBreakdown;
}
export interface PlaceCategoryProfile {
    primaryCategoryId?: string;
    secondaryCategoryIds: string[];
    categoryScores: Record<string, number>;
    fitByCategory: Record<string, CategoryFitLabel>;
    evidenceByCategory: Record<string, CategoryEvidenceBreakdown>;
    weakCategoryIds: string[];
    lastComputedAt: string;
    overrideFlags: string[];
    provenance: string[];
}
export declare function classifyPlaceCategories(evidenceList: ProviderPlaceEvidence[], override?: ManualCategoryOverride): PlaceCategoryProfile;
export declare function resolveCategoryAlias(category?: string): string;
export declare function getCategoryDefinition(category?: string): CategoryDefinition;
export declare function buildCategorySearchPlan(category?: string): CategorySearchPlan;
export declare function scorePlaceForCategory(place: GooglePlace, definition: CategoryDefinition, originWeight?: number): CategoryScore;
export interface CategoryFilterResult {
    kept: GooglePlace[];
    rejected: Array<{
        place: GooglePlace;
        reason: string;
    }>;
    scoreMap: Map<string, CategoryScore>;
}
export interface CategoryRankingOptions {
    sourcePriority?: Map<string, number>;
    placeOverrides?: Map<string, ManualCategoryOverride>;
    strictness?: CategoryStrictnessMode;
}
export declare function rankAndFilterCategoryResults(places: GooglePlace[], definition: CategoryDefinition, opts?: CategoryRankingOptions): CategoryFilterResult;
export declare function categoryToIncludedTypes(category?: string): string[];
