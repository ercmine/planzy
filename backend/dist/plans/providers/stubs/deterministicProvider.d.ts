import type { PlanProvider, ProviderContext } from "../../provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../../types.js";
import { type StubGenOptions } from "./generate.js";
export declare class DeterministicStubProvider implements PlanProvider {
    private readonly opts;
    readonly name: string;
    constructor(opts: StubGenOptions);
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
}
