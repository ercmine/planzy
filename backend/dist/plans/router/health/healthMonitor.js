import { RollingWindow } from "./rollingWindow.js";
const DEFAULT_CONFIG = {
    windowSize: 50,
    minCallsForRate: 10,
    degradedSuccessRate: 0.7,
    disableSuccessRate: 0.4,
    maxConsecutiveFailures: 5,
    disableForMs: 120_000,
    halfOpenAfterMs: 30_000
};
function quantile95(values) {
    if (values.length === 0) {
        return undefined;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1));
    return sorted[idx];
}
export class ProviderHealthMonitor {
    cfg;
    now;
    stateByProvider = new Map();
    constructor(cfg, deps) {
        this.cfg = { ...DEFAULT_CONFIG, ...cfg };
        this.now = deps?.now ?? (() => Date.now());
    }
    record(outcome) {
        const atMs = outcome.atMs ?? this.now();
        const state = this.getState(outcome.provider);
        state.outcomes.push({ ...outcome, atMs });
        state.lastUpdatedMs = atMs;
        if (outcome.ok) {
            state.consecutiveFailures = 0;
            return;
        }
        state.consecutiveFailures += 1;
        this.evaluateForDisable(state, atMs);
    }
    shouldSkip(provider) {
        const now = this.now();
        const state = this.stateByProvider.get(provider);
        if (!state?.disabledUntilMs) {
            return { skip: false };
        }
        if (now >= state.disabledUntilMs) {
            state.disabledUntilMs = undefined;
            state.halfOpenProbeUsedUntilMs = undefined;
            return { skip: false };
        }
        const halfOpenStart = state.disabledUntilMs - this.cfg.halfOpenAfterMs;
        const inHalfOpenWindow = now >= halfOpenStart;
        if (inHalfOpenWindow && state.halfOpenProbeUsedUntilMs !== state.disabledUntilMs) {
            state.halfOpenProbeUsedUntilMs = state.disabledUntilMs;
            return { skip: false, reason: "half_open_probe" };
        }
        return {
            skip: true,
            reason: "health_disabled",
            retryAfterMs: Math.max(1, state.disabledUntilMs - now)
        };
    }
    noteAttempt(provider) {
        const now = this.now();
        const state = this.stateByProvider.get(provider);
        if (!state?.disabledUntilMs || now >= state.disabledUntilMs) {
            return;
        }
        const halfOpenStart = state.disabledUntilMs - this.cfg.halfOpenAfterMs;
        if (now >= halfOpenStart) {
            state.halfOpenProbeUsedUntilMs = state.disabledUntilMs;
        }
    }
    snapshot(provider) {
        const state = this.stateByProvider.get(provider);
        if (!state) {
            return null;
        }
        return this.computeSnapshot(provider, state, this.now());
    }
    snapshots() {
        const now = this.now();
        return Array.from(this.stateByProvider.entries())
            .map(([provider, state]) => this.computeSnapshot(provider, state, now))
            .sort((a, b) => a.provider.localeCompare(b.provider));
    }
    reset(provider) {
        this.stateByProvider.delete(provider);
    }
    getState(provider) {
        const existing = this.stateByProvider.get(provider);
        if (existing) {
            return existing;
        }
        const created = {
            outcomes: new RollingWindow(this.cfg.windowSize),
            consecutiveFailures: 0,
            lastUpdatedMs: this.now()
        };
        this.stateByProvider.set(provider, created);
        return created;
    }
    evaluateForDisable(state, now) {
        if (state.disabledUntilMs && now < state.disabledUntilMs) {
            return;
        }
        const outcomes = state.outcomes.values();
        const total = outcomes.length;
        const okCount = outcomes.reduce((acc, item) => acc + (item.ok ? 1 : 0), 0);
        if (state.consecutiveFailures >= this.cfg.maxConsecutiveFailures) {
            this.disable(state, now);
            return;
        }
        if (total >= this.cfg.minCallsForRate) {
            const successRate = total > 0 ? okCount / total : 1;
            if (successRate < this.cfg.disableSuccessRate) {
                this.disable(state, now);
            }
        }
    }
    disable(state, now) {
        state.disabledUntilMs = now + this.cfg.disableForMs;
        state.halfOpenProbeUsedUntilMs = undefined;
    }
    computeSnapshot(provider, state, now) {
        if (state.disabledUntilMs !== undefined && now >= state.disabledUntilMs) {
            state.disabledUntilMs = undefined;
            state.halfOpenProbeUsedUntilMs = undefined;
        }
        const outcomes = state.outcomes.values();
        const total = outcomes.length;
        const okCount = outcomes.reduce((acc, outcome) => acc + (outcome.ok ? 1 : 0), 0);
        const latencies = outcomes.map((outcome) => outcome.tookMs);
        const totalLatency = latencies.reduce((acc, ms) => acc + ms, 0);
        const errorCodes = {};
        for (const outcome of outcomes) {
            if (!outcome.ok) {
                const code = outcome.errorCode ?? "UNKNOWN";
                errorCodes[code] = (errorCodes[code] ?? 0) + 1;
            }
        }
        const enoughCalls = total >= this.cfg.minCallsForRate;
        const successRate = total > 0 ? okCount / total : undefined;
        let status = "healthy";
        if (state.disabledUntilMs !== undefined && now < state.disabledUntilMs) {
            status = "disabled_temp";
        }
        else if (enoughCalls && successRate !== undefined) {
            if (successRate < this.cfg.degradedSuccessRate) {
                status = "degraded";
            }
        }
        return {
            provider,
            status,
            successRate,
            avgLatencyMs: total > 0 ? totalLatency / total : undefined,
            p95LatencyMs: quantile95(latencies),
            consecutiveFailures: state.consecutiveFailures,
            disabledUntilMs: state.disabledUntilMs,
            lastErrorCodes: errorCodes,
            lastUpdatedMs: state.lastUpdatedMs
        };
    }
}
// NOTE: This monitor is intentionally in-memory for MVP simplicity.
// For multi-instance deployments, persist breaker state in a shared store (e.g. Redis)
// and emit metrics for long-term health analytics.
