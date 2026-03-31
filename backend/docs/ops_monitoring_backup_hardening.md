# Perbug ops / monitoring / backup hardening design

This document defines the production safety layer implemented in `src/ops` and `../ops/scripts`.

## 1) Service health/readiness/liveness
- `src/ops/health.ts` provides dependency-aware health snapshots.
- `ServiceHealthMonitor` distinguishes:
  - process liveness (`liveness.ok`)
  - readiness (`readiness.ok` requires required dependencies up)
  - degraded states (`readiness.degraded`)
- Down required dependencies force readiness failure instead of fake-healthy responses.

Recommended endpoint mapping:
- `GET /health/live` -> liveness
- `GET /health/ready` -> readiness
- `GET /health/deps` -> full dependency breakdown

## 2) Metrics foundation
- `src/ops/metrics.ts` adds a Prometheus-compatible registry for counters, gauges, histograms.
- Supports labels for route/job/queue/system dimensions.
- Use for backend, worker, geo, media and backup instrumentation.

Suggested metric names:
- `perbug_requests_total`
- `perbug_request_latency_ms`
- `perbug_queue_depth`
- `perbug_worker_heartbeat_lag_ms`
- `perbug_backups_age_hours`
- `perbug_backup_failures_total`
- `perbug_media_anomalies_total`

## 3) Queue / worker hardening
- `src/ops/queueWatchdog.ts` evaluates queue health from queue depth, oldest age, heartbeat lag, and failure spike rates.
- Emits actionable alert codes:
  - `depth_high`
  - `jobs_stuck`
  - `worker_missing`
  - `failure_spike`

## 4) Backup / retention / restore readiness
- `src/ops/backup.ts` adds typed backup records, retention pruning, and freshness/failure readiness checks.
- `ops/scripts/backup_postgres.sh` creates compressed backups, uploads off-host to S3, and emits manifest JSON.
- `ops/scripts/verify_backup_manifest.sh` validates required manifest fields/status.
- `ops/scripts/restore_postgres.sh` provides deterministic restore flow for drills/incidents.

## 5) Media metadata integrity monitoring
- `src/ops/mediaIntegrity.ts` detects lifecycle anomalies:
  - published/processed videos missing processed asset key
  - published videos missing thumbnail
  - published videos missing place linkage

## 6) Config / secret hardening
- `src/ops/config.ts` validates required operational config and blocks insecure defaults for secret values.
- Intended for startup-time checks in production deployment pipeline.

## 7) Tests
`src/ops/__tests__/opsHardening.test.ts` covers:
1. health readiness dependency behavior
2. metrics exposition
3. backup retention + stale/failure detection
4. queue stuck/worker missing detection
5. media anomaly detection
6. config missing/insecure secret handling

## 8) Rollout notes
- Start with metrics and health endpoints enabled first.
- Enable backup jobs with verification + alerting next.
- Run weekly restore drill in isolated environment.
- Gate deployment if backup freshness or required secret checks fail.
