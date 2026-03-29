import type { CanonicalPlace, MatchResult, MergeSummary, NormalizedProviderPlace, PlaceSourceRecord } from "./types.js";
export declare function mergeIntoCanonicalPlace(params: {
    existingPlace?: CanonicalPlace;
    match: MatchResult;
    normalized: NormalizedProviderPlace;
    sourceRecord: PlaceSourceRecord;
}): {
    place: CanonicalPlace;
    summary: MergeSummary;
};
