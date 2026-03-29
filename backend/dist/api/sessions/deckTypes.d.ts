import type { Plan } from "../../plans/plan.js";
export interface DeckQueryParams {
    cursor?: string | null;
    limit?: number;
    radiusMeters?: number;
    categories?: string;
    openNow?: boolean;
    priceLevelMax?: number;
    timeStart?: string;
    timeEnd?: string;
    locale?: string;
    lat?: number;
    lng?: number;
}
export interface DeckSourceMix {
    providersUsed: string[];
    planSourceCounts: Record<string, number>;
    categoryCounts: Record<string, number>;
    sponsoredCount: number;
}
export interface DeckBatchResponse {
    sessionId: string;
    plans: Plan[];
    nextCursor: string | null;
    mix: DeckSourceMix;
    debug?: {
        requestId: string;
        cacheHit?: boolean;
    };
}
