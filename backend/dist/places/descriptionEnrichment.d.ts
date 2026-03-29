import type { CanonicalPlace, NormalizedProviderPlace, PlaceDescriptionCandidate, PlaceSourceRecord } from "./types.js";
interface EnrichmentInput {
    existingPlace?: CanonicalPlace;
    normalized: NormalizedProviderPlace;
    sourceRecord: PlaceSourceRecord;
    canonicalCategory: string;
}
export interface DescriptionEnrichmentResult {
    shortDescription?: string;
    longDescription?: string;
    descriptionStatus: CanonicalPlace["descriptionStatus"];
    descriptionSourceType?: CanonicalPlace["descriptionSourceType"];
    descriptionSourceProvider?: string;
    descriptionSourceAttribution?: string;
    descriptionConfidence: number;
    descriptionGeneratedAt?: string;
    descriptionVersion: number;
    descriptionLanguage?: string;
    descriptionGenerationMethod?: CanonicalPlace["descriptionGenerationMethod"];
    selectedCandidate?: PlaceDescriptionCandidate;
    candidates: PlaceDescriptionCandidate[];
    alternates: PlaceDescriptionCandidate[];
}
export declare function enrichPlaceDescriptions(input: EnrichmentInput): DescriptionEnrichmentResult;
export {};
