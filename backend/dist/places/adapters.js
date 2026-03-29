import { extractWebsiteDomain, normalizeAddressComparison, normalizeComparisonName, normalizeDisplayName, normalizePhone, normalizeUrl } from "./normalization.js";
function toNormalized(raw) {
    return {
        provider: raw.provider,
        providerPlaceId: raw.providerPlaceId,
        sourceUrl: normalizeUrl(raw.sourceUrl),
        name: normalizeDisplayName(raw.name),
        aliases: (raw.aliases ?? []).map((item) => normalizeDisplayName(item)).filter(Boolean),
        normalizedName: normalizeComparisonName(raw.name),
        latitude: raw.latitude,
        longitude: raw.longitude,
        formattedAddress: raw.formattedAddress,
        address1: raw.address1,
        address2: raw.address2,
        locality: raw.locality,
        region: raw.region,
        postalCode: raw.postalCode,
        countryCode: raw.countryCode?.toUpperCase(),
        neighborhood: raw.neighborhood,
        providerCategories: raw.providerCategories ?? [],
        tags: raw.tags ?? [],
        phone: normalizePhone(raw.phone),
        websiteUrl: normalizeUrl(raw.websiteUrl),
        reservationUrl: normalizeUrl(raw.reservationUrl),
        menuUrl: normalizeUrl(raw.menuUrl),
        orderingUrl: normalizeUrl(raw.orderingUrl),
        bookingUrl: normalizeUrl(raw.bookingUrl),
        socialLinks: Object.fromEntries(Object.entries(raw.socialLinks ?? {}).map(([key, value]) => [key, normalizeUrl(value)]).filter((entry) => Boolean(entry[1]))),
        rating: raw.rating,
        ratingCount: raw.ratingCount,
        priceLevel: raw.priceLevel,
        timezone: raw.timezone,
        openNow: raw.openNow,
        normalizedHours: raw.normalizedHours ?? {},
        rawHoursText: raw.rawHoursText ?? [],
        photos: raw.photos ?? [],
        descriptionSnippet: raw.descriptionSnippet,
        permanentlyClosed: raw.permanentlyClosed ?? false,
        temporarilyClosed: raw.temporarilyClosed ?? false,
        comparisonAddress: normalizeAddressComparison(raw),
        comparisonPhone: normalizePhone(raw.phone),
        comparisonWebsiteDomain: extractWebsiteDomain(raw.websiteUrl),
        raw: raw.raw
    };
}
export const googlePlacesAdapter = {
    provider: "google_places",
    normalizeProviderPlace(rawPayload, ctx) {
        const raw = rawPayload;
        const providerPlaceId = raw.id ?? "unknown";
        return toNormalized({
            provider: "google_places",
            providerPlaceId,
            name: raw.displayName?.text ?? providerPlaceId,
            latitude: raw.location?.latitude ?? 0,
            longitude: raw.location?.longitude ?? 0,
            formattedAddress: raw.formattedAddress,
            providerCategories: raw.types ?? [],
            phone: raw.nationalPhoneNumber,
            websiteUrl: raw.websiteUri,
            rawHoursText: raw.regularOpeningHours?.weekdayDescriptions ?? [],
            photos: (raw.photos ?? []).map((photo, index) => ({
                providerPhotoRef: photo.name,
                sourcePhotoId: photo.name,
                width: photo.widthPx,
                height: photo.heightPx,
                attributionText: photo.authorAttributions?.[0]?.displayName,
                isPrimary: index === 0
            })),
            descriptionSnippet: raw.editorialSummary?.text,
            permanentlyClosed: raw.businessStatus === "CLOSED_PERMANENTLY",
            sourceUrl: ctx.sourceUrl,
            raw
        });
    }
};
export const foursquareAdapter = {
    provider: "foursquare",
    normalizeProviderPlace(rawPayload, ctx) {
        const raw = rawPayload;
        const providerPlaceId = raw.fsq_id ?? "unknown";
        return toNormalized({
            provider: "foursquare",
            providerPlaceId,
            name: raw.name ?? providerPlaceId,
            latitude: raw.geocodes?.main?.latitude ?? 0,
            longitude: raw.geocodes?.main?.longitude ?? 0,
            formattedAddress: raw.location?.formatted_address,
            address1: raw.location?.address,
            locality: raw.location?.locality,
            region: raw.location?.region,
            postalCode: raw.location?.postcode,
            countryCode: raw.location?.country,
            providerCategories: (raw.categories ?? []).map((entry) => entry.name ?? "").filter(Boolean),
            phone: raw.tel,
            websiteUrl: raw.website,
            rawHoursText: raw.hours?.display ? [raw.hours.display] : [],
            descriptionSnippet: raw.description,
            permanentlyClosed: raw.closed_bucket === "very_likely",
            photos: (raw.photos ?? []).map((photo, index) => ({
                providerPhotoRef: photo.id,
                sourcePhotoId: photo.id,
                thumbnailUrl: photo.prefix && photo.suffix ? `${photo.prefix}300x300${photo.suffix}` : undefined,
                mediumUrl: photo.prefix && photo.suffix ? `${photo.prefix}800x600${photo.suffix}` : undefined,
                largeUrl: photo.prefix && photo.suffix ? `${photo.prefix}1200x900${photo.suffix}` : undefined,
                fullUrl: photo.prefix && photo.suffix ? `${photo.prefix}original${photo.suffix}` : undefined,
                url: photo.prefix && photo.suffix ? `${photo.prefix}800x600${photo.suffix}` : undefined,
                width: photo.width,
                height: photo.height,
                attributionText: photo.credit?.name,
                isPrimary: index === 0
            })),
            sourceUrl: ctx.sourceUrl,
            raw
        });
    }
};
export const genericAdapter = {
    provider: "generic",
    normalizeProviderPlace(rawPayload, ctx) {
        const raw = rawPayload;
        const providerPlaceId = String(raw.providerPlaceId ?? raw.id ?? "unknown");
        return toNormalized({
            provider: String(raw.provider ?? "generic"),
            providerPlaceId,
            name: String(raw.name ?? providerPlaceId),
            latitude: Number(raw.latitude ?? 0),
            longitude: Number(raw.longitude ?? 0),
            formattedAddress: raw.formattedAddress ? String(raw.formattedAddress) : undefined,
            providerCategories: Array.isArray(raw.providerCategories) ? raw.providerCategories.map((item) => String(item)) : [],
            phone: raw.phone ? String(raw.phone) : undefined,
            websiteUrl: raw.websiteUrl ? String(raw.websiteUrl) : undefined,
            sourceUrl: ctx.sourceUrl,
            raw
        });
    }
};
const ADAPTERS = new Map([
    [googlePlacesAdapter.provider, googlePlacesAdapter],
    [foursquareAdapter.provider, foursquareAdapter]
]);
export function getProviderAdapter(provider) {
    return ADAPTERS.get(provider) ?? genericAdapter;
}
