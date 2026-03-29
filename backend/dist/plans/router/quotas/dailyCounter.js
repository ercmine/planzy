const DAY_MS = 24 * 60 * 60 * 1000;
function dayStartUtcMs(timestampMs) {
    const date = new Date(timestampMs);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
export class DailyCounter {
    limit;
    now;
    currentDayStartMs;
    used = 0;
    constructor(params, deps) {
        this.limit = Math.max(0, params.limit);
        this.now = deps?.now ?? Date.now;
        this.currentDayStartMs = dayStartUtcMs(this.now());
    }
    take(cost) {
        const normalizedCost = Math.max(0, cost);
        this.rotateIfNeeded();
        if (this.used + normalizedCost <= this.limit) {
            this.used += normalizedCost;
            return { allowed: true };
        }
        return {
            allowed: false,
            retryAfterMs: this.snapshot().resetInMs
        };
    }
    snapshot() {
        this.rotateIfNeeded();
        const remaining = Math.max(0, this.limit - this.used);
        const nowMs = this.now();
        const resetInMs = Math.max(0, this.currentDayStartMs + DAY_MS - nowMs);
        return { remaining, resetInMs };
    }
    rotateIfNeeded() {
        const nowMs = this.now();
        const dayStart = dayStartUtcMs(nowMs);
        if (dayStart !== this.currentDayStartMs) {
            this.currentDayStartMs = dayStart;
            this.used = 0;
        }
    }
}
