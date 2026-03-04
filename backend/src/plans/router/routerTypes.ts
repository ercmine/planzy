import type { Plan } from "../plan.js";
import type { PlanProvider } from "../provider.js";

export interface ProviderRouterOptions {
  providers: PlanProvider[];
  defaultTimeoutMs?: number;
  perProviderTimeoutMs?: Record<string, number>;
  maxFanout?: number;
  allowPartial?: boolean;
  includeDebug?: boolean;
}

export interface ProviderCallDebug {
  provider: string;
  tookMs: number;
  returned: number;
  error?: { code: string; message: string; retryable?: boolean };
}

export interface RouterDebug {
  calls: ProviderCallDebug[];
  deduped: { before: number; after: number };
  ranked: { count: number };
  tookMs: number;
}

export interface RouterSearchResult {
  plans: Plan[];
  nextCursor?: string | null;
  sources: string[];
  debug?: RouterDebug;
}

export type RouterCursor = string;
