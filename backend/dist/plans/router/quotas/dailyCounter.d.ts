import type { QuotaDecision } from "./quotaTypes.js";
export declare class DailyCounter {
    private readonly limit;
    private readonly now;
    private currentDayStartMs;
    private used;
    constructor(params: {
        limit: number;
        tz?: "UTC";
    }, deps?: {
        now?: () => number;
    });
    take(cost: number): QuotaDecision;
    snapshot(): {
        remaining: number;
        resetInMs: number;
    };
    private rotateIfNeeded;
}
