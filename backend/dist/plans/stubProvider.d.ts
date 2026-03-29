import type { PlanProvider, ProviderContext } from "./provider.js";
import type { SearchPlansInput, SearchPlansResult } from "./types.js";
export declare class StubProvider implements PlanProvider {
    readonly name = "stub";
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
}
