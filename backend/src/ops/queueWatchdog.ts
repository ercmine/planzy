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

export function evaluateQueueHealth(sample: QueueSample, slo: QueueSlo): { healthy: boolean; alerts: QueueAlert[] } {
  const alerts: QueueAlert[] = [];
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
