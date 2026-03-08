const GOOGLE_PLACES_NEARBY_ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_PLACES_TIMEOUT_MS = 8_000;
const GOOGLE_PLACES_DETAILS_BASE = "https://places.googleapis.com/v1/places";

const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.photos"
].join(",");

export interface SearchNearbyInput {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes: string[];
  maxResults: number;
}

export interface GooglePlace {
  id: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  googleMapsUri?: string;
  websiteUri?: string;
  photos?: Array<{ name?: string }>;
}

export interface GooglePlaceDetail extends GooglePlace {
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string; languageCode?: string };
}

const GOOGLE_PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "googleMapsUri",
  "websiteUri",
  "nationalPhoneNumber",
  "regularOpeningHours.weekdayDescriptions",
  "photos",
  "editorialSummary"
].join(",");

export type GooglePlacesErrorCode = "missing_api_key" | "invalid_input" | "upstream_error";

export class GooglePlacesError extends Error {
  readonly statusCode: number;
  readonly code: GooglePlacesErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: GooglePlacesErrorCode, message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function assertFinite(name: string, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new GooglePlacesError("invalid_input", `${name} must be a finite number in [${min}, ${max}]`, 400, {
      field: name,
      value
    });
  }
}

function normalizeIncludedTypes(includedTypes: string[]): string[] {
  const normalized = includedTypes
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (normalized.length === 0) {
    throw new GooglePlacesError("invalid_input", "includedTypes must contain at least one non-empty type", 400, {
      field: "includedTypes"
    });
  }

  return normalized;
}

export async function searchNearby(input: SearchNearbyInput): Promise<GooglePlace[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new GooglePlacesError("missing_api_key", "GOOGLE_MAPS_API_KEY is not configured", 503);
  }

  assertFinite("lat", input.lat, -90, 90);
  assertFinite("lng", input.lng, -180, 180);
  assertFinite("radiusMeters", input.radiusMeters, 1, 50_000);
  assertFinite("maxResults", input.maxResults, 1, 20);
  const includedTypes = normalizeIncludedTypes(input.includedTypes);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_PLACES_TIMEOUT_MS);
  const startedAt = Date.now();
  const nearbyEndpoint = process.env.GOOGLE_PLACES_NEARBY_ENDPOINT ?? GOOGLE_PLACES_NEARBY_ENDPOINT;

  try {
    const response = await fetch(nearbyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: input.maxResults,
        locationRestriction: {
          circle: {
            center: {
              latitude: input.lat,
              longitude: input.lng
            },
            radius: input.radiusMeters
          }
        }
      }),
      signal: controller.signal
    });

    const latencyMs = Date.now() - startedAt;
    console.info(
      JSON.stringify({
        event: "google_places_nearby",
        statusCode: response.status,
        latencyMs
      })
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GooglePlacesError("upstream_error", "Google Places API request failed", 502, {
        upstreamStatus: response.status,
        upstreamBody: errorBody.slice(0, 500)
      });
    }

    const payload = (await response.json()) as { places?: GooglePlace[] };
    return payload.places ?? [];
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GooglePlacesError("upstream_error", "Google Places API request timed out", 502);
    }

    throw new GooglePlacesError("upstream_error", "Failed to reach Google Places API", 502, {
      cause: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPlaceDetail(placeId: string): Promise<GooglePlaceDetail> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new GooglePlacesError("missing_api_key", "GOOGLE_MAPS_API_KEY is not configured", 503);
  }

  if (!placeId || !/^[a-zA-Z0-9_\-.]+$/.test(placeId)) {
    throw new GooglePlacesError("invalid_input", "placeId is invalid", 400, { placeId });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_PLACES_TIMEOUT_MS);
  const endpointBase = process.env.GOOGLE_PLACES_DETAILS_ENDPOINT_BASE ?? GOOGLE_PLACES_DETAILS_BASE;
  const endpoint = `${endpointBase}/${encodeURIComponent(placeId)}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": GOOGLE_PLACE_DETAILS_FIELD_MASK
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GooglePlacesError("upstream_error", "Google Place detail request failed", 502, {
        upstreamStatus: response.status,
        upstreamBody: errorBody.slice(0, 500)
      });
    }

    return (await response.json()) as GooglePlaceDetail;
  } catch (error) {
    if (error instanceof GooglePlacesError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new GooglePlacesError("upstream_error", "Google Place detail request timed out", 502);
    }
    throw new GooglePlacesError("upstream_error", "Failed to reach Google Places API", 502, {
      cause: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function categoryToIncludedTypes(category?: string): string[] {
  switch ((category ?? "").toLowerCase()) {
    case "coffee":
      return ["cafe", "coffee_shop"];
    case "food":
      return ["restaurant"];
    case "bar":
      return ["bar"];
    case "park":
      return ["park"];
    case "museum":
      return ["museum"];
    case "shopping":
      return ["shopping_mall", "store"];
    case "fun":
      return ["tourist_attraction"];
    default:
      return ["restaurant", "cafe", "tourist_attraction"];
  }
}
