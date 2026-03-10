import type { AttributionRepository, CanonicalPlaceRepository } from "./repositories.js";
import type { CanonicalPlace, PlaceSourceAttribution, PlacePlatformLogger } from "./types.js";

export type OpenDataQueueName = "imports" | "enrichment" | "reindex" | "backfills" | "cache";
export type OpenDataJobType =
  | "osm_bootstrap_import"
  | "osm_incremental_sync"
  | "wikidata_backfill"
  | "geonames_backfill"
  | "opentripmap_backfill"
  | "category_recompute"
  | "ranking_recompute"
  | "stale_cleanup"
  | "attribution_refresh"
  | "cache_invalidation";

export type OpenDataJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface OpenDataJobProgress {
  processed: number;
  total?: number;
  succeeded: number;
  failed: number;
}

export interface OpenDataJobRecord {
  id: string;
  idempotencyKey?: string;
  queue: OpenDataQueueName;
  type: OpenDataJobType;
  status: OpenDataJobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  runMetadata: Record<string, unknown>;
  progress: OpenDataJobProgress;
  cursor?: string;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface OpenDataQueueMetrics {
  queued: number;
  running: number;
  failed: number;
}

function stableJobId(prefix: string, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) | 0;
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryOpenDataJobQueue {
  private readonly jobs = new Map<string, OpenDataJobRecord>();
  private readonly idempotency = new Map<string, string>();

  enqueue(input: {
    queue: OpenDataQueueName;
    type: OpenDataJobType;
    payload?: Record<string, unknown>;
    runMetadata?: Record<string, unknown>;
    idempotencyKey?: string;
    maxAttempts?: number;
  }): OpenDataJobRecord {
    if (input.idempotencyKey) {
      const existingId = this.idempotency.get(input.idempotencyKey);
      if (existingId) {
        const existing = this.jobs.get(existingId);
        if (existing) return existing;
      }
    }

    const createdAt = nowIso();
    const id = stableJobId("job", `${input.queue}|${input.type}|${input.idempotencyKey ?? createdAt}`);
    const record: OpenDataJobRecord = {
      id,
      idempotencyKey: input.idempotencyKey,
      queue: input.queue,
      type: input.type,
      status: "queued",
      payload: input.payload ?? {},
      attempts: 0,
      maxAttempts: Math.max(1, input.maxAttempts ?? 3),
      runMetadata: input.runMetadata ?? {},
      progress: { processed: 0, succeeded: 0, failed: 0 },
      createdAt
    };
    this.jobs.set(id, record);
    if (input.idempotencyKey) this.idempotency.set(input.idempotencyKey, id);
    return record;
  }

  claimNext(queue: OpenDataQueueName): OpenDataJobRecord | undefined {
    const next = [...this.jobs.values()]
      .filter((job) => job.queue === queue && job.status === "queued")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (!next) return undefined;
    const updated = { ...next, status: "running" as const, attempts: next.attempts + 1, startedAt: next.startedAt ?? nowIso() };
    this.jobs.set(updated.id, updated);
    return updated;
  }

  updateProgress(jobId: string, patch: Partial<OpenDataJobProgress> & { cursor?: string }): OpenDataJobRecord | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    const progress: OpenDataJobProgress = {
      ...job.progress,
      ...patch
    };
    const updated = { ...job, progress, cursor: patch.cursor ?? job.cursor };
    this.jobs.set(jobId, updated);
    return updated;
  }

