import { RetentionPolicy as DefaultRetentionPolicy } from "../../retention/policy.js";
import { validatePlanArray } from "../planValidation.js";
import { geoCell } from "./geoCell.js";
import { buildCacheKey, normalizeKeyParts } from "./key.js";
import { MemoryCache } from "./memoryCache.js";
import { makeTags } from "./tags.js";
const DEFAULT_TTL_MS = 30_000;
export class PlanSearchCache {
    cache;
    opts;
    retentionPolicy;
    constructor(cache, opts, deps) {
        this.cache = cache ?? new MemoryCache(undefined, deps);
        this.retentionPolicy = deps?.retentionPolicy ?? new DefaultRetentionPolicy();
        this.opts = {
            enabled: opts?.enabled ?? true,
            ttlMs: opts?.ttlMs ?? DEFAULT_TTL_MS,
            precision: opts?.precision ?? 3,
            providerName: opts?.providerName ?? "router"
        };
    }
    buildKey(input, ctx) {
        const parts = this.toParts(input, ctx);
        return buildCacheKey(parts);
    }
    get(input, ctx) {
        if (!this.opts.enabled) {
            return null;
        }
        const key = this.buildKey(input, ctx);
        return this.cache.get(key);
    }
    set(input, ctx, plans, ttlMs) {
        if (!this.opts.enabled || ctx?.signal?.aborted) {
            return;
        }
        const validPlans = validatePlanArray(plans);
        const keyParts = this.toParts(input, ctx);
        const tags = makeTags(keyParts);
        const key = buildCacheKey(keyParts);
        const effectiveTtlMs = this.retentionPolicy.clampTtl("router_deck_cache", ttlMs ?? this.opts.ttlMs);
        this.cache.set(key, validPlans, effectiveTtlMs, tags);
    }
    invalidate(params) {
        let removed = 0;
        if (params.provider) {
            removed += this.cache.invalidateByTag(`provider:${params.provider}`);
        }
        if (params.category) {
            removed += this.cache.invalidateByTag(`cat:${params.category}`);
        }
        if (params.sessionId) {
            removed += this.cache.invalidateByTag(`session:${params.sessionId}`);
        }
        if (params.cellPrefix) {
            const cellPrefix = params.cellPrefix.startsWith("cell:") ? params.cellPrefix : `cell:${params.cellPrefix}`;
            removed += this.cache.invalidateByTag(`cell:${cellPrefix}`);
            removed += this.cache.invalidateByTag(`cellp:${cellPrefix}`);
            removed += this.cache.invalidateByPrefix(cellPrefix);
        }
        return removed;
    }
    stats() {
        return this.cache.stats();
    }
    toParts(input, ctx) {
        return normalizeKeyParts({
            provider: this.opts.providerName,
            cell: geoCell(input.location.lat, input.location.lng, this.opts.precision),
            radiusMeters: input.radiusMeters,
            categories: input.categories,
            priceLevelMax: input.priceLevelMax,
            openNow: input.openNow,
            timeWindow: input.timeWindow
                ? {
                    startISO: input.timeWindow.start,
                    endISO: input.timeWindow.end
                }
                : null,
            locale: input.locale,
            sessionId: ctx?.sessionId,
            version: "v2"
        });
    }
}
