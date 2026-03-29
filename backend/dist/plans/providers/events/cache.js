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
    set(key, value, nowMs, ttlMs, provider = "ticketmaster") {
        const effectiveTtlMs = this.retentionPolicy.clampProviderTtl(provider, ttlMs);
        this.cache.set(key, { value, storedAtMs: nowMs, ttlMs: effectiveTtlMs });
    }
}
function roundCoord(value) {
    return Math.round(value * 1_000) / 1_000;
}
export function buildEventsCacheKey(input) {
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