  succeed(jobId: string): OpenDataJobRecord | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    const updated = { ...job, status: "succeeded" as const, completedAt: nowIso() };
    this.jobs.set(jobId, updated);
    return updated;
  }

  fail(jobId: string, errorMessage: string): OpenDataJobRecord | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    if (job.attempts < job.maxAttempts) {
      const retried = { ...job, status: "queued" as const, errorMessage };
      this.jobs.set(jobId, retried);
      return retried;
    }
    const failed = { ...job, status: "failed" as const, errorMessage, completedAt: nowIso() };
    this.jobs.set(jobId, failed);
    return failed;
  }

  cancel(jobId: string): OpenDataJobRecord | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    const updated = { ...job, status: "cancelled" as const, completedAt: nowIso() };
    this.jobs.set(jobId, updated);
    return updated;
  }

  getById(jobId: string): OpenDataJobRecord | undefined {
    return this.jobs.get(jobId);
  }

  listByQueue(queue: OpenDataQueueName): OpenDataJobRecord[] {
    return [...this.jobs.values()].filter((job) => job.queue === queue).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  metrics(queue: OpenDataQueueName): OpenDataQueueMetrics {
    const jobs = this.listByQueue(queue);
    return {
      queued: jobs.filter((job) => job.status === "queued").length,
      running: jobs.filter((job) => job.status === "running").length,
      failed: jobs.filter((job) => job.status === "failed").length
    };
  }
}

export class OpenDataObservability {
  private readonly counters = new Map<string, number>();
  private readonly timers = new Map<string, { count: number; totalMs: number; maxMs: number }>();

  incr(metric: string, by = 1): void {
    this.counters.set(metric, (this.counters.get(metric) ?? 0) + by);
  }

  timing(metric: string, ms: number): void {
    const current = this.timers.get(metric) ?? { count: 0, totalMs: 0, maxMs: 0 };
    const next = { count: current.count + 1, totalMs: current.totalMs + ms, maxMs: Math.max(current.maxMs, ms) };
    this.timers.set(metric, next);
  }

  snapshot(): { counters: Record<string, number>; timers: Record<string, { count: number; avgMs: number; maxMs: number }> } {
    const counters = Object.fromEntries(this.counters.entries());
    const timers = Object.fromEntries(
      [...this.timers.entries()].map(([key, value]) => [key, { count: value.count, avgMs: Number((value.totalMs / value.count).toFixed(2)), maxMs: value.maxMs }])
    );
    return { counters, timers };
  }

  health(queues: Record<OpenDataQueueName, OpenDataQueueMetrics>): { ready: boolean; degraded: boolean } {
    const failed = Object.values(queues).reduce((sum, item) => sum + item.failed, 0);
    const running = Object.values(queues).reduce((sum, item) => sum + item.running, 0);
    return { ready: true, degraded: failed > 20 || running > 200 };
  }
}

export interface OpenDataWorkerHandler {
  (job: OpenDataJobRecord, controls: { updateProgress: (patch: Partial<OpenDataJobProgress> & { cursor?: string }) => void }): Promise<void>;
}

export class OpenDataWorkerOrchestrator {
  private readonly activeByQueue = new Map<OpenDataQueueName, number>();

  constructor(
    private readonly queue: InMemoryOpenDataJobQueue,
    private readonly handlers: Partial<Record<OpenDataJobType, OpenDataWorkerHandler>>,
    private readonly concurrencyByQueue: Record<OpenDataQueueName, number>,
    private readonly observability: OpenDataObservability,
    private readonly logger: PlacePlatformLogger = { info: () => undefined }
  ) {}

  async processNext(queueName: OpenDataQueueName): Promise<OpenDataJobRecord | undefined> {
    const active = this.activeByQueue.get(queueName) ?? 0;
    const allowed = Math.max(1, this.concurrencyByQueue[queueName] ?? 1);
    if (active >= allowed) return undefined;

    const job = this.queue.claimNext(queueName);
    if (!job) return undefined;
    this.activeByQueue.set(queueName, active + 1);

    const started = Date.now();
    try {
      const handler = this.handlers[job.type];
      if (!handler) throw new Error(`no_handler_registered:${job.type}`);
      await handler(job, { updateProgress: (patch) => void this.queue.updateProgress(job.id, patch) });
      const completed = this.queue.succeed(job.id);
      this.observability.incr(`jobs.${job.type}.succeeded`);
      this.logger.info("place.ops.job.succeeded", { jobId: job.id, queue: queueName, type: job.type });
      return completed;
    } catch (error) {
      const failed = this.queue.fail(job.id, error instanceof Error ? error.message : String(error));
      this.observability.incr(`jobs.${job.type}.failed`);
      this.logger.error?.("place.ops.job.failed", { jobId: job.id, queue: queueName, type: job.type, error: failed?.errorMessage });
      return failed;
    } finally {
      this.observability.timing(`jobs.${job.type}.latency_ms`, Date.now() - started);
      this.activeByQueue.set(queueName, Math.max(0, (this.activeByQueue.get(queueName) ?? 1) - 1));
    }
  }
}

