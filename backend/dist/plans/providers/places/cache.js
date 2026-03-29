import { RetentionPolicy as DefaultRetentionPolicy } from "../../../retention/policy.js";
export class SimpleCache {
    cache = new Map();
    retentionPolicy;
    constructor(retentionPolicy) {
        this.retentionPolicy = retentionPolicy ?? new DefaultRetentionPolicy();
    }
    get(key, nowMs) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (nowMs - entry.storedAtMs >= entry.ttlMs) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, nowMs, ttlMs, provider) {
        const effectiveTtlMs = provider
            ? this.retentionPolicy.clampProviderTtl(provider, ttlMs)
            : this.retentionPolicy.clampTtl("provider_api_cache", ttlMs);
        this.cache.set(key, { value, storedAtMs: nowMs, ttlMs: effectiveTtlMs });
    }
}
