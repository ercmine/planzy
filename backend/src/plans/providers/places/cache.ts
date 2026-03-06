export interface CacheEntry<T> {
  value: T;
  storedAtMs: number;
  ttlMs: number;
}

export class SimpleCache {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

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

  public set<T>(key: string, value: T, nowMs: number, ttlMs: number): void {
    this.cache.set(key, { value, storedAtMs: nowMs, ttlMs });
  }
}
