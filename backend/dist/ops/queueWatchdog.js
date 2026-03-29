export function evaluateQueueHealth(sample, slo) {
    const alerts = [];
    if (sample.depth > slo.maxDepth) {
        alerts.push({ queue: sample.queue, severity: sample.depth > slo.maxDepth * 2 ? "critical" : "warning", code: "depth_high", detail: `depth=${sample.depth} threshold=${slo.maxDepth}` });
    }
    if (sample.oldestJobAgeMs > slo.maxOldestJobAgeMs) {
        alerts.push({ queue: sample.queue, severity: sample.oldestJobAgeMs > slo.maxOldestJobAgeMs * 2 ? "critical" : "warning", code: "jobs_stuck", detail: `oldest_age_ms=${sample.oldestJobAgeMs}` });
    }
    if (sample.workerLastHeartbeatMs > slo.maxWorkerHeartbeatLagMs) {
        alerts.push({ queue: sample.queue, severity: "critical", code: "worker_missing", detail: `worker_heartbeat_lag_ms=${sample.workerLastHeartbeatMs}` });
    }
    const totalAttempts = sample.failedInWindow + sample.retriesInWindow;
    const failureRate = totalAttempts === 0 ? 0 : sample.failedInWindow / totalAttempts;
    if (failureRate > slo.maxFailureRate) {
        alerts.push({ queue: sample.queue, severity: failureRate > Math.max(0.9, slo.maxFailureRate * 2) ? "critical" : "warning", code: "failure_spike", detail: `failure_rate=${failureRate.toFixed(2)}` });
    }
    return { healthy: alerts.length === 0, alerts };
}
