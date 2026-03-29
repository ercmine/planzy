export interface CategoryResolution {
    canonicalCategory: string;
    canonicalSubcategory?: string;
    tags: string[];
    confidence: number;
    reasoning: string;
}
export declare function resolveCanonicalCategory(providerCategories: string[], placeName: string): CategoryResolution;
