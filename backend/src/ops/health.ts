export type DependencyState = "up" | "degraded" | "down";

export interface DependencyHealth {
  name: string;
  requiredForReadiness: boolean;
  timeoutMs?: number;
  check: () => Promise<{ state: DependencyState; detail?: string; latencyMs?: number }>;
}

export interface ServiceHealthSnapshot {
  service: string;
  liveness: { ok: boolean; checkedAt: string };
  readiness: { ok: boolean; checkedAt: string; degraded: boolean };
  dependencies: Array<{ name: string; state: DependencyState; detail?: string; requiredForReadiness: boolean; latencyMs: number }>;
}

export class ServiceHealthMonitor {
  constructor(private readonly serviceName: string, private readonly dependencies: DependencyHealth[]) {}

  async snapshot(): Promise<ServiceHealthSnapshot> {
    const checkedAt = new Date().toISOString();
    const dependencies = await Promise.all(this.dependencies.map((dependency) => this.evaluateDependency(dependency)));
    const hasDownRequired = dependencies.some((item) => item.requiredForReadiness && item.state === "down");
    const degraded = dependencies.some((item) => item.state === "degraded");

    return {
      service: this.serviceName,
      liveness: { ok: true, checkedAt },
      readiness: { ok: !hasDownRequired, checkedAt, degraded },
      dependencies
    };
  }

  private async evaluateDependency(
    dependency: DependencyHealth
  ): Promise<{ name: string; state: DependencyState; detail?: string; requiredForReadiness: boolean; latencyMs: number }> {
    const startedAt = Date.now();
    const timeoutMs = Math.max(200, dependency.timeoutMs ?? 5_000);

    try {
      const result: { state: DependencyState; detail?: string; latencyMs?: number } = await Promise.race([
        dependency.check(),
        new Promise<{ state: DependencyState; detail?: string; latencyMs?: number }>((resolve) => {
          setTimeout(() => resolve({ state: "down", detail: `timeout_after_${timeoutMs}ms` }), timeoutMs);
        })
      ]);

      return {
        name: dependency.name,
        state: result.state,
        detail: result.detail,
        requiredForReadiness: dependency.requiredForReadiness,
        latencyMs: result.latencyMs ?? Date.now() - startedAt
      };
    } catch (error) {
      return {
        name: dependency.name,
        state: "down",
        detail: error instanceof Error ? error.message : String(error),
        requiredForReadiness: dependency.requiredForReadiness,
        latencyMs: Date.now() - startedAt
      };
    }
  }
}
