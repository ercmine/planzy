import type { Category } from "../plans/plan.js";

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
  env: "dev" | "stage" | "prod";
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

export function defaultConfig(env: AppConfig["env"]): AppConfig {
  return {
    env,
    remoteConfig: {
      ttlMs: 60_000,
      timeoutMs: 2_000,
      allowInsecureHttp: false
    },
    plans: {
      router: {
        defaultTimeoutMs: 2_500,
        allowPartial: true
      },
      providers: {
        stub: {
          name: "stub",
          routing: {
            enabled: true
          },
          budget: {
            timeoutMs: 2_500,
            maxConcurrent: 10
          },
          cache: {
            ttlMs: 30_000,
            staleWhileRevalidateMs: 5_000
          },
          quota: {
            requestsPerMinute: 120,
            requestsPerDay: 100_000,
            burst: 20
          }
        }
      }
    }
  };
}
