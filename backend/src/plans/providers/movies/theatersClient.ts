import { normalizePriceLevel } from "../../normalization/price.js";
import { buildMapsLink, normalizeHttpUrl, normalizeTelUrl } from "../../normalization/urls.js";
import type { Plan } from "../../plan.js";
import { validatePlanArray } from "../../planValidation.js";
import { GooglePlacesClient, type GooglePlaceLite } from "../places/googlePlacesClient.js";
import { YelpClient, type YelpBusinessLite } from "../places/yelpClient.js";

export interface TheatersSearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  openNow?: boolean;
  limit?: number;
  locale?: string;
}

export class TheatersClient {
  private readonly googleApiKey?: string;
  private readonly yelpApiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(opts: { googleApiKey?: string; yelpApiKey?: string; timeoutMs: number; fetchFn?: typeof fetch }) {
    this.googleApiKey = opts.googleApiKey;
    this.yelpApiKey = opts.yelpApiKey;
    this.timeoutMs = opts.timeoutMs;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  public async search(params: TheatersSearchParams, ctx?: { signal?: AbortSignal }): Promise<Plan[]> {
    const limit = Math.max(1, Math.min(20, params.limit ?? 20));

    if (this.googleApiKey) {
      const googleClient = new GooglePlacesClient(
        {
          apiKey: this.googleApiKey,
          timeoutMs: this.timeoutMs,
          maxResults: limit,
          languageCode: params.locale
        },
        { fetchFn: this.fetchFn }
      );

      const places = await googleClient.searchNearby(
        {
          lat: params.lat,
          lng: params.lng,
          radiusMeters: params.radiusMeters,
          includedTypes: ["movie_theater"],
          openNow: params.openNow,
          maxResultCount: limit
        },
        { signal: ctx?.signal }
      );

      return validatePlanArray(places.map((place) => this.googleToPlan(place)).filter((plan): plan is Plan => plan !== null));
    }

    if (this.yelpApiKey) {
      const yelpClient = new YelpClient(
        {
          apiKey: this.yelpApiKey,
          timeoutMs: this.timeoutMs,
          limit,
          locale: params.locale
        },
        { fetchFn: this.fetchFn }
      );

      const response = await yelpClient.search(
        {
          lat: params.lat,
          lng: params.lng,
          radiusMeters: params.radiusMeters,
          categories: ["movietheaters"],
          openNow: params.openNow,
          limit
        },
        { signal: ctx?.signal }
      );

      return validatePlanArray(
        response.businesses.map((business) => this.yelpToPlan(business, params.openNow)).filter((plan): plan is Plan => plan !== null)
      );
    }

    return [];
  }

  private googleToPlan(place: GooglePlaceLite): Plan | null {
    const title = place.displayName?.trim();
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;

    if (!title || typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }

    return {
      id: `google:${place.id}`,
      source: "google",
      sourceId: place.id,
      title,
      category: "movies",
      location: {
        lat,
        lng,
        address: place.formattedAddress
      },
      rating: place.rating,
      reviewCount: place.userRatingCount,
      priceLevel: normalizePriceLevel(place.priceLevel),
      hours: {
        openNow: place.regularOpeningHours?.openNow,
        weekdayText: place.regularOpeningHours?.weekdayDescriptions
      },
      deepLinks: {
        maps: normalizeHttpUrl(place.googleMapsUri) ?? buildMapsLink(lat, lng, title),
        website: normalizeHttpUrl(place.websiteUri),
        call: normalizeTelUrl(place.internationalPhoneNumber)
      },
      metadata: {
        kind: "theater",
        providerTypes: place.types,
        google: {
          id: place.id,
          photoRefs: place.photos?.map((photo) => photo.name).filter((name): name is string => typeof name === "string")
        }
      }
    };
  }

  private yelpToPlan(business: YelpBusinessLite, requestedOpenNow: boolean | undefined): Plan | null {
    const title = business.name?.trim();
    const lat = business.coordinates?.latitude;
    const lng = business.coordinates?.longitude;

    if (!title || typeof lat !== "number" || typeof lng !== "number") {
      return null;
    }

    const address = business.location?.display_address?.filter((line) => line.trim().length > 0).join(", ");

    const imageUrl = normalizeHttpUrl(business.image_url);

    return {
      id: `yelp:${business.id}`,
      source: "yelp",
      sourceId: business.id,
      title,
      category: "movies",
      location: {
        lat,
        lng,
        address: address || undefined
      },
      distanceMeters: typeof business.distance === "number" ? business.distance : undefined,
      rating: business.rating,
      reviewCount: business.review_count,
      priceLevel: normalizePriceLevel(business.price),
      hours: {
        openNow: requestedOpenNow ? true : undefined
      },
      photos: imageUrl ? [{ url: imageUrl }] : undefined,
      deepLinks: {
        maps: buildMapsLink(lat, lng, title),
        website: normalizeHttpUrl(business.url),
        call: normalizeTelUrl(business.display_phone ?? business.phone)
      },
      metadata: {
        kind: "theater",
        yelp: {
          categories: business.categories?.map((category) => category.alias).filter((alias): alias is string => typeof alias === "string")
        }
      }
    };
  }
}
