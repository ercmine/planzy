interface CacheEntry<T> {
  value: T;
  expiresAtMs: number;
}

export interface GeocodingCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs: number): void;
}

export class MemoryGeocodingCache implements GeocodingCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  constructor(private readonly now = () => Date.now()) {}

  get<T>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (this.now() > entry.expiresAtMs) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.entries.set(key, { value, expiresAtMs: this.now() + ttlMs });
  }
}
