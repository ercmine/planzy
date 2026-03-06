export type ProviderStatus = "healthy" | "degraded" | "disabled_temp";

export interface ProviderCallOutcome {
  provider: string;
  ok: boolean;
  tookMs: number;
  returned: number;
  errorCode?: string;
  retryable?: boolean;
  atMs: number;
}

export interface ProviderHealthConfig {
  windowSize: number;
  minCallsForRate: number;
  degradedSuccessRate: number;
  disableSuccessRate: number;
  maxConsecutiveFailures: number;
  disableForMs: number;
  halfOpenAfterMs: number;
}

export interface ProviderHealthSnapshot {
  provider: string;
  status: ProviderStatus;
  successRate?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  consecutiveFailures: number;
  disabledUntilMs?: number;
  lastErrorCodes: Record<string, number>;
  lastUpdatedMs: number;
}
