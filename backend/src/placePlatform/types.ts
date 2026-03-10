export type SourceName = "osm" | "wikidata" | "geonames" | "opentripmap" | "perbug" | (string & {});

export interface CanonicalPlace {
  id: string;
  slug?: string;
  primaryName: string;
  normalizedName?: string;
  latitude: number;
  longitude: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  description?: string;
  phoneE164?: string;
  websiteUrl?: string;
  priceLevel?: number;
  qualityScore?: number;
  status: "ACTIVE" | "HIDDEN" | "MERGED" | "DUPLICATE";
  visibilityStatus: "PUBLIC" | "PRIVATE" | "SUPPRESSED";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceSourceRecord {
  id: string;
  canonicalPlaceId: string;
  sourceName: SourceName;
  sourceRecordId: string;
  sourceVersion?: string;
  sourceUrl?: string;
  rawName?: string;
  rawTags: Record<string, string>;
  rawPayload: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  sourceCategoryKeys: string[];
  sourceRecordUpdatedAt?: string;
  importBatchId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceSourceAttribution {
  id: string;
  canonicalPlaceId: string;
  placeSourceRecordId?: string;
  sourceName: SourceName;
  sourceLabel: string;
  sourceUrl?: string;
  isPrimary: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceCategory {
  id: string;
  slug: string;
  displayName: string;
  parentCategoryId?: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface CanonicalPlaceCategory {
  id: string;
  canonicalPlaceId: string;
  categoryId: string;
  isPrimary: boolean;
  confidence?: number;
  source: "NORMALIZED" | "MANUAL";
}

export interface SourceCategoryMappingRule {
  id: string;
  sourceName: SourceName;
  sourceKey: string;
  sourceValue?: string;
  categoryId: string;
  confidence: number;
  priority: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface OsmPlaceInput {
  sourceRecordId: string;
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
  payload: Record<string, unknown>;
  sourceUrl?: string;
  sourceVersion?: string;
  sourceUpdatedAt?: string;
  importBatchId?: string;
}

export interface NearbyPlacesQuery {
  lat: number;
  lng: number;
  radiusMeters: number;
  limit?: number;
  categoryIds?: string[];
  statuses?: CanonicalPlace["status"][];
}

export interface NearbyPlaceResult {
  place: CanonicalPlace;
  distanceMeters: number;
  primaryCategoryId?: string;
}

export interface ImportResult {
  canonicalPlaceId: string;
  sourceRecordId: string;
  outcome: "created" | "updated" | "unchanged";
  categoriesApplied: string[];
}

export interface PlacePlatformLogger {
  info(message: string, meta?: Record<string, unknown>): void;
}
