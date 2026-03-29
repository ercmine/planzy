export class ServiceHealthMonitor {
    serviceName;
    dependencies;
    constructor(serviceName, dependencies) {
        this.serviceName = serviceName;
        this.dependencies = dependencies;
    }
    async snapshot() {
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
    async evaluateDependency(dependency) {
        const startedAt = Date.now();
        const timeoutMs = Math.max(200, dependency.timeoutMs ?? 5_000);
        try {
            const result = await Promise.race([
                dependency.check(),
                new Promise((resolve) => {
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
        }
        catch (error) {
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
