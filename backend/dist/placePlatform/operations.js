function stableJobId(prefix, seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 33 + seed.charCodeAt(i)) | 0;
    }
    return `${prefix}_${Math.abs(hash).toString(36)}`;
}
function nowIso() {
    return new Date().toISOString();
}
export class InMemoryOpenDataJobQueue {
    jobs = new Map();
    idempotency = new Map();
    enqueue(input) {
        if (input.idempotencyKey) {
            const existingId = this.idempotency.get(input.idempotencyKey);
            if (existingId) {
                const existing = this.jobs.get(existingId);
                if (existing)
                    return existing;
            }
        }
        const createdAt = nowIso();
        const id = stableJobId("job", `${input.queue}|${input.type}|${input.idempotencyKey ?? createdAt}`);
        const record = {
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
        if (input.idempotencyKey)
            this.idempotency.set(input.idempotencyKey, id);
        return record;
    }
    claimNext(queue) {
        const next = [...this.jobs.values()]
            .filter((job) => job.queue === queue && job.status === "queued")
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
        if (!next)
            return undefined;
        const updated = { ...next, status: "running", attempts: next.attempts + 1, startedAt: next.startedAt ?? nowIso() };
        this.jobs.set(updated.id, updated);
        return updated;
    }
    updateProgress(jobId, patch) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        const progress = {
            ...job.progress,
            ...patch
        };
        const updated = { ...job, progress, cursor: patch.cursor ?? job.cursor };
        this.jobs.set(jobId, updated);
        return updated;
    }
    succeed(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        const updated = { ...job, status: "succeeded", completedAt: nowIso() };
        this.jobs.set(jobId, updated);
        return updated;
    }
    fail(jobId, errorMessage) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        if (job.attempts < job.maxAttempts) {
            const retried = { ...job, status: "queued", errorMessage };
            this.jobs.set(jobId, retried);
            return retried;
        }
        const failed = { ...job, status: "failed", errorMessage, completedAt: nowIso() };
        this.jobs.set(jobId, failed);
        return failed;
    }
    cancel(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return undefined;
        const updated = { ...job, status: "cancelled", completedAt: nowIso() };
        this.jobs.set(jobId, updated);
        return updated;
    }
    getById(jobId) {
        return this.jobs.get(jobId);
    }
    listByQueue(queue) {
        return [...this.jobs.values()].filter((job) => job.queue === queue).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    metrics(queue) {
        const jobs = this.listByQueue(queue);
        return {
            queued: jobs.filter((job) => job.status === "queued").length,
            running: jobs.filter((job) => job.status === "running").length,
            failed: jobs.filter((job) => job.status === "failed").length
        };
    }
}
export class OpenDataObservability {
    counters = new Map();
    timers = new Map();
    incr(metric, by = 1) {
        this.counters.set(metric, (this.counters.get(metric) ?? 0) + by);
    }
    timing(metric, ms) {
        const current = this.timers.get(metric) ?? { count: 0, totalMs: 0, maxMs: 0 };
        const next = { count: current.count + 1, totalMs: current.totalMs + ms, maxMs: Math.max(current.maxMs, ms) };
        this.timers.set(metric, next);
    }
    snapshot() {
        const counters = Object.fromEntries(this.counters.entries());
        const timers = Object.fromEntries([...this.timers.entries()].map(([key, value]) => [key, { count: value.count, avgMs: Number((value.totalMs / value.count).toFixed(2)), maxMs: value.maxMs }]));
        return { counters, timers };
    }
    health(queues) {
        const failed = Object.values(queues).reduce((sum, item) => sum + item.failed, 0);
        const running = Object.values(queues).reduce((sum, item) => sum + item.running, 0);
        return { ready: true, degraded: failed > 20 || running > 200 };
    }
}
export class OpenDataWorkerOrchestrator {
    queue;
    handlers;
    concurrencyByQueue;
    observability;
    logger;
    activeByQueue = new Map();
    constructor(queue, handlers, concurrencyByQueue, observability, logger = { info: () => undefined }) {
        this.queue = queue;
        this.handlers = handlers;
        this.concurrencyByQueue = concurrencyByQueue;
        this.observability = observability;
        this.logger = logger;
    }
    async processNext(queueName) {
        const active = this.activeByQueue.get(queueName) ?? 0;
        const allowed = Math.max(1, this.concurrencyByQueue[queueName] ?? 1);
        if (active >= allowed)
            return undefined;
        const job = this.queue.claimNext(queueName);
        if (!job)
            return undefined;
        this.activeByQueue.set(queueName, active + 1);
        const started = Date.now();
        try {
            const handler = this.handlers[job.type];
            if (!handler)
                throw new Error(`no_handler_registered:${job.type}`);
            await handler(job, { updateProgress: (patch) => void this.queue.updateProgress(job.id, patch) });
            const completed = this.queue.succeed(job.id);
            this.observability.incr(`jobs.${job.type}.succeeded`);
            this.logger.info("place.ops.job.succeeded", { jobId: job.id, queue: queueName, type: job.type });
            return completed;
        }
        catch (error) {
            const failed = this.queue.fail(job.id, error instanceof Error ? error.message : String(error));
            this.observability.incr(`jobs.${job.type}.failed`);
            this.logger.error?.("place.ops.job.failed", { jobId: job.id, queue: queueName, type: job.type, error: failed?.errorMessage });
            return failed;
        }
        finally {
            this.observability.timing(`jobs.${job.type}.latency_ms`, Date.now() - started);
            this.activeByQueue.set(queueName, Math.max(0, (this.activeByQueue.get(queueName) ?? 1) - 1));
        }
    }
}
export class OpenDataCache {
    config;
    observability;
    store = new Map();
    constructor(config, observability) {
        this.config = config;
        this.observability = observability;
    }
    key(namespace, input) {
        const stable = Object.entries(input).sort(([a], [b]) => a.localeCompare(b));
        return `${namespace}:${JSON.stringify(stable)}`;
    }
    read(key) {
        const hit = this.store.get(key);
        if (!hit || hit.expiresAt <= Date.now()) {
            this.store.delete(key);
            this.observability.incr("cache.miss");
            return undefined;
        }
        this.observability.incr("cache.hit");
        return hit.value;
    }
    write(namespace, key, value, tags = []) {
        const ttlMs = namespace === "discovery" ? this.config.discoveryTtlMs : namespace === "detail" ? this.config.detailTtlMs : this.config.geocodeTtlMs;
        this.store.set(key, { expiresAt: Date.now() + ttlMs, value, tags });
    }
    invalidateByTag(tag) {
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
export class AttributionComplianceService {
    attributions;
    constructor(attributions) {
        this.attributions = attributions;
    }
    summarize(canonicalPlaceId) {
        const rows = this.attributions.listAttributionsByCanonicalPlaceId(canonicalPlaceId);
        const sorted = [...rows].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
        const primary = sorted[0]
            ? { source: sorted[0].sourceName, label: sorted[0].sourceLabel, url: sorted[0].sourceUrl }
            : undefined;
        const requiredNotice = sorted
            .map((item) => item.metadata["requiredAttributionText"])
            .find((item) => typeof item === "string" && item.length > 0);
        return {
            primary,
            allSources: sorted.map((item) => ({ source: item.sourceName, label: item.sourceLabel, url: item.sourceUrl })),
            requiredNotice
        };
    }
    preserveDuringMerge(existing, incoming) {
        const byKey = new Map();
        [...existing, ...incoming].forEach((item) => byKey.set(`${item.sourceName}:${item.sourceUrl ?? ""}`, item));
        return [...byKey.values()];
    }
}
export class RolloutSafeDiscoveryApi {
    owned;
    fallback;
    flags;
    cache;
    observability;
    constructor(owned, fallback, flags, cache, observability) {
        this.owned = owned;
        this.fallback = fallback;
        this.flags = flags;
        this.cache = cache;
        this.observability = observability;
    }
    async nearby(context) {
        const cacheKey = this.cache.key("discovery", context);
        const cached = this.cache.read(cacheKey);
        if (cached)
            return cached;
        const wantOwned = this.flags.useOwned(context);
        try {
            const items = await (wantOwned ? this.owned : this.fallback).nearby(context);
            const payload = { items, source: wantOwned ? "owned" : "fallback" };
            this.cache.write("discovery", cacheKey, payload, items.map((item) => `place:${item.placeId}`));
            this.observability.incr("api.discovery.success");
            return payload;
        }
        catch {
            const items = await this.fallback.nearby(context);
            const payload = { items, source: "fallback" };
            this.cache.write("discovery", cacheKey, payload, items.map((item) => `place:${item.placeId}`));
            this.observability.incr("api.discovery.fallback");
            return payload;
        }
    }
}
export class RolloutSafeDetailApi {
    owned;
    fallback;
    flags;
    cache;
    observability;
    constructor(owned, fallback, flags, cache, observability) {
        this.owned = owned;
        this.fallback = fallback;
        this.flags = flags;
        this.cache = cache;
        this.observability = observability;
    }
    async get(placeId) {
        const cacheKey = this.cache.key("detail", { placeId });
        const cached = this.cache.read(cacheKey);
        if (cached)
            return cached;
        const wantOwned = this.flags.useOwned({ placeId });
        try {
            const detail = await (wantOwned ? this.owned : this.fallback).getDetail(placeId);
            const payload = { detail, source: wantOwned ? "owned" : "fallback" };
            this.cache.write("detail", cacheKey, payload, [`place:${placeId}`]);
            this.observability.incr("api.detail.success");
            return payload;
        }
        catch {
            const detail = await this.fallback.getDetail(placeId);
            const payload = { detail, source: "fallback" };
            this.cache.write("detail", cacheKey, payload, [`place:${placeId}`]);
            this.observability.incr("api.detail.fallback");
            return payload;
        }
    }
}
export class CanonicalDetailBackend {
    places;
    attribution;
    constructor(places, attribution) {
        this.places = places;
        this.attribution = attribution;
    }
    async getDetail(placeId) {
        const place = this.places.getById(placeId);
        if (!place)
            return undefined;
        const attribution = this.attribution.summarize(placeId);
        const wikidata = typeof place.metadata.wikidata === "object" && place.metadata.wikidata
            ? place.metadata.wikidata
            : undefined;
        const image = wikidata && typeof wikidata.image === "object" && wikidata.image
            ? wikidata.image
            : undefined;
        const images = image && typeof image.url === "string"
            ? [{
                    url: image.url,
                    source: "wikidata",
                    attributionText: typeof image.attributionText === "string" ? image.attributionText : "Image from Wikidata",
                    isPrimary: true
                }]
            : [];
        return {
            placeId: place.id,
            title: place.primaryName,
            location: { lat: place.latitude, lng: place.longitude, city: place.city, region: place.region, countryCode: place.countryCode },
            description: place.description,
            descriptionSource: wikidata ? "wikidata" : undefined,
            notable: {
                landmarkType: typeof wikidata?.landmarkType === "string" ? wikidata.landmarkType : undefined,
                aliases: Array.isArray(wikidata?.aliases) ? wikidata?.aliases.filter((item) => typeof item === "string") : [],
                wikipediaUrl: typeof wikidata?.wikipediaUrl === "string" ? wikidata.wikipediaUrl : undefined
            },
            images,
            qualityScore: place.qualityScore,
            attribution,
            firstPartySummary: typeof place.metadata["firstPartySummary"] === "string" ? String(place.metadata["firstPartySummary"]) : undefined,
            trustIndicators: { hasEnrichment: Boolean(place.description), sourceCount: attribution.allSources.length }
        };
    }
}
