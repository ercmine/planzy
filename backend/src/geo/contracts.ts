export interface GeoBiasContext {
  lat?: number;
  lng?: number;
  city?: string;
  region?: string;
  countryCode?: string;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoGeocodeRequest {
  query: string;
  language?: string;
  countryCodes?: string[];
  limit?: number;
  bias?: GeoBiasContext;
  bounds?: GeoBounds;
}

export interface GeoReverseGeocodeRequest {
  lat: number;
  lng: number;
  language?: string;
  zoom?: number;
}

export interface GeoAutocompleteRequest {
  query: string;
  limit?: number;
  language?: string;
  bias?: GeoBiasContext;
  bounds?: GeoBounds;
}

export interface GeoPlaceLookupRequest {
  query: string;
  limit?: number;
  language?: string;
}

export interface GeoAreaContextRequest {
  lat: number;
  lng: number;
  language?: string;
}

export interface GeoResult {
  displayName: string;
  normalizedName?: string;
  lat: number;
  lng: number;
  city?: string;
  county?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  neighborhood?: string;
  boundingBox?: [number, number, number, number];
  class?: string;
  type?: string;
  importance?: number;
  confidence?: number;
  source: "nominatim";
}

export interface GeoReverseResult extends Omit<GeoResult, "boundingBox" | "importance"> {}

export interface GeoSuggestion {
  id: string;
  displayName: string;
  normalizedName?: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  category?: string;
  type?: string;
  relevanceScore: number;
  source: "nominatim";
}

export interface GeoPlaceLookupCandidate {
  displayName: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  category?: string;
  confidence?: number;
  canonicalSummary: {
    canonicalKey: string;
    normalizedName: string;
  };
}

export interface GeoAreaContext {
  city?: string;
  region?: string;
  county?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  source: "nominatim";
}

export interface PerbugGeoPlace {
  id: string;
  name: string;
  displayName: string;
  shortAddress?: string;
  lat: number;
  lon: number;
  boundingBox?: GeoBounds;
  category?: string;
  subcategory?: string;
  city?: string;
  region?: string;
  country?: string;
  postcode?: string;
  source: "nominatim";
  confidence?: number;
  importance?: number;
  osm?: {
    canonicalKey: string;
  };
  match: {
    knownPlace: boolean;
    internalPlaceId?: string;
    rewardEnabled: boolean;
    sponsored: boolean;
    hasReviews: boolean;
    checkInEligible: boolean;
  };
}

export interface GeoHealthResponse {
  ok: boolean;
  mode: "remote" | "local";
  upstream?: {
    ok: boolean;
    latencyMs?: number;
    error?: string;
  };
  metrics?: {
    geocodeRequests: number;
    reverseGeocodeRequests: number;
    cacheHits: number;
    cacheMisses: number;
    failures: number;
    timeouts: number;
    noResults: number;
  };
  version: string;
}

export interface GeoAuthHeaders {
  "x-perbug-geo-service": string;
}
