import { ProviderError, RateLimitError, TimeoutError } from "../../errors.js";
import { isAbortError } from "../../provider.js";
import { NoScrapePolicy, defaultNoScrapePolicy } from "../../../policy/noScrapePolicy.js";
import { createPolicyFetch } from "../../../policy/policyFetch.js";

const GOOGLE_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.websiteUri,places.internationalPhoneNumber,places.regularOpeningHours,places.photos,places.types";

export interface GooglePlacesConfig {
  apiKey: string;
  timeoutMs: number;
  maxResults: number;
  languageCode?: string;
}

export interface GoogleNearbySearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes?: string[];
  keyword?: string;
  openNow?: boolean;
  maxResultCount?: number;
}

export interface GooglePlaceLite {
  id: string;
  displayName?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string | number;
  googleMapsUri?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  photos?: { name?: string; widthPx?: number; heightPx?: number; authorAttributions?: unknown }[];
  types?: string[];
}

interface GoogleNearbyResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string | number;
    googleMapsUri?: string;
    websiteUri?: string;
    internationalPhoneNumber?: string;
    regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
    photos?: { name?: string; widthPx?: number; heightPx?: number; authorAttributions?: unknown }[];
    types?: string[];
  }>;
}

function createCombinedController(signal: AbortSignal | undefined, timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
  didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timeoutTriggered = false;

  const onAbort = (): void => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort(new DOMException("Request timed out", "AbortError"));
  }, timeoutMs);

  return {
    controller,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    },
    didTimeout: () => timeoutTriggered
  };
}

export class GooglePlacesClient {
  private readonly cfg: GooglePlacesConfig;
  private readonly fetchFn: typeof fetch;

  constructor(cfg: GooglePlacesConfig, opts?: { fetchFn?: typeof fetch; policy?: NoScrapePolicy }) {
    this.cfg = cfg;
    const policy = opts?.policy ?? new NoScrapePolicy(defaultNoScrapePolicy());
    this.fetchFn = createPolicyFetch({ policy, kind: "api", fetchFn: opts?.fetchFn ?? fetch });
  }

  public async searchNearby(params: GoogleNearbySearchParams, ctx?: { signal?: AbortSignal }): Promise<GooglePlaceLite[]> {
    const combined = createCombinedController(ctx?.signal, this.cfg.timeoutMs);
    const maxResultCount = Math.max(1, Math.min(20, params.maxResultCount ?? this.cfg.maxResults));

    try {
      const response = await this.fetchFn(GOOGLE_NEARBY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.cfg.apiKey,
          "X-Goog-FieldMask": GOOGLE_FIELD_MASK
        },
        signal: combined.controller.signal,
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: { latitude: params.lat, longitude: params.lng },
              radius: params.radiusMeters
            }
          },
          maxResultCount,
          includedTypes: params.includedTypes?.length ? params.includedTypes : undefined,
          keyword: params.keyword,
          openNow: params.openNow,
          languageCode: this.cfg.languageCode
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError("google");
        }
        if (response.status === 408 || response.status === 504) {
          throw new TimeoutError("google");
        }
        throw new ProviderError({
          provider: "google",
          code: `HTTP_${response.status}`,
          message: `Google Places request failed with status ${response.status}`,
          retryable: false
        });
      }

      const data = (await response.json()) as GoogleNearbyResponse;
      const places = data.places ?? [];
      return places
        .filter((place): place is NonNullable<GoogleNearbyResponse["places"]>[number] & { id: string } => typeof place.id === "string")
        .map((place) => ({
          id: place.id,
          displayName: place.displayName?.text,
          formattedAddress: place.formattedAddress,
          location:
            typeof place.location?.latitude === "number" && typeof place.location?.longitude === "number"
              ? { latitude: place.location.latitude, longitude: place.location.longitude }
              : undefined,
          rating: place.rating,
          userRatingCount: place.userRatingCount,
          priceLevel: place.priceLevel,
          googleMapsUri: place.googleMapsUri,
          websiteUri: place.websiteUri,
          internationalPhoneNumber: place.internationalPhoneNumber,
          regularOpeningHours: place.regularOpeningHours,
          photos: place.photos,
          types: place.types
        }));
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      if (combined.didTimeout() || isAbortError(error)) {
        throw new TimeoutError("google", "Google Places request timed out", error);
      }
      throw new ProviderError({
        provider: "google",
        code: "HTTP_ERROR",
        message: "Google Places request failed",
        retryable: false,
        cause: error
      });
    } finally {
      combined.cleanup();
    }
  }
}
