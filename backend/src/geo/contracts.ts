export interface GeoGeocodeRequest {
  query: string;
  language?: string;
  countryCodes?: string[];
  limit?: number;
}

export interface GeoReverseGeocodeRequest {
  lat: number;
  lng: number;
  language?: string;
  zoom?: number;
}

export interface GeoResult {
  displayName: string;
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
  source: "nominatim";
}

export interface GeoReverseResult extends Omit<GeoResult, "boundingBox" | "importance"> {}

export interface GeoHealthResponse {
  ok: boolean;
  mode: "remote" | "local";
  upstream?: {
    ok: boolean;
    latencyMs?: number;
    error?: string;
  };
  version: string;
}

export interface GeoAuthHeaders {
  "x-perbug-geo-service": string;
}
