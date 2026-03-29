import type { AttributionRepository, CanonicalPlaceRepository } from "./repositories.js";
import type { PlaceSourceAttribution, PlacePlatformLogger } from "./types.js";
export type OpenDataQueueName = "imports" | "enrichment" | "reindex" | "backfills" | "cache";
export type OpenDataJobType = "osm_bootstrap_import" | "osm_incremental_sync" | "wikidata_backfill" | "geonames_backfill" | "opentripmap_backfill" | "category_recompute" | "ranking_recompute" | "stale_cleanup" | "attribution_refresh" | "cache_invalidation";
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
export declare class InMemoryOpenDataJobQueue {
    private readonly jobs;
    private readonly idempotency;
    enqueue(input: {
        queue: OpenDataQueueName;
        type: OpenDataJobType;
        payload?: Record<string, unknown>;
        runMetadata?: Record<string, unknown>;
        idempotencyKey?: string;
        maxAttempts?: number;
    }): OpenDataJobRecord;
    claimNext(queue: OpenDataQueueName): OpenDataJobRecord | undefined;
    updateProgress(jobId: string, patch: Partial<OpenDataJobProgress> & {
        cursor?: string;
    }): OpenDataJobRecord | undefined;
    succeed(jobId: string): OpenDataJobRecord | undefined;
    fail(jobId: string, errorMessage: string): OpenDataJobRecord | undefined;
    cancel(jobId: string): OpenDataJobRecord | undefined;
    getById(jobId: string): OpenDataJobRecord | undefined;
    listByQueue(queue: OpenDataQueueName): OpenDataJobRecord[];
    metrics(queue: OpenDataQueueName): OpenDataQueueMetrics;
}
export declare class OpenDataObservability {
    private readonly counters;
    private readonly timers;
    incr(metric: string, by?: number): void;
    timing(metric: string, ms: number): void;
    snapshot(): {
        counters: Record<string, number>;
        timers: Record<string, {
            count: number;
            avgMs: number;
            maxMs: number;
        }>;
    };
    health(queues: Record<OpenDataQueueName, OpenDataQueueMetrics>): {
        ready: boolean;
        degraded: boolean;
    };
}
export interface OpenDataWorkerHandler {
    (job: OpenDataJobRecord, controls: {
        updateProgress: (patch: Partial<OpenDataJobProgress> & {
            cursor?: string;
        }) => void;
    }): Promise<void>;
}
export declare class OpenDataWorkerOrchestrator {
    private readonly queue;
    private readonly handlers;
    private readonly concurrencyByQueue;
    private readonly observability;
    private readonly logger;
    private readonly activeByQueue;
    constructor(queue: InMemoryOpenDataJobQueue, handlers: Partial<Record<OpenDataJobType, OpenDataWorkerHandler>>, concurrencyByQueue: Record<OpenDataQueueName, number>, observability: OpenDataObservability, logger?: PlacePlatformLogger);
    processNext(queueName: OpenDataQueueName): Promise<OpenDataJobRecord | undefined>;
}
export interface OpenDataCacheConfig {
    discoveryTtlMs: number;
    detailTtlMs: number;
    geocodeTtlMs: number;
}
export declare class OpenDataCache {
    private readonly config;
    private readonly observability;
    private readonly store;
    constructor(config: OpenDataCacheConfig, observability: OpenDataObservability);
    key(namespace: "discovery" | "detail" | "geocode", input: Record<string, unknown>): string;
    read<T>(key: string): T | undefined;
    write(namespace: "discovery" | "detail" | "geocode", key: string, value: unknown, tags?: string[]): void;
    invalidateByTag(tag: string): number;
}
export interface PlaceAttributionSummary {
    primary: {
        source: string;
        label: string;
        url?: string;
    } | undefined;
    allSources: Array<{
        source: string;
        label: string;
        url?: string;
    }>;
    requiredNotice?: string;
}
export declare class AttributionComplianceService {
    private readonly attributions;
    constructor(attributions: AttributionRepository);
    summarize(canonicalPlaceId: string): PlaceAttributionSummary;
    preserveDuringMerge(existing: PlaceSourceAttribution[], incoming: PlaceSourceAttribution[]): PlaceSourceAttribution[];
}
export interface DiscoveryCardContract {
    placeId: string;
    title: string;
    category?: string;
    locationSummary?: string;
    distanceMeters?: number;
    preview?: string;
    previewImage?: {
        url: string;
        source: string;
        attributionText?: string;
    };
    shortDescription?: string;
    landmarkType?: string;
    attribution?: PlaceAttributionSummary;
}
export interface PlaceDetailContract {
    placeId: string;
    title: string;
    location: {
        lat: number;
        lng: number;
        city?: string;
        region?: string;
        countryCode?: string;
    };
    description?: string;
    descriptionSource?: string;
    notable?: {
        landmarkType?: string;
        aliases: string[];
        wikipediaUrl?: string;
    };
    images: Array<{
        url: string;
        source: string;
        attributionText?: string;
        isPrimary: boolean;
    }>;
    qualityScore?: number;
    attribution: PlaceAttributionSummary;
    firstPartySummary?: string;
    trustIndicators: {
        hasEnrichment: boolean;
        sourceCount: number;
    };
}
export interface DiscoveryBackend {
    nearby(args: Record<string, unknown>): Promise<DiscoveryCardContract[]>;
}
export interface DetailBackend {
    getDetail(placeId: string): Promise<PlaceDetailContract | undefined>;
}
export declare class RolloutSafeDiscoveryApi {
    private readonly owned;
    private readonly fallback;
    private readonly flags;
    private readonly cache;
    private readonly observability;
    constructor(owned: DiscoveryBackend, fallback: DiscoveryBackend, flags: {
        useOwned: (context: Record<string, unknown>) => boolean;
    }, cache: OpenDataCache, observability: OpenDataObservability);
    nearby(context: Record<string, unknown>): Promise<{
        items: DiscoveryCardContract[];
        source: "owned" | "fallback";
    }>;
}
export declare class RolloutSafeDetailApi {
    private readonly owned;
    private readonly fallback;
    private readonly flags;
    private readonly cache;
    private readonly observability;
    constructor(owned: DetailBackend, fallback: DetailBackend, flags: {
        useOwned: (context: {
            placeId: string;
        }) => boolean;
    }, cache: OpenDataCache, observability: OpenDataObservability);
    get(placeId: string): Promise<{
        detail: PlaceDetailContract | undefined;
        source: "owned" | "fallback";
    }>;
}
export declare class CanonicalDetailBackend implements DetailBackend {
    private readonly places;
    private readonly attribution;
    constructor(places: CanonicalPlaceRepository, attribution: AttributionComplianceService);
    getDetail(placeId: string): Promise<PlaceDetailContract | undefined>;
}
