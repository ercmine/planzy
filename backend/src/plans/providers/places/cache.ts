import type { RetentionPolicy } from "../../../retention/policy.js";
import { RetentionPolicy as DefaultRetentionPolicy } from "../../../retention/policy.js";

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

  public set<T>(key: string, value: T, nowMs: number, ttlMs: number, provider?: string): void {
    const effectiveTtlMs = provider
      ? this.retentionPolicy.clampProviderTtl(provider, ttlMs)
      : this.retentionPolicy.clampTtl("provider_api_cache", ttlMs);
    this.cache.set(key, { value, storedAtMs: nowMs, ttlMs: effectiveTtlMs });
  }
}
