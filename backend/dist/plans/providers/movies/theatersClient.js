import { normalizePriceLevel } from "../../normalization/price.js";
import { buildMapsLink, normalizeHttpUrl, normalizeTelUrl } from "../../normalization/urls.js";
import { validatePlanArray } from "../../planValidation.js";
import { GooglePlacesClient } from "../places/googlePlacesClient.js";
import { YelpClient } from "../places/yelpClient.js";
import { NoScrapePolicy, defaultNoScrapePolicy } from "../../../policy/noScrapePolicy.js";
export class TheatersClient {
    googleApiKey;
    yelpApiKey;
    timeoutMs;
    fetchFn;
    policy;
    constructor(opts) {
        this.googleApiKey = opts.googleApiKey;
        this.yelpApiKey = opts.yelpApiKey;
        this.timeoutMs = opts.timeoutMs;
        this.fetchFn = opts.fetchFn ?? fetch;
        this.policy = opts.policy ?? new NoScrapePolicy(defaultNoScrapePolicy());
    }
    async search(params, ctx) {
        const limit = Math.max(1, Math.min(20, params.limit ?? 20));
        if (this.googleApiKey) {
            const googleClient = new GooglePlacesClient({
                apiKey: this.googleApiKey,
                timeoutMs: this.timeoutMs,
                maxResults: limit,
                languageCode: params.locale
            }, { fetchFn: this.fetchFn, policy: this.policy });
            const places = await googleClient.searchNearby({
                lat: params.lat,
                lng: params.lng,
                radiusMeters: params.radiusMeters,
                includedTypes: ["movie_theater"],
                openNow: params.openNow,
                maxResultCount: limit
            }, { signal: ctx?.signal });
            return validatePlanArray(places.map((place) => this.googleToPlan(place)).filter((plan) => plan !== null));
        }
        if (this.yelpApiKey) {
            const yelpClient = new YelpClient({
                apiKey: this.yelpApiKey,
                timeoutMs: this.timeoutMs,
                limit,
                locale: params.locale
            }, { fetchFn: this.fetchFn, policy: this.policy });
            const response = await yelpClient.search({
                lat: params.lat,
                lng: params.lng,
                radiusMeters: params.radiusMeters,
                categories: ["movietheaters"],
                openNow: params.openNow,
                limit
            }, { signal: ctx?.signal });
            return validatePlanArray(response.businesses.map((business) => this.yelpToPlan(business, params.openNow)).filter((plan) => plan !== null));
        }
        return [];
    }
    googleToPlan(place) {
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
                mapsLink: normalizeHttpUrl(place.googleMapsUri) ?? buildMapsLink(lat, lng, title),
                websiteLink: normalizeHttpUrl(place.websiteUri),
                callLink: normalizeTelUrl(place.internationalPhoneNumber)
            },
            metadata: {
                kind: "theater",
                providerTypes: place.types,
                google: {
                    id: place.id,
                    photoRefs: place.photos?.map((photo) => photo.name).filter((name) => typeof name === "string")
                }
            }
        };
    }
    yelpToPlan(business, requestedOpenNow) {
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
                mapsLink: buildMapsLink(lat, lng, title),
                websiteLink: normalizeHttpUrl(business.url),
                callLink: normalizeTelUrl(business.display_phone ?? business.phone)
            },
            metadata: {
                kind: "theater",
                yelp: {
                    categories: business.categories?.map((category) => category.alias).filter((alias) => typeof alias === "string")
                }
            }
        };
    }
}
