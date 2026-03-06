import { DailyCounter } from "./dailyCounter.js";
import { TokenBucket } from "./tokenBucket.js";
import type { ProviderQuotaLimits, QuotaDecision, QuotaSnapshot } from "./quotaTypes.js";

interface ProviderQuotaState {
  limits: ProviderQuotaLimits;
  tokenBucket?: TokenBucket;
  daily?: DailyCounter;
}

export class QuotaManager {
  private readonly now: () => number;
  private readonly states = new Map<string, ProviderQuotaState>();

  constructor(deps?: { now?: () => number }) {
    this.now = deps?.now ?? Date.now;
  }

  public configure(provider: string, limits: ProviderQuotaLimits): void {
    const rpm = this.normalizeLimit(limits.requestsPerMinute);
    const rpd = this.normalizeLimit(limits.requestsPerDay);
    const burst = this.normalizeLimit(limits.burst);
    const costPerRequest = this.normalizeLimit(limits.costPerRequest);

    const normalized: ProviderQuotaLimits = {
      requestsPerMinute: rpm,
      requestsPerDay: rpd,
      burst,
      costPerRequest
    };

    const prev = this.states.get(provider);
    let tokenBucket = prev?.tokenBucket;
    let daily = prev?.daily;

    if (rpm !== undefined) {
      const capacity = burst ?? rpm;
      const refillPerMs = rpm / 60_000;
      const sameLimits = prev?.limits.requestsPerMinute === rpm && prev?.limits.burst === burst;
      if (!tokenBucket || !sameLimits) {
        tokenBucket = new TokenBucket({ capacity, refillPerMs }, { now: this.now });
      }
    } else {
      tokenBucket = undefined;
    }

    if (rpd !== undefined) {
      const sameLimit = prev?.limits.requestsPerDay === rpd;
      if (!daily || !sameLimit) {
        daily = new DailyCounter({ limit: rpd, tz: "UTC" }, { now: this.now });
      }
    } else {
      daily = undefined;
    }

    this.states.set(provider, { limits: normalized, tokenBucket, daily });
  }

  public decide(provider: string, cost?: number): QuotaDecision {
    const state = this.states.get(provider);
    if (!state) {
      return { allowed: true };
    }

    const effectiveCost = Math.max(0, cost ?? state.limits.costPerRequest ?? 1);

    if (state.daily) {
      const dailySnapshot = state.daily.snapshot();
      if (dailySnapshot.remaining < effectiveCost) {
        return { allowed: false, reason: "rpd", retryAfterMs: dailySnapshot.resetInMs };
      }
    }

    if (state.tokenBucket) {
      const tokenDecision = state.tokenBucket.take(effectiveCost);
      if (!tokenDecision.allowed) {
        return {
          allowed: false,
          reason: state.limits.burst !== undefined ? "burst" : "rpm",
          retryAfterMs: tokenDecision.retryAfterMs
        };
      }
    }

    if (state.daily) {
      const dailyDecision = state.daily.take(effectiveCost);
      if (!dailyDecision.allowed) {
        return { allowed: false, reason: "rpd", retryAfterMs: dailyDecision.retryAfterMs };
      }
    }

    return { allowed: true };
  }

  public snapshot(provider: string): QuotaSnapshot | null {
    const state = this.states.get(provider);
    if (!state) {
      return null;
    }

    const quotaSnapshot: QuotaSnapshot = { provider };

    if (state.tokenBucket) {
      const tokenSnapshot = state.tokenBucket.snapshot();
      quotaSnapshot.rpmRemaining = tokenSnapshot.remaining;
      quotaSnapshot.burstRemaining = tokenSnapshot.remaining;
      quotaSnapshot.resetInMs = {
        ...quotaSnapshot.resetInMs,
        minute: tokenSnapshot.retryAfterMs
      };
    }

    if (state.daily) {
      const dailySnapshot = state.daily.snapshot();
      quotaSnapshot.rpdRemaining = dailySnapshot.remaining;
      quotaSnapshot.resetInMs = {
        ...quotaSnapshot.resetInMs,
        day: dailySnapshot.resetInMs
      };
    }

    return quotaSnapshot;
  }

  private normalizeLimit(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
      return undefined;
    }

    return value;
  }
}

// NOTE: This in-memory manager is single-instance only. Multi-instance enforcement should move to Redis.
