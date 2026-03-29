import type { ProviderQuotaLimits, QuotaDecision, QuotaSnapshot } from "./quotaTypes.js";
export declare class QuotaManager {
    private readonly now;
    private readonly states;
    constructor(deps?: {
        now?: () => number;
    });
    configure(provider: string, limits: ProviderQuotaLimits): void;
    decide(provider: string, cost?: number): QuotaDecision;
    snapshot(provider: string): QuotaSnapshot | null;
    private normalizeLimit;
}
