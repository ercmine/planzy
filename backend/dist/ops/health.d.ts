export type DependencyState = "up" | "degraded" | "down";
export interface DependencyHealth {
    name: string;
    requiredForReadiness: boolean;
    timeoutMs?: number;
    check: () => Promise<{
        state: DependencyState;
        detail?: string;
        latencyMs?: number;
    }>;
}
export interface ServiceHealthSnapshot {
    service: string;
    liveness: {
        ok: boolean;
        checkedAt: string;
    };
    readiness: {
        ok: boolean;
        checkedAt: string;
        degraded: boolean;
    };
    dependencies: Array<{
        name: string;
        state: DependencyState;
        detail?: string;
        requiredForReadiness: boolean;
        latencyMs: number;
    }>;
}
export declare class ServiceHealthMonitor {
    private readonly serviceName;
    private readonly dependencies;
    constructor(serviceName: string, dependencies: DependencyHealth[]);
    snapshot(): Promise<ServiceHealthSnapshot>;
    private evaluateDependency;
}
