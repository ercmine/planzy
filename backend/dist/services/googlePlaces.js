import { buildCategorySearchPlan } from "./categoryIntelligence.js";
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
export class GooglePlacesError extends Error {
    statusCode;
    code;
    details;
    constructor(code, message, statusCode, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}
function assertFinite(name, value, min, max) {
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new GooglePlacesError("invalid_input", `${name} must be a finite number in [${min}, ${max}]`, 400, {
            field: name,
            value
        });
    }
}
function normalizeIncludedTypes(includedTypes) {
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
export async function searchNearby(input) {
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
        console.info(JSON.stringify({
            event: "google_places_nearby",
            statusCode: response.status,
            latencyMs
        }));
        if (!response.ok) {
            const errorBody = await response.text();
            throw new GooglePlacesError("upstream_error", "Google Places API request failed", 502, {
                upstreamStatus: response.status,
                upstreamBody: errorBody.slice(0, 500)
            });
        }
        const payload = (await response.json());
        return payload.places ?? [];
    }
    catch (error) {
        if (error instanceof GooglePlacesError) {
            throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
            throw new GooglePlacesError("upstream_error", "Google Places API request timed out", 502);
        }
        throw new GooglePlacesError("upstream_error", "Failed to reach Google Places API", 502, {
            cause: error instanceof Error ? error.message : String(error)
        });
    }
    finally {
        clearTimeout(timeout);
    }
}
export async function fetchPlaceDetail(placeId) {
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
        return (await response.json());
    }
    catch (error) {
        if (error instanceof GooglePlacesError) {
            throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
            throw new GooglePlacesError("upstream_error", "Google Place detail request timed out", 502);
        }
        throw new GooglePlacesError("upstream_error", "Failed to reach Google Places API", 502, {
            cause: error instanceof Error ? error.message : String(error)
        });
    }
    finally {
        clearTimeout(timeout);
    }
}
export function categoryToIncludedTypes(category) {
    return buildCategorySearchPlan(category).primaryTypes;
}
