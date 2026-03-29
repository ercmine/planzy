import type { AppConfig } from "../config/schema.js";
import type { Logger } from "../logging/loggerTypes.js";
import type { Category, PriceLevel } from "./plan.js";
import type { SearchPlansInput, SearchPlansResult } from "./types.js";
export interface RankingSignals {
    sessionId?: string;
    seenPlanIds?: string[];
    seenSignatures?: string[];
    preferredCategories?: Category[];
    avoidedCategories?: Category[];
    priceComfortMax?: PriceLevel;
    noveltyWindowSize?: number;
}
export interface ProviderContext {
    requestId?: string;
    logger?: Logger;
    timeoutMs?: number;
    signal?: AbortSignal;
    sessionId?: string;
    userId?: string;
    config?: AppConfig;
    ranking?: RankingSignals;
}
export interface PlanProvider {
    readonly name: string;
    /**
     * Search for plans using normalized constraints.
     * Cursor is opaque and provider-specific; callers must not inspect or mutate it.
     */
    searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult>;
}
export declare function makePlanId(source: string, sourceId: string): string;
export declare function isAbortError(error: unknown): boolean;
