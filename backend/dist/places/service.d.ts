import type { ImportProviderPlaceInput, ImportProviderPlaceResult, MatchResult, NormalizedProviderPlace, PlaceSourceRecord, PlaceStore } from "./types.js";
export declare class PlaceNormalizationService {
    readonly store: PlaceStore;
    constructor(store: PlaceStore);
    normalizeProviderPlace(provider: string, rawPayload: unknown, sourceUrl?: string): NormalizedProviderPlace;
    findPlaceMatch(normalizedProviderPlace: NormalizedProviderPlace): MatchResult;
    getCanonicalPlace(placeId: string): import("./types.js").CanonicalPlace | undefined;
    getCanonicalPlaceByProviderRef(provider: string, providerPlaceId: string): import("./types.js").CanonicalPlace | undefined;
    importProviderPlace(input: ImportProviderPlaceInput): ImportProviderPlaceResult;
    listCanonicalPlaces(): import("./types.js").CanonicalPlace[];
    listSourceRecords(): PlaceSourceRecord[];
    listSourceRecordsForPlace(placeId: string): PlaceSourceRecord[];
    rebuildCanonicalPlace(placeId: string): import("./types.js").CanonicalPlace | undefined;
    reprocessSourceRecord(sourceRecordId: string): ImportProviderPlaceResult | undefined;
}
