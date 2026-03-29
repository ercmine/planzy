import type { PlanProvider, ProviderContext } from "../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../types.js";
import type { IdeasStore } from "./storage.js";
export interface BringYourOwnProviderOptions {
    maxIdeasPerSession?: number;
    includeDeleted?: boolean;
}
export declare class BringYourOwnProvider implements PlanProvider {
    private readonly store;
    private readonly options;
    readonly name = "byo";
    private readonly maxIdeasPerSession;
    constructor(store: IdeasStore, options?: BringYourOwnProviderOptions);
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
    private toPlan;
}
