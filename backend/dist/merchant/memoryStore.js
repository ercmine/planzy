import { RetentionPolicy } from "../retention/policy.js";
function encodeOffset(offset) {
    return Buffer.from(String(offset), "utf8").toString("base64url");
}
function decodeOffset(cursor) {
    if (!cursor)
        return 0;
    try {
        const decoded = Buffer.from(cursor, "base64url").toString("utf8");
        const parsed = Number(decoded);
        if (!Number.isInteger(parsed) || parsed < 0)
            return 0;
        return parsed;
    }
    catch {
        return 0;
    }
}
function statusRank(status) {
    return status === "active" ? 0 : status === "paused" ? 1 : 2;
}
export class MemoryMerchantStore {
    promoted = new Map();
    specials = new Map();
    retentionPolicy;
    constructor(retentionPolicy) {
        this.retentionPolicy = retentionPolicy ?? new RetentionPolicy();
    }
    async createPromoted(record) {
        this.promoted.set(record.promoId, structuredClone(record));
    }
    async updatePromoted(promoId, patch) {
        const existing = this.promoted.get(promoId);
        if (!existing)
            return;
        this.promoted.set(promoId, { ...existing, ...structuredClone(patch) });
    }
    async listPromoted(opts) {
        const limit = Math.max(1, Math.min(200, Math.round(opts?.limit ?? 50)));
        const offset = decodeOffset(opts?.cursor);
        const filtered = [...this.promoted.values()].filter((item) => {
            if (opts?.venueId && item.venueId !== opts.venueId)
                return false;
            if (opts?.status && item.status !== opts.status)
                return false;
            return true;
        });
        filtered.sort((a, b) => {
            const byStatus = statusRank(a.status) - statusRank(b.status);
            if (byStatus !== 0)
                return byStatus;
            if (a.priority !== b.priority)
                return b.priority - a.priority;
            return Date.parse(b.createdAtISO) - Date.parse(a.createdAtISO);
        });
        const items = filtered.slice(offset, offset + limit).map((item) => structuredClone(item));
        const nextOffset = offset + items.length;
        return {
            items,
            nextCursor: nextOffset < filtered.length ? encodeOffset(nextOffset) : null
        };
    }
    async getPromoted(promoId) {
        const found = this.promoted.get(promoId);
        return found ? structuredClone(found) : null;
    }
    async deletePromoted(promoId) {
        this.promoted.delete(promoId);
    }
    async createSpecial(record) {
        this.specials.set(record.specialId, structuredClone(record));
    }
    async updateSpecial(specialId, patch) {
        const existing = this.specials.get(specialId);
        if (!existing)
            return;
        this.specials.set(specialId, { ...existing, ...structuredClone(patch) });
    }
    async listSpecials(opts) {
        const limit = Math.max(1, Math.min(200, Math.round(opts?.limit ?? 50)));
        const offset = decodeOffset(opts?.cursor);
        const filtered = [...this.specials.values()].filter((item) => {
            if (opts?.venueId && item.venueId !== opts.venueId)
                return false;
            if (opts?.status && item.status !== opts.status)
                return false;
            return true;
        });
        filtered.sort((a, b) => {
            const byStatus = statusRank(a.status) - statusRank(b.status);
            if (byStatus !== 0)
                return byStatus;
            const aStart = a.startsAtISO ? Date.parse(a.startsAtISO) : Number.POSITIVE_INFINITY;
            const bStart = b.startsAtISO ? Date.parse(b.startsAtISO) : Number.POSITIVE_INFINITY;
            if (aStart !== bStart)
                return aStart - bStart;
            return Date.parse(b.createdAtISO) - Date.parse(a.createdAtISO);
        });
        const items = filtered.slice(offset, offset + limit).map((item) => structuredClone(item));
        const nextOffset = offset + items.length;
        return {
            items,
            nextCursor: nextOffset < filtered.length ? encodeOffset(nextOffset) : null
        };
    }
    async getSpecial(specialId) {
        const found = this.specials.get(specialId);
        return found ? structuredClone(found) : null;
    }
    async deleteSpecial(specialId) {
        this.specials.delete(specialId);
    }
    prunePromos(maxAgeMs = this.retentionPolicy.config.maxTtlByClass.merchant_promos, now = new Date()) {
        const thresholdMs = now.getTime() - maxAgeMs;
        let removed = 0;
        for (const [promoId, promo] of this.promoted.entries()) {
            const createdAtMs = Date.parse(promo.createdAtISO);
            if (!Number.isFinite(createdAtMs) || createdAtMs < thresholdMs) {
                this.promoted.delete(promoId);
                removed += 1;
            }
        }
        return removed;
    }
    pruneSpecials(maxAgeMs = this.retentionPolicy.config.maxTtlByClass.merchant_specials, now = new Date()) {
        const thresholdMs = now.getTime() - maxAgeMs;
        let removed = 0;
        for (const [specialId, special] of this.specials.entries()) {
            const createdAtMs = Date.parse(special.createdAtISO);
            if (!Number.isFinite(createdAtMs) || createdAtMs < thresholdMs) {
                this.specials.delete(specialId);
                removed += 1;
            }
        }
        return removed;
    }
}
