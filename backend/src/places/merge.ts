import { resolveCanonicalCategory } from "./categoryNormalization.js";
import { buildSlug, geohashLite, stableHash } from "./normalization.js";
import type {
  CanonicalPhoto,
  CanonicalPlace,
  MatchResult,
  MergeSummary,
  NormalizedProviderPlace,
  PlaceDescriptionCandidate,
  PlaceFieldAttribution,
  PlaceSourceRecord
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function chooseString(existing: string | undefined, incoming: string | undefined): string | undefined {
  if (!incoming) {
    return existing;
  }
  if (!existing) {
    return incoming;
  }
  return incoming.length > existing.length ? incoming : existing;
}

function buildPhoto(sourceRecordId: string, provider: string, photo: NormalizedProviderPlace["photos"][number]): CanonicalPhoto {
  return {
    canonicalPhotoId: stableHash([provider, photo.providerPhotoRef, photo.url]).slice(0, 16),
    provider,
    providerPhotoRef: photo.providerPhotoRef,
    url: photo.url,
    width: photo.width,
    height: photo.height,
    attributionText: photo.attributionText,
    sourceRecordId,
    qualityScore: (photo.width ?? 0) * (photo.height ?? 0)
  };
}

function dedupePhotos(photos: CanonicalPhoto[]): CanonicalPhoto[] {
  const seen = new Map<string, CanonicalPhoto>();
  for (const photo of photos) {
    const key = `${photo.providerPhotoRef ?? ""}|${photo.url ?? ""}`;
    const existing = seen.get(key);
    if (!existing || existing.qualityScore < photo.qualityScore) {
      seen.set(key, photo);
    }
  }
  return [...seen.values()].sort((a, b) => b.qualityScore - a.qualityScore);
}

function addFieldAttribution(
  current: PlaceFieldAttribution[],
  field: string,
  sourceRecord: PlaceSourceRecord,
  winningValue: unknown,
  confidence: number,
  reason: string,
  competingValues: Array<{ provider: string; sourceRecordId: string; value: unknown }> = []
): PlaceFieldAttribution[] {
  const next = current.filter((entry) => entry.field !== field);
  next.push({
    field,
    winningProvider: sourceRecord.provider,
    winningSourceRecordId: sourceRecord.sourceRecordId,
    winningValue,
    competingValues,
    confidence,
    lastConfirmedAt: nowIso(),
    reason
  });
  return next;
}

function calculateCompleteness(place: CanonicalPlace): number {
  const checks = [
    Boolean(place.primaryDisplayName),
    Boolean(place.formattedAddress || place.address1),
    Boolean(place.phone),
    Boolean(place.websiteUrl),
    place.photoGallery.length > 0,
    Boolean(place.shortDescription),
    Object.keys(place.normalizedHours).length > 0,
    place.providerCategories.length > 0
  ];
  return checks.filter(Boolean).length / checks.length;
}

export function mergeIntoCanonicalPlace(params: {
  existingPlace?: CanonicalPlace;
  match: MatchResult;
  normalized: NormalizedProviderPlace;
  sourceRecord: PlaceSourceRecord;
}): { place: CanonicalPlace; summary: MergeSummary } {
  const { existingPlace, normalized, sourceRecord } = params;
  const timestamp = nowIso();
  const category = resolveCanonicalCategory(normalized.providerCategories, normalized.name);

  const descriptionCandidate: PlaceDescriptionCandidate | undefined = normalized.descriptionSnippet
    ? {
        id: stableHash([sourceRecord.sourceRecordId, normalized.descriptionSnippet]).slice(0, 12),
        text: normalized.descriptionSnippet,
        sourceType: "provider",
        provider: normalized.provider,
        sourceRecordId: sourceRecord.sourceRecordId,
        attribution: normalized.provider,
        createdAt: timestamp
      }
    : undefined;

  const incomingPhotos = normalized.photos.map((photo) => buildPhoto(sourceRecord.sourceRecordId, normalized.provider, photo));

  let place: CanonicalPlace;
  let changedFields: string[] = [];

  if (!existingPlace) {
    const canonicalPlaceId = `plc_${stableHash([normalized.provider, normalized.providerPlaceId]).slice(0, 16)}`;
    const gallery = dedupePhotos(incomingPhotos);
    place = {
      canonicalPlaceId,
      slug: buildSlug(normalized.name, canonicalPlaceId),
      status: "active",
      primaryDisplayName: normalized.name,
      alternateNames: normalized.aliases,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      geohash: geohashLite(normalized.latitude, normalized.longitude),
      formattedAddress: normalized.formattedAddress,
      address1: normalized.address1,
      address2: normalized.address2,
      locality: normalized.locality,
      region: normalized.region,
      postalCode: normalized.postalCode,
      countryCode: normalized.countryCode,
      neighborhood: normalized.neighborhood,
      canonicalCategory: category.canonicalCategory,
      canonicalSubcategory: category.canonicalSubcategory,
      providerCategories: [...new Set(normalized.providerCategories)],
      tags: [...new Set([...normalized.tags, ...category.tags])],
      cuisineTags: [],
      vibeTags: [],
      phone: normalized.phone,
      websiteUrl: normalized.websiteUrl,
      reservationUrl: normalized.reservationUrl,
      menuUrl: normalized.menuUrl,
      orderingUrl: normalized.orderingUrl,
      bookingUrl: normalized.bookingUrl,
      socialLinks: normalized.socialLinks,
      shortDescription: normalized.descriptionSnippet,
      longDescription: normalized.descriptionSnippet,
      descriptionSourceType: descriptionCandidate?.sourceType,
      descriptionSourceAttribution: descriptionCandidate?.attribution,
      aiGeneratedDescription: false,
      editorialDescription: false,
      descriptionCandidates: descriptionCandidate ? [descriptionCandidate] : [],
      primaryPhoto: gallery[0],
      photoGallery: gallery,
      providerPhotoRefs: incomingPhotos
        .filter((photo) => photo.providerPhotoRef)
        .map((photo) => ({ provider: photo.provider, providerPhotoRef: photo.providerPhotoRef ?? "", sourceRecordId: photo.sourceRecordId })),
      timezone: normalized.timezone,
      openNow: normalized.openNow,
      normalizedHours: normalized.normalizedHours,
      rawHoursText: normalized.rawHoursText,
      dataCompletenessScore: 0,
      mergeConfidence: params.match.score,
      categoryConfidence: category.confidence,
      geocodeConfidence: 0.85,
      permanentlyClosed: normalized.permanentlyClosed,
      temporarilyClosed: normalized.temporarilyClosed,
      sourceLinks: [
        {
          provider: normalized.provider,
          providerPlaceId: normalized.providerPlaceId,
          sourceRecordId: sourceRecord.sourceRecordId,
          sourceUrl: normalized.sourceUrl,
          lastSeenAt: timestamp
        }
      ],
      sourceRecordIds: [sourceRecord.sourceRecordId],
      fieldAttribution: [],
      manualOverrides: {},
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
      lastNormalizedAt: timestamp,
      lastMergedAt: timestamp
    };
    changedFields = ["created"];
  } else {
    place = { ...existingPlace };
    place.alternateNames = [...new Set([...existingPlace.alternateNames, normalized.name, ...normalized.aliases])].filter(
      (name) => name !== place.primaryDisplayName
    );
    place.latitude = (place.latitude + normalized.latitude) / 2;
    place.longitude = (place.longitude + normalized.longitude) / 2;
    place.geohash = geohashLite(place.latitude, place.longitude);
    place.formattedAddress = chooseString(place.formattedAddress, normalized.formattedAddress);
    place.address1 = chooseString(place.address1, normalized.address1);
    place.locality = chooseString(place.locality, normalized.locality);
    place.region = chooseString(place.region, normalized.region);
    place.postalCode = chooseString(place.postalCode, normalized.postalCode);
    place.countryCode = chooseString(place.countryCode, normalized.countryCode);
    place.providerCategories = [...new Set([...place.providerCategories, ...normalized.providerCategories])];
    if (!place.manualOverrides.canonicalCategory) {
      place.canonicalCategory = category.canonicalCategory;
      place.canonicalSubcategory = category.canonicalSubcategory;
    }
    place.tags = [...new Set([...place.tags, ...normalized.tags, ...category.tags])];
    place.phone = chooseString(place.phone, normalized.phone);
    place.websiteUrl = chooseString(place.websiteUrl, normalized.websiteUrl);
    place.reservationUrl = chooseString(place.reservationUrl, normalized.reservationUrl);
    place.menuUrl = chooseString(place.menuUrl, normalized.menuUrl);
    place.orderingUrl = chooseString(place.orderingUrl, normalized.orderingUrl);
    place.bookingUrl = chooseString(place.bookingUrl, normalized.bookingUrl);
    place.socialLinks = { ...place.socialLinks, ...normalized.socialLinks };
    if (descriptionCandidate) {
      place.descriptionCandidates = [...place.descriptionCandidates, descriptionCandidate];
      if (!place.manualOverrides.descriptionCandidateId) {
        place.shortDescription = chooseString(place.shortDescription, descriptionCandidate.text);
        place.longDescription = chooseString(place.longDescription, descriptionCandidate.text);
        place.descriptionSourceType = descriptionCandidate.sourceType;
        place.descriptionSourceAttribution = descriptionCandidate.attribution;
      }
    }

    place.photoGallery = dedupePhotos([...place.photoGallery, ...incomingPhotos]);
    if (!place.manualOverrides.primaryPhotoId) {
      place.primaryPhoto = place.photoGallery[0];
    }
    place.providerPhotoRefs = dedupePhotos([
      ...place.providerPhotoRefs.map((entry) => ({
        canonicalPhotoId: `${entry.provider}:${entry.providerPhotoRef}`,
        provider: entry.provider,
        providerPhotoRef: entry.providerPhotoRef,
        sourceRecordId: entry.sourceRecordId,
        qualityScore: 0
      })),
      ...incomingPhotos
    ])
      .filter((entry) => entry.providerPhotoRef)
      .map((entry) => ({ provider: entry.provider, providerPhotoRef: entry.providerPhotoRef ?? "", sourceRecordId: entry.sourceRecordId }));

    place.timezone = chooseString(place.timezone, normalized.timezone);
    place.openNow = normalized.openNow ?? place.openNow;
    place.normalizedHours = Object.keys(normalized.normalizedHours).length > 0 ? normalized.normalizedHours : place.normalizedHours;
    place.rawHoursText = [...new Set([...place.rawHoursText, ...normalized.rawHoursText])];
    place.permanentlyClosed = place.permanentlyClosed && normalized.permanentlyClosed;
    place.temporarilyClosed = place.temporarilyClosed || normalized.temporarilyClosed;
    if (!place.sourceLinks.some((link) => link.provider === normalized.provider && link.providerPlaceId === normalized.providerPlaceId)) {
      place.sourceLinks.push({
        provider: normalized.provider,
        providerPlaceId: normalized.providerPlaceId,
        sourceRecordId: sourceRecord.sourceRecordId,
        sourceUrl: normalized.sourceUrl,
        lastSeenAt: timestamp
      });
    }
    place.sourceRecordIds = [...new Set([...place.sourceRecordIds, sourceRecord.sourceRecordId])];
    place.lastSeenAt = timestamp;
    place.lastNormalizedAt = timestamp;
    place.lastMergedAt = timestamp;
    changedFields = ["merged"];
  }

  place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "name", sourceRecord, normalized.name, 0.9, "latest_high_confidence");
  place.fieldAttribution = addFieldAttribution(
    place.fieldAttribution,
    "address",
    sourceRecord,
    place.formattedAddress,
    0.8,
    "most_complete_address"
  );
  place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "phone", sourceRecord, place.phone, 0.75, "normalized_phone_match");
  place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "website", sourceRecord, place.websiteUrl, 0.75, "normalized_url_match");
  place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "hours", sourceRecord, place.rawHoursText, 0.65, "latest_hours_payload");
  place.fieldAttribution = addFieldAttribution(
    place.fieldAttribution,
    "category",
    sourceRecord,
    `${place.canonicalCategory}:${place.canonicalSubcategory ?? ""}`,
    category.confidence,
    category.reasoning
  );
  place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "primary_photo", sourceRecord, place.primaryPhoto?.canonicalPhotoId, 0.7, "highest_quality_photo");
  place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "description", sourceRecord, place.shortDescription, 0.72, "description_priority");

  place.dataCompletenessScore = calculateCompleteness(place);

  return {
    place,
    summary: {
      changedFields,
      created: !existingPlace,
      updated: Boolean(existingPlace),
      unchanged: false
    }
  };
}
