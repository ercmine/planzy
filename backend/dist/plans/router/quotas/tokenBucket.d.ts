import type { QuotaDecision } from "./quotaTypes.js";
export declare class TokenBucket {
    private tokens;
    private lastRefillMs;
    private readonly capacity;
    private readonly refillPerMs;
    private readonly now;
    constructor(params: {
        capacity: number;
        refillPerMs: number;
    }, deps?: {
        now?: () => number;
    });
    take(cost: number): QuotaDecision;
    snapshot(): {
        remaining: number;
        retryAfterMs: number;
    };
    private refill;
}
