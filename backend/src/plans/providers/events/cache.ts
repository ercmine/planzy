import type { RetentionPolicy } from "../../../retention/policy.js";
import { RetentionPolicy as DefaultRetentionPolicy } from "../../../retention/policy.js";
import type { SearchPlansInput } from "../../types.js";

export interface CacheEntry<T> {
  value: T;
  storedAtMs: number;
  ttlMs: number;
}

export class SimpleCache {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly retentionPolicy: RetentionPolicy;

  constructor(retentionPolicy?: RetentionPolicy) {
    this.retentionPolicy = retentionPolicy ?? new DefaultRetentionPolicy();
  }

  public get<T>(key: string, nowMs: number): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (nowMs - entry.storedAtMs >= entry.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  public set<T>(key: string, value: T, nowMs: number, ttlMs: number, provider = "ticketmaster"): void {
    const effectiveTtlMs = this.retentionPolicy.clampProviderTtl(provider, ttlMs);
    this.cache.set(key, { value, storedAtMs: nowMs, ttlMs: effectiveTtlMs });
  }
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function buildEventsCacheKey(input: SearchPlansInput): string {
  return [
    "events",
    roundCoord(input.location.lat),
    roundCoord(input.location.lng),
    input.radiusMeters,
    input.timeWindow?.start ?? "",
    input.timeWindow?.end ?? "",
    (input.categories ?? []).join(","),
    input.locale ?? ""
  ].join("|");
}
