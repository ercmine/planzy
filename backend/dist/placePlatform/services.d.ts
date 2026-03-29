import { type AttributionRepository, type CanonicalPlaceRepository, type CategoryRepository, type ImportRunRepository, type SourceRecordRepository } from "./repositories.js";
import type { ImportBatchResult, ImportResult, NearbyPlaceResult, NearbyPlacesQuery, OsmImportRunInput, OsmPlaceInput, PlacePlatformLogger, SourceCategoryMappingRule } from "./types.js";
export declare class CategoryNormalizationService {
    private readonly categories;
    constructor(categories: CategoryRepository);
    mapOsmTagsToCategories(tags: Record<string, string>): Array<{
        categoryId: string;
        confidence: number;
        rule: SourceCategoryMappingRule;
    }>;
}
export declare class PlaceImportService {
    private readonly places;
    private readonly sourceRecords;
    private readonly attributions;
    private readonly categories;
    private readonly categoryNormalization;
    private readonly logger;
    constructor(places: CanonicalPlaceRepository, sourceRecords: SourceRecordRepository, attributions: AttributionRepository, categories: CategoryRepository, categoryNormalization: CategoryNormalizationService, logger?: PlacePlatformLogger);
    ingestOsmPlace(input: OsmPlaceInput, context?: {
        runId?: string;
        seenAt?: string;
    }): ImportResult;
}
export declare class OsmImportRunnerService {
    private readonly importer;
    private readonly sourceRecords;
    private readonly runs;
    private readonly logger;
    constructor(importer: PlaceImportService, sourceRecords: SourceRecordRepository, runs: ImportRunRepository, logger?: PlacePlatformLogger);
    runImport(input: OsmImportRunInput): ImportBatchResult;
}
export declare class NearbyPlacesService {
    private readonly places;
    private readonly logger;
    constructor(places: CanonicalPlaceRepository, logger?: PlacePlatformLogger);
    findNearbyPlaces(query: NearbyPlacesQuery): NearbyPlaceResult[];
}
