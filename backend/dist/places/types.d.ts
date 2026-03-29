export type PlaceStatus = "active" | "hidden" | "merged" | "duplicate" | "pending";
export interface PlaceFieldAttribution {
    field: string;
    winningProvider: string;
    winningSourceRecordId: string;
    winningValue: unknown;
    competingValues: Array<{
        provider: string;
        sourceRecordId: string;
        value: unknown;
    }>;
    confidence: number;
    lastConfirmedAt: string;
    reason: string;
}
export type DescriptionSourceType = "provider_editorial" | "provider" | "structured_synthesis" | "minimal_fallback";
export type DescriptionStatus = "empty" | "provider" | "synthesized" | "fallback";
export interface PlaceDescriptionCandidate {
    id: string;
    text: string;
    sourceType: DescriptionSourceType;
    provider?: string;
    sourceRecordId?: string;
    attribution?: string;
    confidence: number;
    language?: string;
    freshnessTimestamp?: string;
    generationMethod: "provider_text" | "structured_summary" | "minimal_summary";
    createdAt: string;
}
export interface CanonicalPhoto {
    canonicalPhotoId: string;
    placeId?: string;
    provider: string;
    sourceProvider: string;
    sourceType: "provider" | "internal" | "user" | "business" | "creator";
    providerPhotoRef?: string;
    sourcePhotoId?: string;
    url?: string;
    thumbnailUrl?: string;
    mediumUrl?: string;
    largeUrl?: string;
    fullUrl?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
    attributionText?: string;
    attributionRequired?: boolean;
    sourceRecordId: string;
    sortOrder?: number;
    rankScore?: number;
    isPrimary?: boolean;
    isFallback?: boolean;
    photoType?: "venue" | "interior" | "exterior" | "food" | "drink" | "menu" | "logo" | "map" | "other";
    status?: "active" | "filtered" | "broken" | "placeholder";
    fetchedAt?: string;
    updatedAt?: string;
    fingerprint?: string;
    qualityScore: number;
}
export interface CanonicalPlaceSourceLink {
    provider: string;
    providerPlaceId: string;
    sourceRecordId: string;
    sourceUrl?: string;
    lastSeenAt: string;
}
export interface CanonicalPlace {
    canonicalPlaceId: string;
    slug: string;
    status: PlaceStatus;
    mergedIntoPlaceId?: string;
    primaryDisplayName: string;
    alternateNames: string[];
    latitude: number;
    longitude: number;
    geohash: string;
    formattedAddress?: string;
    address1?: string;
    address2?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    countryCode?: string;
    neighborhood?: string;
    canonicalCategory: string;
    canonicalSubcategory?: string;
    providerCategories: string[];
    tags: string[];
    cuisineTags: string[];
    vibeTags: string[];
    phone?: string;
    websiteUrl?: string;
    reservationUrl?: string;
    menuUrl?: string;
    orderingUrl?: string;
    bookingUrl?: string;
    socialLinks: Record<string, string>;
    shortDescription?: string;
    longDescription?: string;
    descriptionStatus: DescriptionStatus;
    descriptionSourceType?: PlaceDescriptionCandidate["sourceType"];
    descriptionSourceProvider?: string;
    descriptionSourceAttribution?: string;
    descriptionConfidence: number;
    descriptionGeneratedAt?: string;
    descriptionVersion: number;
    descriptionLanguage?: string;
    descriptionGenerationMethod?: PlaceDescriptionCandidate["generationMethod"];
    alternateDescriptions: PlaceDescriptionCandidate[];
    descriptionProvenance: Array<{
        candidateId: string;
        provider?: string;
        sourceRecordId?: string;
        sourceType: DescriptionSourceType;
    }>;
    aiGeneratedDescription: boolean;
    editorialDescription: boolean;
    descriptionCandidates: PlaceDescriptionCandidate[];
    primaryPhoto?: CanonicalPhoto;
    photoGallery: CanonicalPhoto[];
    providerPhotoRefs: Array<{
        provider: string;
        providerPhotoRef: string;
        sourceRecordId: string;
    }>;
    timezone?: string;
    openNow?: boolean;
    normalizedHours: Record<string, Array<{
        opens: string;
        closes: string;
    }>>;
    rawHoursText: string[];
    dataCompletenessScore: number;
    mergeConfidence: number;
    categoryConfidence: number;
    geocodeConfidence: number;
    permanentlyClosed: boolean;
    temporarilyClosed: boolean;
    sourceLinks: CanonicalPlaceSourceLink[];
    sourceRecordIds: string[];
    fieldAttribution: PlaceFieldAttribution[];
    manualOverrides: Partial<{
        canonicalCategory: string;
        canonicalSubcategory: string;
        primaryDisplayName: string;
        descriptionCandidateId: string;
        primaryPhotoId: string;
    }>;
    firstSeenAt: string;
    lastSeenAt: string;
    lastNormalizedAt: string;
    lastMergedAt: string;
}
export interface NormalizedProviderPhoto {
    providerPhotoRef?: string;
    sourcePhotoId?: string;
    url?: string;
    thumbnailUrl?: string;
    mediumUrl?: string;
    largeUrl?: string;
    fullUrl?: string;
    width?: number;
    height?: number;
    attributionText?: string;
    isPrimary?: boolean;
    photoType?: CanonicalPhoto["photoType"];
    fetchedAt?: string;
}
export interface NormalizedProviderPlace {
    provider: string;
    providerPlaceId: string;
    sourceUrl?: string;
    name: string;
    aliases: string[];
    normalizedName: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    address1?: string;
    address2?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    countryCode?: string;
    neighborhood?: string;
    providerCategories: string[];
    tags: string[];
    phone?: string;
    websiteUrl?: string;
    reservationUrl?: string;
    menuUrl?: string;
    orderingUrl?: string;
    bookingUrl?: string;
    socialLinks: Record<string, string>;
    rating?: number;
    ratingCount?: number;
    priceLevel?: number;
    timezone?: string;
    openNow?: boolean;
    normalizedHours: Record<string, Array<{
        opens: string;
        closes: string;
    }>>;
    rawHoursText: string[];
    photos: NormalizedProviderPhoto[];
    descriptionSnippet?: string;
    permanentlyClosed: boolean;
    temporarilyClosed: boolean;
    comparisonAddress: string;
    comparisonPhone?: string;
    comparisonWebsiteDomain?: string;
    raw: unknown;
}
export interface PlaceSourceRecord {
    sourceRecordId: string;
    provider: string;
    providerPlaceId: string;
    canonicalPlaceId?: string;
    rawPayload: unknown;
    rawPayloadHash: string;
    normalizedPayload: NormalizedProviderPlace;
    fetchTimestamp: string;
    sourceUrl?: string;
    sourceConfidence: number;
    importBatchId?: string;
    syncRunId?: string;
    version: number;
}
export interface MatchSignal {
    signal: string;
    weight: number;
    score: number;
    detail: string;
}
export type MatchOutcome = "no_match" | "possible_match" | "confident_auto_merge" | "exact_linked_match";
export interface MatchResult {
    outcome: MatchOutcome;
    canonicalPlaceId?: string;
    score: number;
    reasons: MatchSignal[];
}
export interface MergeSummary {
    changedFields: string[];
    created: boolean;
    updated: boolean;
    unchanged: boolean;
}
export interface ImportProviderPlaceInput {
    provider: string;
    rawPayload: unknown;
    sourceUrl?: string;
    importBatchId?: string;
    syncRunId?: string;
    fetchedAt?: string;
}
export interface ImportProviderPlaceResult {
    status: "created" | "updated" | "unchanged";
    canonicalPlaceId: string;
    sourceRecordId: string;
    match: MatchResult;
    mergeSummary: MergeSummary;
}
export type DuplicateCandidateStatus = "pending" | "approved" | "rejected" | "merged";
export interface DuplicateCandidate {
    id: string;
    placeIdA: string;
    placeIdB: string;
    confidence: number;
    reasons: string[];
    status: DuplicateCandidateStatus;
    reviewedByUserId?: string;
    reviewedAt?: string;
    reviewNote?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PlaceMaintenanceAuditEntry {
    id: string;
    actionType: "merge" | "correction" | "candidate_review" | "attachment_relink";
    actorUserId: string;
    targetPlaceId?: string;
    sourcePlaceIds?: string[];
    reason?: string;
    note?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdAt: string;
}
export type PlaceAttachmentType = "review" | "video" | "save" | "guide" | "trust" | "moderation";
export interface PlaceAttachmentLink {
    id: string;
    placeId: string;
    attachmentType: PlaceAttachmentType;
    attachmentId: string;
    ownerUserId?: string;
    metadata: Record<string, unknown>;
}
export interface ProviderAdapter {
    provider: string;
    normalizeProviderPlace(rawPayload: unknown, ctx: {
        sourceUrl?: string;
    }): NormalizedProviderPlace;
}
export interface PlaceStore {
    getSourceRecordByProviderRef(provider: string, providerPlaceId: string): PlaceSourceRecord | undefined;
    upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord;
    getCanonicalPlace(placeId: string): CanonicalPlace | undefined;
    upsertCanonicalPlace(place: CanonicalPlace): CanonicalPlace;
    listCanonicalPlaces(): CanonicalPlace[];
    listSourceRecordsForPlace(canonicalPlaceId: string): PlaceSourceRecord[];
    listSourceRecords(): PlaceSourceRecord[];
    upsertDuplicateCandidate(candidate: DuplicateCandidate): DuplicateCandidate;
    listDuplicateCandidates(status?: DuplicateCandidateStatus): DuplicateCandidate[];
    getDuplicateCandidate(candidateId: string): DuplicateCandidate | undefined;
    upsertMaintenanceAudit(entry: PlaceMaintenanceAuditEntry): PlaceMaintenanceAuditEntry;
    listMaintenanceAudits(placeId?: string): PlaceMaintenanceAuditEntry[];
    upsertAttachmentLink(link: PlaceAttachmentLink): PlaceAttachmentLink;
    listAttachmentLinks(placeId: string): PlaceAttachmentLink[];
    removeAttachmentLink(linkId: string): void;
}
