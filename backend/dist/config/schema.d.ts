import type { AffiliateConfig } from "../affiliate/types.js";
import type { Category } from "../plans/plan.js";
import type { RetentionConfig } from "../retention/types.js";
export type ProviderName = string;
export interface ProviderQuotaConfig {
    requestsPerMinute?: number;
    requestsPerDay?: number;
    /**
     * Token bucket capacity for instantaneous spikes.
     * Defaults to requestsPerMinute when omitted.
     */
    burst?: number;
}
export interface ProviderBudgetConfig {
    maxConcurrent?: number;
    timeoutMs?: number;
    /**
     * Logical request cost used by router-level quota enforcement.
     * Defaults to 1.
     */
    requestCost?: number;
}
export interface ProviderCacheConfig {
    ttlMs?: number;
    staleWhileRevalidateMs?: number;
}
export interface ProviderRoutingConfig {
    enabled?: boolean;
    categories?: Partial<Record<Category, number>>;
}
export interface ProviderSecretsConfig {
    apiKey?: string;
    apiKeyHeader?: string;
}
export interface ProviderConfig {
    name: ProviderName;
    routing?: ProviderRoutingConfig;
    quota?: ProviderQuotaConfig;
    budget?: ProviderBudgetConfig;
    cache?: ProviderCacheConfig;
    secrets?: ProviderSecretsConfig;
}
export interface PlansRouterConfig {
    defaultTimeoutMs: number;
    allowPartial: boolean;
    maxFanout?: number;
    perCategoryProviderOrder?: Partial<Record<Category, ProviderName[]>>;
}
export interface AppConfig {
    geocoding?: {
        baseUrl?: string;
        timeoutMs: number;
        geocodeCacheTtlMs: number;
        reverseCacheTtlMs: number;
        defaultLimit: number;
        enableFallback: boolean;
        fallbackBaseUrl?: string;
        userAgent?: string;
    };
    env: "dev" | "stage" | "prod";
    affiliate?: AffiliateConfig;
    retention?: Partial<RetentionConfig>;
    remoteConfig?: {
        url?: string;
        ttlMs: number;
        timeoutMs: number;
        allowInsecureHttp: boolean;
    };
    plans: {
        router: PlansRouterConfig;
        providers: Record<ProviderName, ProviderConfig>;
    };
}
export declare function defaultConfig(env: AppConfig["env"]): AppConfig;