export interface OpenDataCacheConfig {
  discoveryTtlMs: number;
  detailTtlMs: number;
  geocodeTtlMs: number;
}

export class OpenDataCache {
  private readonly store = new Map<string, { expiresAt: number; value: unknown; tags: string[] }>();

  constructor(private readonly config: OpenDataCacheConfig, private readonly observability: OpenDataObservability) {}

  key(namespace: "discovery" | "detail" | "geocode", input: Record<string, unknown>): string {
    const stable = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
    return `${namespace}:${JSON.stringify(stable)}`;
  }

  read<T>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit || hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.observability.incr("cache.miss");
      return undefined;
    }
    this.observability.incr("cache.hit");
    return hit.value as T;
  }

  write(namespace: "discovery" | "detail" | "geocode", key: string, value: unknown, tags: string[] = []): void {
    const ttlMs = namespace === "discovery" ? this.config.discoveryTtlMs : namespace === "detail" ? this.config.detailTtlMs : this.config.geocodeTtlMs;
    this.store.set(key, { expiresAt: Date.now() + ttlMs, value, tags });
  }

  invalidateByTag(tag: string): number {
    let removed = 0;
    for (const [key, value] of this.store.entries()) {
      if (value.tags.includes(tag)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    this.observability.incr("cache.invalidations", removed);
    return removed;
  }
}

export interface PlaceAttributionSummary {
  primary: { source: string; label: string; url?: string } | undefined;
  allSources: Array<{ source: string; label: string; url?: string }>;
  requiredNotice?: string;
}

export class AttributionComplianceService {
  constructor(private readonly attributions: AttributionRepository) {}

  summarize(canonicalPlaceId: string): PlaceAttributionSummary {
    const rows = this.attributions.listAttributionsByCanonicalPlaceId(canonicalPlaceId);
    const sorted = [...rows].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    const primary = sorted[0]
      ? { source: sorted[0].sourceName, label: sorted[0].sourceLabel, url: sorted[0].sourceUrl }
      : undefined;
    const requiredNotice = sorted
      .map((item) => item.metadata["requiredAttributionText"])
      .find((item): item is string => typeof item === "string" && item.length > 0);
    return {
      primary,
      allSources: sorted.map((item) => ({ source: item.sourceName, label: item.sourceLabel, url: item.sourceUrl })),
      requiredNotice
    };
  }

  preserveDuringMerge(existing: PlaceSourceAttribution[], incoming: PlaceSourceAttribution[]): PlaceSourceAttribution[] {
    const byKey = new Map<string, PlaceSourceAttribution>();
    [...existing, ...incoming].forEach((item) => byKey.set(`${item.sourceName}:${item.sourceUrl ?? ""}`, item));
    return [...byKey.values()];
  }
}

export interface DiscoveryCardContract {
  placeId: string;
  title: string;
  category?: string;
  locationSummary?: string;
  distanceMeters?: number;
  preview?: string;
  attribution?: PlaceAttributionSummary;
}

export interface PlaceDetailContract {
  placeId: string;
  title: string;
  location: { lat: number; lng: number; city?: string; region?: string; countryCode?: string };
  description?: string;
  qualityScore?: number;
  attribution: PlaceAttributionSummary;
  firstPartySummary?: string;
  trustIndicators: { hasEnrichment: boolean; sourceCount: number };
}

export interface DiscoveryBackend {
  nearby(args: Record<string, unknown>): Promise<DiscoveryCardContract[]>;
}

export interface DetailBackend {
  getDetail(placeId: string): Promise<PlaceDetailContract | undefined>;
}

export class RolloutSafeDiscoveryApi {
  constructor(
    private readonly owned: DiscoveryBackend,
    private readonly fallback: DiscoveryBackend,
    private readonly flags: { useOwned: (context: Record<string, unknown>) => boolean },
    private readonly cache: OpenDataCache,
    private readonly observability: OpenDataObservability
  ) {}

  async nearby(context: Record<string, unknown>): Promise<{ items: DiscoveryCardContract[]; source: "owned" | "fallback" }> {
    const cacheKey = this.cache.key("discovery", context);
    const cached = this.cache.read<{ items: DiscoveryCardContract[]; source: "owned" | "fallback" }>(cacheKey);
    if (cached) return cached;

    const wantOwned = this.flags.useOwned(context);
    try {
      const items = await (wantOwned ? this.owned : this.fallback).nearby(context);
      const payload = { items, source: wantOwned ? "owned" as const : "fallback" as const };
      this.cache.write("discovery", cacheKey, payload, items.map((item) => `place:${item.placeId}`));
      this.observability.incr("api.discovery.success");
      return payload;
    } catch {
      const items = await this.fallback.nearby(context);
      const payload = { items, source: "fallback" as const };
      this.cache.write("discovery", cacheKey, payload, items.map((item) => `place:${item.placeId}`));
      this.observability.incr("api.discovery.fallback");
      return payload;
    }
  }
}

export class RolloutSafeDetailApi {
  constructor(
    private readonly owned: DetailBackend,
    private readonly fallback: DetailBackend,
    private readonly flags: { useOwned: (context: { placeId: string }) => boolean },
    private readonly cache: OpenDataCache,
    private readonly observability: OpenDataObservability
  ) {}

  async get(placeId: string): Promise<{ detail: PlaceDetailContract | undefined; source: "owned" | "fallback" }> {
    const cacheKey = this.cache.key("detail", { placeId });
    const cached = this.cache.read<{ detail: PlaceDetailContract | undefined; source: "owned" | "fallback" }>(cacheKey);
    if (cached) return cached;

    const wantOwned = this.flags.useOwned({ placeId });
    try {
      const detail = await (wantOwned ? this.owned : this.fallback).getDetail(placeId);
      const payload = { detail, source: wantOwned ? "owned" as const : "fallback" as const };
      this.cache.write("detail", cacheKey, payload, [`place:${placeId}`]);
      this.observability.incr("api.detail.success");
      return payload;
    } catch {
      const detail = await this.fallback.getDetail(placeId);
      const payload = { detail, source: "fallback" as const };
      this.cache.write("detail", cacheKey, payload, [`place:${placeId}`]);
      this.observability.incr("api.detail.fallback");
      return payload;
    }
  }
}

export class CanonicalDetailBackend implements DetailBackend {
  constructor(private readonly places: CanonicalPlaceRepository, private readonly attribution: AttributionComplianceService) {}

  async getDetail(placeId: string): Promise<PlaceDetailContract | undefined> {
    const place: CanonicalPlace | undefined = this.places.getById(placeId);
    if (!place) return undefined;
    const attribution = this.attribution.summarize(placeId);
    return {
      placeId: place.id,
      title: place.primaryName,
      location: { lat: place.latitude, lng: place.longitude, city: place.city, region: place.region, countryCode: place.countryCode },
      description: place.description,
      qualityScore: place.qualityScore,
      attribution,
      firstPartySummary: typeof place.metadata["firstPartySummary"] === "string" ? String(place.metadata["firstPartySummary"]) : undefined,
      trustIndicators: { hasEnrichment: Boolean(place.description), sourceCount: attribution.allSources.length }
    };
  }
}
