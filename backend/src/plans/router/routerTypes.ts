import type { Plan } from "../plan.js";
import type { PlanProvider } from "../provider.js";
import type { AppConfig } from "../../config/schema.js";
import type { BoosterDebug } from "./boosterTypes.js";
import type { FallbackDebug, NeverEmptyOptions } from "./fallbackTypes.js";
import type { QuotaManager } from "./quotas/quotaManager.js";
import type { ProviderHealthMonitor } from "./health/healthMonitor.js";
import type { SponsoredPlacementDebug, SponsoredPlacementOptions } from "./sponsored/sponsoredTypes.js";

export interface ProviderRouterOptions {
  providers: PlanProvider[];
  defaultTimeoutMs?: number;
  perProviderTimeoutMs?: Record<string, number>;
  maxFanout?: number;
  allowPartial?: boolean;
  includeDebug?: boolean;
  quotaManager?: QuotaManager;
  healthMonitor?: ProviderHealthMonitor;
  enforceHealth?: boolean;
  enforceQuotas?: boolean;
  gracefulOnQuota?: boolean;
  config?: AppConfig;
  neverEmpty?: NeverEmptyOptions;
  cache?: {
    enabled?: boolean;
    ttlMs?: number;
    precision?: 3 | 4 | 5;
  };
  sponsoredPlacement?: SponsoredPlacementOptions;
}

export interface ProviderCallDebug {
  provider: string;
  tookMs: number;
  returned: number;
  error?: { code: string; message: string; retryable?: boolean; retryAfterMs?: number };
}

export interface RouterDebug {
  cacheHit?: boolean;
  calls: ProviderCallDebug[];
  deduped: { before: number; after: number };
  ranked: { count: number };
  booster?: BoosterDebug;
  sponsored?: SponsoredPlacementDebug;
  fallback?: FallbackDebug;
  tookMs: number;
}

export interface RouterSearchResult {
  plans: Plan[];
  nextCursor?: string | null;
  sources: string[];
  debug?: RouterDebug;
}

/**
 * Opaque router cursor string. Current implementation uses versioned base64url payloads;
 * callers must treat this as an opaque token.
 */
export type RouterCursor = string;
