import { type Plan } from "../plan.js";
import type { SearchPlansInputNormalized } from "../validation.js";
import type { CuratedTemplate } from "./curatedData.js";
export interface SuggestionOptions {
    enableLocalSuggestions: boolean;
    maxSuggestions: number;
}
export declare function buildLocalSuggestions(input: SearchPlansInputNormalized, templates: CuratedTemplate[], opts?: Partial<SuggestionOptions>): Plan[];
