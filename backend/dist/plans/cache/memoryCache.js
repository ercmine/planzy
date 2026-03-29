const DEFAULT_OPTIONS = {
    maxEntries: 500,
    maxBytesApprox: 25_000_000,
    pruneIntervalMs: 30_000
};
const SIZE_CALCULATION_CAP = 1_000_000;
function estimateValueSize(value) {
    if (value === null || value === undefined) {
        return 4;
    }
    if (typeof value === "string") {
        return Math.min(value.length, SIZE_CALCULATION_CAP);
    }
    try {
        const json = JSON.stringify(value);
        if (!json) {
            return 0;
        }
        return Math.min(json.length, SIZE_CALCULATION_CAP);
    }
    catch {
        return 0;
    }
}
export class MemoryCache {
    store = new Map();
    tagIndex = new Map();
    opts;
    now;
    totalBytesApprox = 0;
    totalHits = 0;
    totalMisses = 0;
    lastPruneMs = 0;
    constructor(opts, deps) {
        this.opts = { ...DEFAULT_OPTIONS, ...(opts ?? {}) };
        this.now = deps?.now ?? (() => Date.now());
        this.lastPruneMs = this.now();
    }
    get(key) {
        this.pruneIfNeeded();
        const entry = this.store.get(key);
        if (!entry) {
            this.totalMisses += 1;
            return null;
        }
        const now = this.now();
        if (entry.expiresAtMs <= now) {
            this.delete(key);
            this.totalMisses += 1;
            return null;
        }
        this.store.delete(key);
        entry.hits += 1;
        this.totalHits += 1;
        this.store.set(key, entry);
        return entry.value;
    }
    set(key, value, ttlMs, tags = []) {
        this.pruneIfNeeded();
        if (ttlMs <= 0) {
            this.delete(key);
            return;
        }
        this.delete(key);
        const storedAtMs = this.now();
        const normalizedTags = [...new Set(tags.filter(Boolean))];
        const entry = {
            key,
            value,
            storedAtMs,
            expiresAtMs: storedAtMs + ttlMs,
            tags: normalizedTags,
            hits: 0,
            approxBytes: estimateValueSize(value)
        };
        this.store.set(key, entry);
        this.totalBytesApprox += entry.approxBytes;
        for (const tag of normalizedTags) {
            const keys = this.tagIndex.get(tag) ?? new Set();
            keys.add(key);
            this.tagIndex.set(tag, keys);
        }
        this.enforceCapacity();
    }
    delete(key) {
        const existing = this.store.get(key);
        if (!existing) {
            return;
        }
        this.store.delete(key);
        this.totalBytesApprox = Math.max(0, this.totalBytesApprox - existing.approxBytes);
        for (const tag of existing.tags) {
            const keys = this.tagIndex.get(tag);
            if (!keys) {
                continue;
            }
            keys.delete(key);
            if (keys.size === 0) {
                this.tagIndex.delete(tag);
            }
        }
    }
    invalidateByTag(tag) {
        const keys = this.tagIndex.get(tag);
        if (!keys) {
            return 0;
        }
        const keyList = [...keys];
        for (const key of keyList) {
            this.delete(key);
        }
        return keyList.length;
    }
    invalidateByPrefix(prefix) {
        if (!prefix) {
            return 0;
        }
        let removed = 0;
        for (const key of [...this.store.keys()]) {
            if (key.startsWith(prefix)) {
                this.delete(key);
                removed += 1;
            }
        }
        return removed;
    }
    stats() {
        return {
            entries: this.store.size,
            hits: this.totalHits,
            misses: this.totalMisses
        };
    }
    pruneIfNeeded() {
        const now = this.now();
        if (now - this.lastPruneMs < this.opts.pruneIntervalMs) {
            return;
        }
        this.lastPruneMs = now;
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAtMs <= now) {
                this.delete(key);
            }
        }
    }
    enforceCapacity() {
        while (this.store.size > this.opts.maxEntries || this.totalBytesApprox > this.opts.maxBytesApprox) {
            const oldestKey = this.store.keys().next().value;
            if (!oldestKey) {
                return;
            }
            this.delete(oldestKey);
        }
    }
}
