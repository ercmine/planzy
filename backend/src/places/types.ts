export type PlaceStatus = "active" | "hidden" | "merged" | "duplicate" | "pending";

export interface PlaceFieldAttribution {
  field: string;
  winningProvider: string;
  winningSourceRecordId: string;
  winningValue: unknown;
  competingValues: Array<{ provider: string; sourceRecordId: string; value: unknown }>;
  confidence: number;
  lastConfirmedAt: string;
  reason: string;
}

export interface PlaceDescriptionCandidate {
  id: string;
  text: string;
  sourceType: "provider" | "editorial" | "ai_generated" | "derived";
  provider?: string;
  sourceRecordId?: string;
  attribution?: string;
  createdAt: string;
}

export interface CanonicalPhoto {
  canonicalPhotoId: string;
  provider: string;
  providerPhotoRef?: string;
  url?: string;
  width?: number;
  height?: number;
  attributionText?: string;
  sourceRecordId: string;
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
  descriptionSourceType?: PlaceDescriptionCandidate["sourceType"];
  descriptionSourceAttribution?: string;
  aiGeneratedDescription: boolean;
  editorialDescription: boolean;
  descriptionCandidates: PlaceDescriptionCandidate[];
  primaryPhoto?: CanonicalPhoto;
  photoGallery: CanonicalPhoto[];
  providerPhotoRefs: Array<{ provider: string; providerPhotoRef: string; sourceRecordId: string }>;
  timezone?: string;
  openNow?: boolean;
  normalizedHours: Record<string, Array<{ opens: string; closes: string }>>;
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
  url?: string;
  width?: number;
  height?: number;
  attributionText?: string;
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
  normalizedHours: Record<string, Array<{ opens: string; closes: string }>>;
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

export interface ProviderAdapter {
  provider: string;
  normalizeProviderPlace(rawPayload: unknown, ctx: { sourceUrl?: string }): NormalizedProviderPlace;
}

export interface PlaceStore {
  getSourceRecordByProviderRef(provider: string, providerPlaceId: string): PlaceSourceRecord | undefined;
  upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord;
  getCanonicalPlace(placeId: string): CanonicalPlace | undefined;
  upsertCanonicalPlace(place: CanonicalPlace): CanonicalPlace;
  listCanonicalPlaces(): CanonicalPlace[];
  listSourceRecordsForPlace(canonicalPlaceId: string): PlaceSourceRecord[];
  listSourceRecords(): PlaceSourceRecord[];
}
