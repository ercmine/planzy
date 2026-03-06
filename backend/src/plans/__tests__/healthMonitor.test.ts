import { describe, expect, it } from "vitest";

import { ProviderHealthMonitor } from "../router/health/healthMonitor.js";

describe("ProviderHealthMonitor", () => {
  it("disables provider on consecutive failures", () => {
    let now = 1_000;
    const monitor = new ProviderHealthMonitor(
      { maxConsecutiveFailures: 3, disableForMs: 60_000, minCallsForRate: 10 },
      { now: () => now }
    );

    for (let i = 0; i < 3; i += 1) {
      monitor.record({ provider: "p1", ok: false, tookMs: 50, returned: 0, errorCode: "TIMEOUT" });
      now += 5;
    }

    const decision = monitor.shouldSkip("p1");
    expect(decision.skip).toBe(true);
    expect(decision.retryAfterMs).toBeGreaterThan(0);

    const snapshot = monitor.snapshot("p1");
    expect(snapshot?.status).toBe("disabled_temp");
    expect(snapshot?.consecutiveFailures).toBe(3);
  });

  it("disables provider on low rolling success rate", () => {
    let now = 10_000;
    const monitor = new ProviderHealthMonitor(
      { windowSize: 10, minCallsForRate: 5, disableSuccessRate: 0.5, maxConsecutiveFailures: 10 },
      { now: () => now }
    );

    const outcomes = [false, false, true, false, false, true];
    for (const ok of outcomes) {
      monitor.record({ provider: "p2", ok, tookMs: 40, returned: ok ? 1 : 0, errorCode: ok ? undefined : "RATE_LIMIT" });
      now += 2;
    }

    expect(monitor.shouldSkip("p2").skip).toBe(true);
    expect(monitor.snapshot("p2")?.status).toBe("disabled_temp");
  });

  it("becomes eligible after disable window passes", () => {
    let now = 50_000;
    const monitor = new ProviderHealthMonitor(
      { maxConsecutiveFailures: 2, disableForMs: 1_000, halfOpenAfterMs: 200 },
      { now: () => now }
    );

    monitor.record({ provider: "p3", ok: false, tookMs: 10, returned: 0, errorCode: "UNKNOWN" });
    monitor.record({ provider: "p3", ok: false, tookMs: 11, returned: 0, errorCode: "UNKNOWN" });

    expect(monitor.shouldSkip("p3").skip).toBe(true);
    now += 1_100;
    expect(monitor.shouldSkip("p3").skip).toBe(false);
    expect(monitor.snapshot("p3")?.status).toBe("healthy");
  });

  it("allows exactly one half-open probe", () => {
    let now = 100_000;
    const monitor = new ProviderHealthMonitor(
      { maxConsecutiveFailures: 2, disableForMs: 10_000, halfOpenAfterMs: 2_000 },
      { now: () => now }
    );

    monitor.record({ provider: "p4", ok: false, tookMs: 15, returned: 0, errorCode: "TIMEOUT" });
    monitor.record({ provider: "p4", ok: false, tookMs: 15, returned: 0, errorCode: "TIMEOUT" });

    now += 8_500;
    expect(monitor.shouldSkip("p4").skip).toBe(false);
    const second = monitor.shouldSkip("p4");
    expect(second.skip).toBe(true);
    expect(second.reason).toBe("health_disabled");
  });

  it("computes success rate, avg latency, p95 latency, and error code counts", () => {
    let now = 200_000;
    const monitor = new ProviderHealthMonitor({ windowSize: 5, minCallsForRate: 1 }, { now: () => now });

    monitor.record({ provider: "p5", ok: true, tookMs: 10, returned: 1 });
    monitor.record({ provider: "p5", ok: false, tookMs: 50, returned: 0, errorCode: "TIMEOUT" });
    monitor.record({ provider: "p5", ok: false, tookMs: 100, returned: 0, errorCode: "RATE_LIMIT" });
    monitor.record({ provider: "p5", ok: true, tookMs: 20, returned: 2 });
    monitor.record({ provider: "p5", ok: false, tookMs: 30, returned: 0, errorCode: "TIMEOUT" });

    const snapshot = monitor.snapshot("p5");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.successRate).toBeCloseTo(0.4);
    expect(snapshot?.avgLatencyMs).toBeCloseTo(42);
    expect(snapshot?.p95LatencyMs).toBe(100);
    expect(snapshot?.lastErrorCodes).toEqual({ RATE_LIMIT: 1, TIMEOUT: 2 });
  });
});
