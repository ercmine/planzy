import type { ProviderContext, PlanProvider } from "../plans/provider.js";
import type { SearchPlansInput, SearchPlansResult } from "../plans/types.js";
import { MerchantService } from "./service.js";
export declare class PromotedProvider implements PlanProvider {
    private readonly service;
    private readonly opts?;
    readonly name = "promoted";
    constructor(service: MerchantService, opts?: {
        maxReturn?: number;
    } | undefined);
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
}
