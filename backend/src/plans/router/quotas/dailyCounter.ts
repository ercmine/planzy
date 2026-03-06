import type { QuotaDecision } from "./quotaTypes.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayStartUtcMs(timestampMs: number): number {
  const date = new Date(timestampMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export class DailyCounter {
  private readonly limit: number;
  private readonly now: () => number;
  private currentDayStartMs: number;
  private used = 0;

  constructor(params: { limit: number; tz?: "UTC" }, deps?: { now?: () => number }) {
    this.limit = Math.max(0, params.limit);
    this.now = deps?.now ?? Date.now;
    this.currentDayStartMs = dayStartUtcMs(this.now());
  }

  public take(cost: number): QuotaDecision {
    const normalizedCost = Math.max(0, cost);
    this.rotateIfNeeded();

    if (this.used + normalizedCost <= this.limit) {
      this.used += normalizedCost;
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterMs: this.snapshot().resetInMs
    };
  }

  public snapshot(): { remaining: number; resetInMs: number } {
    this.rotateIfNeeded();
    const remaining = Math.max(0, this.limit - this.used);
    const nowMs = this.now();
    const resetInMs = Math.max(0, this.currentDayStartMs + DAY_MS - nowMs);
    return { remaining, resetInMs };
  }

  private rotateIfNeeded(): void {
    const nowMs = this.now();
    const dayStart = dayStartUtcMs(nowMs);
    if (dayStart !== this.currentDayStartMs) {
      this.currentDayStartMs = dayStart;
      this.used = 0;
    }
  }
}
