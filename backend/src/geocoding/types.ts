export interface GeocodeRequest {
  query: string;
  language?: string;
  countryCodes?: string[];
  limit?: number;
  viewbox?: [number, number, number, number];
}

export interface ReverseGeocodeRequest {
  lat: number;
  lng: number;
  zoom?: number;
  language?: string;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  osmId?: number;
  osmType?: string;
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
  source: "nominatim";
}

export interface ReverseGeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
  osmId?: number;
  osmType?: string;
  city?: string;
  county?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  neighborhood?: string;
  source: "nominatim";
}

export interface GeocodingProviderHealth {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export interface GeocodingMetricsSnapshot {
  geocodeRequests: number;
  reverseGeocodeRequests: number;
  cacheHits: number;
  cacheMisses: number;
  failures: number;
  timeouts: number;
  noResults: number;
}
