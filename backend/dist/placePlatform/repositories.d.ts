import type { CanonicalPlace, CanonicalPlaceCategory, NearbyPlaceResult, NearbyPlacesQuery, PlaceCategory, PlaceImportRun, PlaceSourceAttribution, PlaceSourceRecord, SourceCategoryMappingRule, SourceName } from "./types.js";
export interface CanonicalPlaceRepository {
    getById(id: string): CanonicalPlace | undefined;
    listPlaces(): CanonicalPlace[];
    findBySource(sourceName: string, sourceRecordId: string): CanonicalPlace | undefined;
    upsertPlace(place: CanonicalPlace): CanonicalPlace;
    findNearby(query: NearbyPlacesQuery): NearbyPlaceResult[];
}
export interface SourceRecordRepository {
    getSourceRecordBySourceRef(sourceName: string, sourceRecordId: string): PlaceSourceRecord | undefined;
    upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord;
    listSourceRecordsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceRecord[];
    listSourceRecordsBySource(sourceName: SourceName): PlaceSourceRecord[];
}
export interface AttributionRepository {
    upsertAttribution(attribution: PlaceSourceAttribution): PlaceSourceAttribution;
    listAttributionsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceAttribution[];
}
export interface CategoryRepository {
    listRules(sourceName: string): SourceCategoryMappingRule[];
    getCategory(id: string): PlaceCategory | undefined;
    upsertCanonicalPlaceCategory(category: CanonicalPlaceCategory): CanonicalPlaceCategory;
    listCanonicalPlaceCategories(canonicalPlaceId: string): CanonicalPlaceCategory[];
}
export interface ImportRunRepository {
    getImportRunById(id: string): PlaceImportRun | undefined;
    upsertImportRun(run: PlaceImportRun): PlaceImportRun;
    listImportRuns(): PlaceImportRun[];
}
export declare class InMemoryPlacePlatformRepository implements CanonicalPlaceRepository, SourceRecordRepository, AttributionRepository, CategoryRepository, ImportRunRepository {
    private readonly places;
    private readonly sourceByRef;
    private readonly attributions;
    private readonly categories;
    private readonly rules;
    private readonly placeCategories;
    private readonly runs;
    constructor(seed?: {
        categories?: PlaceCategory[];
        rules?: SourceCategoryMappingRule[];
    });
    private sourceKey;
    getById(id: string): CanonicalPlace | undefined;
    listPlaces(): CanonicalPlace[];
    findBySource(sourceName: string, sourceRecordId: string): CanonicalPlace | undefined;
    upsertPlace(place: CanonicalPlace): CanonicalPlace;
    findNearby(query: NearbyPlacesQuery): NearbyPlaceResult[];
    getSourceRecordBySourceRef(sourceName: string, sourceRecordId: string): PlaceSourceRecord | undefined;
    upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord;
    listSourceRecordsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceRecord[];
    listSourceRecordsBySource(sourceName: SourceName): PlaceSourceRecord[];
    upsertAttribution(attribution: PlaceSourceAttribution): PlaceSourceAttribution;
    listAttributionsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceAttribution[];
    listRules(sourceName: string): SourceCategoryMappingRule[];
    getCategory(id: string): PlaceCategory | undefined;
    upsertCanonicalPlaceCategory(category: CanonicalPlaceCategory): CanonicalPlaceCategory;
    listCanonicalPlaceCategories(canonicalPlaceId: string): CanonicalPlaceCategory[];
    getImportRunById(id: string): PlaceImportRun | undefined;
    upsertImportRun(run: PlaceImportRun): PlaceImportRun;
    listImportRuns(): PlaceImportRun[];
}
export declare function buildNearbyPlacesSqlQuery(): string;
export declare function buildTextSearchPlacesSqlQuery(): string;
export declare function buildCategorySearchPlacesSqlQuery(): string;
