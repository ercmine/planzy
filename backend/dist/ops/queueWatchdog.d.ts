export interface QueueSample {
    queue: string;
    depth: number;
    oldestJobAgeMs: number;
    workerLastHeartbeatMs: number;
    failedInWindow: number;
    retriesInWindow: number;
}
export interface QueueSlo {
    maxDepth: number;
    maxOldestJobAgeMs: number;
    maxWorkerHeartbeatLagMs: number;
    maxFailureRate: number;
}
export interface QueueAlert {
    queue: string;
    severity: "warning" | "critical";
    code: "depth_high" | "jobs_stuck" | "worker_missing" | "failure_spike";
    detail: string;
}
export declare function evaluateQueueHealth(sample: QueueSample, slo: QueueSlo): {
    healthy: boolean;
    alerts: QueueAlert[];
};
