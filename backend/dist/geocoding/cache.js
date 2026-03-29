export class MemoryGeocodingCache {
    now;
    entries = new Map();
    constructor(now = () => Date.now()) {
        this.now = now;
    }
    get(key) {
        const entry = this.entries.get(key);
        if (!entry)
            return null;
        if (this.now() > entry.expiresAtMs) {
            this.entries.delete(key);
            return null;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        this.entries.set(key, { value, expiresAtMs: this.now() + ttlMs });
    }
}
