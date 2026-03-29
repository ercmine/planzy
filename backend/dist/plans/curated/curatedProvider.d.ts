import type { PlanProvider, ProviderContext } from "../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../types.js";
import { type CuratedTemplate } from "./curatedData.js";
interface CuratedProviderOptions {
    templates?: CuratedTemplate[];
    enableLocalSuggestions?: boolean;
    includeTemplates?: boolean;
    maxTemplates?: number;
    maxSuggestions?: number;
}
export declare class CuratedProvider implements PlanProvider {
    readonly name = "curated";
    private readonly templates;
    private readonly enableLocalSuggestions;
    private readonly includeTemplates;
    private readonly maxTemplates;
    private readonly maxSuggestions;
    constructor(options?: CuratedProviderOptions);
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
}
export {};
