export interface ProviderQuotaLimits {
    requestsPerMinute?: number;
    requestsPerDay?: number;
    burst?: number;
    costPerRequest?: number;
}
export interface QuotaDecision {
    allowed: boolean;
    retryAfterMs?: number;
    reason?: "rpm" | "rpd" | "burst";
}
export interface QuotaSnapshot {
    provider: string;
    rpmRemaining?: number;
    rpdRemaining?: number;
    burstRemaining?: number;
    resetInMs?: {
        minute?: number;
        day?: number;
    };
}
