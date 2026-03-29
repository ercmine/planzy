import type { Category, PriceLevel } from "../plan.js";
export interface CuratedTemplate {
    id: string;
    title: string;
    description: string;
    category: Category;
    defaultPriceLevel?: PriceLevel;
    keywords: string[];
    imageUrls?: string[];
}
export declare const CURATED_TEMPLATES: CuratedTemplate[];
