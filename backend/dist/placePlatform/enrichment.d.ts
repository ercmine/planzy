import type { AttributionRepository, CanonicalPlaceRepository, SourceRecordRepository } from "./repositories.js";
import type { CanonicalPlace, PlacePlatformLogger, SourceName } from "./types.js";
export interface EnrichmentCandidate {
    sourceId: string;
    name?: string;
    latitude?: number;
    longitude?: number;
    countryCode?: string;
    city?: string;
    region?: string;
    categoryHints?: string[];
}
export interface MatchResult {
    confidence: number;
    matched: boolean;
    reasons: string[];
}
export declare function scoreCandidateMatch(place: CanonicalPlace, candidate: EnrichmentCandidate, opts?: {
    maxDistanceMeters?: number;
    minConfidence?: number;
}): MatchResult;
export interface EnrichmentFieldAttribution {
    field: string;
    sourceName: SourceName;
    sourceId: string;
    sourceUrl?: string;
    confidence: number;
    observedAt: string;
}
export type EnrichmentStatus = "pending" | "succeeded" | "failed" | "no_match";
export interface PlaceEnrichmentRecord {
    id: string;
    canonicalPlaceId: string;
    sourceName: SourceName;
    sourceRecordId?: string;
    status: EnrichmentStatus;
    confidence?: number;
    lastAttemptAt: string;
    lastSuccessAt?: string;
    errorCode?: string;
    errorMessage?: string;
    mergeSummary: {
        updatedFields: string[];
        skippedFields: string[];
    };
    freshnessTtlMs?: number;
    ruleVersion: string;
    rawPayload?: Record<string, unknown>;
    normalizedPayload?: Record<string, unknown>;
    metadata: Record<string, unknown>;
}
export interface EnrichmentJobRun {
    id: string;
    sourceName: SourceName | "all";
    startedAt: string;
    completedAt?: string;
    cursor?: string;
    stats: {
        attempted: number;
        succeeded: number;
        failed: number;
        noMatch: number;
    };
}
export interface EnrichmentRepository {
    upsertRecord(record: PlaceEnrichmentRecord): PlaceEnrichmentRecord;
    getRecord(canonicalPlaceId: string, sourceName: SourceName): PlaceEnrichmentRecord | undefined;
    listRecordsByPlace(canonicalPlaceId: string): PlaceEnrichmentRecord[];
    upsertFieldAttribution(canonicalPlaceId: string, attribution: EnrichmentFieldAttribution): EnrichmentFieldAttribution;
    listFieldAttributions(canonicalPlaceId: string): EnrichmentFieldAttribution[];
    upsertJobRun(run: EnrichmentJobRun): EnrichmentJobRun;
    getJobRun(id: string): EnrichmentJobRun | undefined;
}
export declare class InMemoryEnrichmentRepository implements EnrichmentRepository {
    private readonly records;
    private readonly fieldAttrs;
    private readonly jobRuns;
    private recordKey;
    upsertRecord(record: PlaceEnrichmentRecord): PlaceEnrichmentRecord;
    getRecord(canonicalPlaceId: string, sourceName: SourceName): PlaceEnrichmentRecord | undefined;
    listRecordsByPlace(canonicalPlaceId: string): PlaceEnrichmentRecord[];
    upsertFieldAttribution(canonicalPlaceId: string, attribution: EnrichmentFieldAttribution): EnrichmentFieldAttribution;
    listFieldAttributions(canonicalPlaceId: string): EnrichmentFieldAttribution[];
    upsertJobRun(run: EnrichmentJobRun): EnrichmentJobRun;
    getJobRun(id: string): EnrichmentJobRun | undefined;
}
export declare class EnrichmentLookupCache {
    private readonly entries;
    makeKey(sourceName: SourceName, scope: string): string;
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttlMs: number): void;
}
export interface WikidataNormalized {
    sourceId: string;
    sourceUrl: string;
    label?: string;
    description?: string;
    aliases: string[];
    landmarkType?: string;
    wikipediaUrl?: string;
    imageUrl?: string;
    image?: {
        url: string;
        sourceUrl: string;
        attributionText: string;
        license?: string;
    };
    externalIds: Record<string, string>;
    latitude?: number;
    longitude?: number;
}
export interface GeoNamesNormalized {
    sourceId: string;
    name?: string;
    sourceUrl: string;
    city?: string;
    region?: string;
    county?: string;
    countryCode?: string;
    alternateNames: string[];
    latitude?: number;
    longitude?: number;
}
export interface OpenTripMapNormalized {
    sourceId: string;
    name?: string;
    sourceUrl: string;
    description?: string;
    tourismKinds: string[];
    wikipedia?: string;
    imageUrl?: string;
    image?: NormalizedPlaceImage;
    latitude?: number;
    longitude?: number;
}
export interface NormalizedPlaceImage {
    canonicalPlaceId?: string;
    imageUrl: string;
    sourceName: SourceName;
    sourceRecordId?: string;
    sourceEntityId?: string;
    attributionLabel: string;
    attributionUrl?: string;
    license?: string;
    width?: number;
    height?: number;
    isPrimaryCandidate: boolean;
    confidence: number;
    imageType: "hero" | "gallery" | "supplemental" | "attraction" | "landmark";
    createdAt: string;
    refreshedAt: string;
    isActive: boolean;
    rawMetadata?: Record<string, unknown>;
}
interface PlaceImageDTO {
    imageUrl: string;
    sourceName: SourceName;
    attributionLabel: string;
    attributionUrl?: string;
    license?: string;
    imageType: NormalizedPlaceImage["imageType"];
}
export declare function buildNormalizedPlaceImage(params: {
    canonicalPlaceId: string;
    sourceName: SourceName;
    sourceRecordId?: string;
    sourceEntityId?: string;
    imageUrl: string;
    attributionLabel: string;
    attributionUrl?: string;
    license?: string;
    width?: number;
    height?: number;
    confidence: number;
    imageType: NormalizedPlaceImage["imageType"];
    rawMetadata?: Record<string, unknown>;
    isPrimaryCandidate?: boolean;
}): NormalizedPlaceImage | undefined;
export declare function selectPrioritizedPlaceImages(images: PlaceImageDTO[]): {
    primaryImage?: PlaceImageDTO;
    imageGallery: PlaceImageDTO[];
};
export declare function normalizeWikidataResponse(payload: Record<string, unknown>): WikidataNormalized;
export declare function normalizeGeoNamesResponse(payload: Record<string, unknown>): GeoNamesNormalized;
export declare function normalizeOpenTripMapResponse(payload: Record<string, unknown>): OpenTripMapNormalized;
export interface EnrichmentProviders {
    wikidata(place: CanonicalPlace): Promise<Record<string, unknown> | undefined>;
    geonames(place: CanonicalPlace): Promise<Record<string, unknown> | undefined>;
    opentripmap(place: CanonicalPlace): Promise<Record<string, unknown> | undefined>;
}
export declare class PlaceEnrichmentService {
    private readonly places;
    private readonly sourceRecords;
    private readonly attributions;
    private readonly enrichment;
    private readonly providers;
    private readonly cache;
    private readonly logger;
    constructor(places: CanonicalPlaceRepository, sourceRecords: SourceRecordRepository, attributions: AttributionRepository, enrichment: EnrichmentRepository, providers: EnrichmentProviders, cache?: EnrichmentLookupCache, logger?: PlacePlatformLogger);
    enrichPlace(canonicalPlaceId: string, sourceName: SourceName, opts?: {
        forceRefresh?: boolean;
    }): Promise<PlaceEnrichmentRecord>;
    private mergeEnrichment;
}
export declare class EnrichmentJobRunner {
    private readonly enrichment;
    private readonly repository;
    constructor(enrichment: PlaceEnrichmentService, repository: EnrichmentRepository);
    run(input: {
        sourceName: SourceName | "all";
        canonicalPlaceIds: string[];
        batchSize?: number;
        resumeCursor?: string;
    }): Promise<EnrichmentJobRun>;
}
export {};
