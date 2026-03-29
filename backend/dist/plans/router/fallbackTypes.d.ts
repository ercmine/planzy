import type { Plan } from "../plan.js";
export interface NeverEmptyOptions {
    enabled?: boolean;
    minResults?: number;
    hardMinResults?: number;
    maxBackfill?: number;
    preferByoFirst?: boolean;
    curatedProviderName?: string;
    byoProviderName?: string;
}
export interface FallbackDebug {
    triggered: boolean;
    reason?: "too_few" | "all_failed" | "empty";
    initialCount: number;
    afterByoCount: number;
    afterCuratedCount: number;
    byoUsed: boolean;
    curatedUsed: boolean;
    errors: {
        provider: string;
        code: string;
        message: string;
    }[];
}
export interface FallbackResult {
    plans: Plan[];
    debug?: FallbackDebug;
}
