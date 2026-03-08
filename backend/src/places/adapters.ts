import type { NormalizedProviderPlace, ProviderAdapter } from "./types.js";
import {
  extractWebsiteDomain,
  normalizeAddressComparison,
  normalizeComparisonName,
  normalizeDisplayName,
  normalizePhone,
  normalizeUrl
} from "./normalization.js";

function toNormalized(raw: {
  provider: string;
  providerPlaceId: string;
  name: string;
  aliases?: string[];
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  address1?: string;
  address2?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  neighborhood?: string;
  providerCategories?: string[];
  tags?: string[];
  phone?: string;
  websiteUrl?: string;
  reservationUrl?: string;
  menuUrl?: string;
  orderingUrl?: string;
  bookingUrl?: string;
  socialLinks?: Record<string, string>;
  rating?: number;
  ratingCount?: number;
  priceLevel?: number;
  timezone?: string;
  openNow?: boolean;
  normalizedHours?: Record<string, Array<{ opens: string; closes: string }>>;
  rawHoursText?: string[];
  photos?: NormalizedProviderPlace["photos"];
  descriptionSnippet?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  sourceUrl?: string;
  raw: unknown;
}): NormalizedProviderPlace {
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
    socialLinks: Object.fromEntries(
      Object.entries(raw.socialLinks ?? {}).map(([key, value]) => [key, normalizeUrl(value)]).filter((entry) => Boolean(entry[1]))
    ),
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

export const googlePlacesAdapter: ProviderAdapter = {
  provider: "google_places",
  normalizeProviderPlace(rawPayload, ctx) {
    const raw = rawPayload as {
      id?: string;
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
      formattedAddress?: string;
      types?: string[];
      nationalPhoneNumber?: string;
      websiteUri?: string;
      regularOpeningHours?: { weekdayDescriptions?: string[] };
      photos?: Array<{ name?: string; widthPx?: number; heightPx?: number; authorAttributions?: Array<{ displayName?: string }> }>;
      editorialSummary?: { text?: string };
      businessStatus?: string;
    };

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
      photos: (raw.photos ?? []).map((photo) => ({
        providerPhotoRef: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
        attributionText: photo.authorAttributions?.[0]?.displayName
      })),
      descriptionSnippet: raw.editorialSummary?.text,
      permanentlyClosed: raw.businessStatus === "CLOSED_PERMANENTLY",
      sourceUrl: ctx.sourceUrl,
      raw
    });
  }
};

export const foursquareAdapter: ProviderAdapter = {
  provider: "foursquare",
  normalizeProviderPlace(rawPayload, ctx) {
    const raw = rawPayload as {
      fsq_id?: string;
      name?: string;
      geocodes?: { main?: { latitude?: number; longitude?: number } };
      location?: {
        formatted_address?: string;
        address?: string;
        locality?: string;
        region?: string;
        postcode?: string;
        country?: string;
      };
      categories?: Array<{ name?: string }>;
      tel?: string;
      website?: string;
      hours?: { display?: string };
      closed_bucket?: string;
      description?: string;
      photos?: Array<{ id?: string; prefix?: string; suffix?: string; width?: number; height?: number; credit?: { name?: string } }>;
    };

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
      photos: (raw.photos ?? []).map((photo) => ({
        providerPhotoRef: photo.id,
        url: photo.prefix && photo.suffix ? `${photo.prefix}original${photo.suffix}` : undefined,
        width: photo.width,
        height: photo.height,
        attributionText: photo.credit?.name
      })),
      sourceUrl: ctx.sourceUrl,
      raw
    });
  }
};

export const genericAdapter: ProviderAdapter = {
  provider: "generic",
  normalizeProviderPlace(rawPayload, ctx) {
    const raw = rawPayload as Record<string, unknown>;
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

const ADAPTERS = new Map<string, ProviderAdapter>([
  [googlePlacesAdapter.provider, googlePlacesAdapter],
  [foursquareAdapter.provider, foursquareAdapter]
]);

export function getProviderAdapter(provider: string): ProviderAdapter {
  return ADAPTERS.get(provider) ?? genericAdapter;
}
