export class TokenBucket {
    tokens;
    lastRefillMs;
    capacity;
    refillPerMs;
    now;
    constructor(params, deps) {
        this.capacity = Math.max(0, params.capacity);
        this.refillPerMs = Math.max(0, params.refillPerMs);
        this.now = deps?.now ?? Date.now;
        this.tokens = this.capacity;
        this.lastRefillMs = this.now();
    }
    take(cost) {
        const normalizedCost = Math.max(0, cost);
        this.refill();
        if (normalizedCost <= this.tokens) {
            this.tokens -= normalizedCost;
            return { allowed: true };
        }
        if (this.refillPerMs <= 0) {
            return { allowed: false, retryAfterMs: Number.POSITIVE_INFINITY };
        }
        const missing = normalizedCost - this.tokens;
        const retryAfterMs = Math.ceil(missing / this.refillPerMs);
        return { allowed: false, retryAfterMs };
    }
    snapshot() {
        this.refill();
        if (this.refillPerMs <= 0) {
            return {
                remaining: this.tokens,
                retryAfterMs: this.tokens >= 1 ? 0 : Number.POSITIVE_INFINITY
            };
        }
        const retryAfterMs = this.tokens >= 1 ? 0 : Math.ceil((1 - this.tokens) / this.refillPerMs);
        return { remaining: this.tokens, retryAfterMs };
    }
    refill() {
        const nowMs = this.now();
        const elapsed = Math.max(0, nowMs - this.lastRefillMs);
        if (elapsed <= 0) {
            return;
        }
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
        this.lastRefillMs = nowMs;
    }
}
