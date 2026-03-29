import type { Plan } from "../plan.js";
import { type PlanProvider, type ProviderContext } from "../provider.js";
import type { SearchPlansInput } from "../types.js";
import type { FallbackResult, NeverEmptyOptions } from "./fallbackTypes.js";
export declare function applyNeverEmptyFallback(params: {
    input: SearchPlansInput;
    ctx?: ProviderContext;
    basePlans: Plan[];
    providers: PlanProvider[];
    providerErrors: {
        provider: string;
        error: unknown;
    }[];
    opts?: NeverEmptyOptions & {
        includeDebug?: boolean;
    };
    now?: Date;
}): Promise<FallbackResult>;
