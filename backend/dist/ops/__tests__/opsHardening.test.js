import { describe, expect, it } from "vitest";
import { ServiceHealthMonitor } from "../health.js";
import { OpsMetricsRegistry } from "../metrics.js";
import { applyRetention, evaluateBackupReadiness } from "../backup.js";
import { evaluateQueueHealth } from "../queueWatchdog.js";
import { detectMediaAnomalies } from "../mediaIntegrity.js";
import { validateOperationalConfig } from "../config.js";
describe("ops hardening foundations", () => {
    it("fails readiness when required dependencies are down and tracks degraded dependencies", async () => {
        const monitor = new ServiceHealthMonitor("perbug-backend", [
            { name: "postgres", requiredForReadiness: true, check: async () => ({ state: "down", detail: "connection_refused" }) },
            { name: "redis", requiredForReadiness: false, check: async () => ({ state: "degraded", detail: "high_latency" }) }
        ]);
        const snapshot = await monitor.snapshot();
        expect(snapshot.liveness.ok).toBe(true);
        expect(snapshot.readiness.ok).toBe(false);
        expect(snapshot.readiness.degraded).toBe(true);
    });
    it("exposes prometheus metrics for counters, gauges, and histograms", () => {
        const metrics = new OpsMetricsRegistry();
        metrics.defineCounter("perbug_requests_total", "Total requests");
        metrics.defineGauge("perbug_queue_depth", "Queue depth");
        metrics.defineHistogram("perbug_request_latency_ms", "Request latency", [50, 200, 500]);
        metrics.increment("perbug_requests_total", { route: "health", status: "200" });
        metrics.setGauge("perbug_queue_depth", 12, { queue: "media" });
        metrics.observe("perbug_request_latency_ms", 140, { route: "health" });
        const rendered = metrics.renderPrometheus();
        expect(rendered).toContain("perbug_requests_total");
        expect(rendered).toContain("perbug_queue_depth");
        expect(rendered).toContain("perbug_request_latency_ms_bucket");
    });
    it("tracks retention and stale backup detection", () => {
        const records = [
            { id: "b1", system: "main_db", createdAt: "2026-03-10T00:00:00.000Z", backupType: "full", storageUri: "s3://ops/main/b1.sql.gz", status: "succeeded" },
            { id: "b2", system: "main_db", createdAt: "2026-02-01T00:00:00.000Z", backupType: "full", storageUri: "s3://ops/main/b2.sql.gz", status: "succeeded" },
            { id: "b3", system: "geo_db", createdAt: "2026-03-08T00:00:00.000Z", backupType: "full", storageUri: "s3://ops/geo/b3.sql.gz", status: "failed" }
        ];
        const retained = applyRetention(records, "2026-03-12T00:00:00.000Z", { retentionDays: 30, maxBackupAgeHours: 36 });
        expect(retained.map((row) => row.id)).toEqual(["b1", "b3"]);
        const readiness = evaluateBackupReadiness(records, "2026-03-12T12:00:00.000Z", { retentionDays: 30, maxBackupAgeHours: 24 });
        expect(readiness.ok).toBe(false);
        expect(readiness.staleSystems).toContain("main_db");
        expect(readiness.failingSystems).toContain("geo_db");
    });
    it("detects queue backlog and worker heartbeat failures", () => {
        const check = evaluateQueueHealth({ queue: "media", depth: 600, oldestJobAgeMs: 80_000, workerLastHeartbeatMs: 100_000, failedInWindow: 12, retriesInWindow: 6 }, { maxDepth: 200, maxOldestJobAgeMs: 30_000, maxWorkerHeartbeatLagMs: 20_000, maxFailureRate: 0.45 });
        expect(check.healthy).toBe(false);
        expect(check.alerts.some((alert) => alert.code === "depth_high")).toBe(true);
        expect(check.alerts.some((alert) => alert.code === "worker_missing")).toBe(true);
    });
    it("detects media metadata lifecycle anomalies", () => {
        const anomalies = detectMediaAnomalies([
            { videoId: "v1", state: "processed", thumbnailKey: "thumb.jpg" },
            { videoId: "v2", state: "published", processedAssetKey: "video.mp4" },
            { videoId: "v3", state: "published", processedAssetKey: "video.mp4", thumbnailKey: "thumb.jpg" }
        ]);
        expect(anomalies).toEqual([
            { videoId: "v1", code: "missing_processed_asset" },
            { videoId: "v2", code: "missing_thumbnail" },
            { videoId: "v2", code: "published_without_place" },
            { videoId: "v3", code: "published_without_place" }
        ]);
    });
    it("validates required ops secrets and catches insecure defaults", () => {
        const validation = validateOperationalConfig({ BACKUP_S3_BUCKET: "", BACKUP_S3_ACCESS_KEY: "changeme", REDIS_URL: "redis://cache" }, [
            { key: "BACKUP_S3_BUCKET" },
            { key: "BACKUP_S3_ACCESS_KEY", secret: true },
            { key: "REDIS_URL" }
        ]);
        expect(validation.ok).toBe(false);
        expect(validation.missing).toEqual(["BACKUP_S3_BUCKET"]);
        expect(validation.insecure).toEqual(["BACKUP_S3_ACCESS_KEY"]);
    });
});
