import { resolveCanonicalCategory } from "./categoryNormalization.js";
import { enrichPlaceDescriptions } from "./descriptionEnrichment.js";
import { buildSlug, geohashLite, stableHash } from "./normalization.js";
import { dedupeAndRankPhotos, normalizeProviderPhoto } from "./photoGallery.js";
function nowIso() {
    return new Date().toISOString();
}
function chooseString(existing, incoming) {
    if (!incoming) {
        return existing;
    }
    if (!existing) {
        return incoming;
    }
    return incoming.length > existing.length ? incoming : existing;
}
function addFieldAttribution(current, field, sourceRecord, winningValue, confidence, reason, competingValues = []) {
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
function calculateCompleteness(place) {
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
export function mergeIntoCanonicalPlace(params) {
    const { existingPlace, normalized, sourceRecord } = params;
    const timestamp = nowIso();
    const category = resolveCanonicalCategory(normalized.providerCategories, normalized.name);
    const incomingPhotos = normalized.photos.map((photo, index) => normalizeProviderPhoto({
        sourceRecordId: sourceRecord.sourceRecordId,
        provider: normalized.provider,
        photo,
        index,
        fetchedAt: sourceRecord.fetchTimestamp
    }));
    const enrichedDescription = enrichPlaceDescriptions({
        existingPlace,
        normalized,
        sourceRecord,
        canonicalCategory: category.canonicalCategory
    });
    let place;
    let changedFields = [];
    if (!existingPlace) {
        const canonicalPlaceId = `plc_${stableHash([normalized.provider, normalized.providerPlaceId]).slice(0, 16)}`;
        const gallery = dedupeAndRankPhotos(incomingPhotos);
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
            shortDescription: enrichedDescription.shortDescription,
            longDescription: enrichedDescription.longDescription,
            descriptionStatus: enrichedDescription.descriptionStatus,
            descriptionSourceType: enrichedDescription.descriptionSourceType,
            descriptionSourceProvider: enrichedDescription.descriptionSourceProvider,
            descriptionSourceAttribution: enrichedDescription.descriptionSourceAttribution,
            descriptionConfidence: enrichedDescription.descriptionConfidence,
            descriptionGeneratedAt: enrichedDescription.descriptionGeneratedAt,
            descriptionVersion: enrichedDescription.descriptionVersion,
            descriptionLanguage: enrichedDescription.descriptionLanguage,
            descriptionGenerationMethod: enrichedDescription.descriptionGenerationMethod,
            alternateDescriptions: enrichedDescription.alternates,
            descriptionProvenance: enrichedDescription.candidates.map((candidate) => ({
                candidateId: candidate.id,
                provider: candidate.provider,
                sourceRecordId: candidate.sourceRecordId,
                sourceType: candidate.sourceType
            })),
            aiGeneratedDescription: false,
            editorialDescription: enrichedDescription.descriptionSourceType === "provider_editorial",
            descriptionCandidates: enrichedDescription.candidates,
            primaryPhoto: gallery[0] ? { ...gallery[0], placeId: canonicalPlaceId, isPrimary: true, sortOrder: 0 } : undefined,
            photoGallery: gallery.map((photo, index) => ({ ...photo, placeId: canonicalPlaceId, isPrimary: index === 0, sortOrder: index })),
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
    }
    else {
        place = { ...existingPlace };
        place.alternateNames = [...new Set([...existingPlace.alternateNames, normalized.name, ...normalized.aliases])].filter((name) => name !== place.primaryDisplayName);
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
        }
        if (!place.manualOverrides.canonicalSubcategory) {
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
        place.descriptionCandidates = [...place.descriptionCandidates, ...enrichedDescription.candidates];
        place.alternateDescriptions = [...place.alternateDescriptions, ...enrichedDescription.alternates];
        place.descriptionProvenance = [
            ...place.descriptionProvenance,
            ...enrichedDescription.candidates.map((candidate) => ({
                candidateId: candidate.id,
                provider: candidate.provider,
                sourceRecordId: candidate.sourceRecordId,
                sourceType: candidate.sourceType
            }))
        ];
        if (!place.manualOverrides.descriptionCandidateId && enrichedDescription.shortDescription) {
            const shouldUpgrade = enrichedDescription.descriptionConfidence >= (place.descriptionConfidence ?? 0);
            if (shouldUpgrade) {
                place.shortDescription = enrichedDescription.shortDescription;
                place.longDescription = enrichedDescription.longDescription;
                place.descriptionStatus = enrichedDescription.descriptionStatus;
                place.descriptionSourceType = enrichedDescription.descriptionSourceType;
                place.descriptionSourceProvider = enrichedDescription.descriptionSourceProvider;
                place.descriptionSourceAttribution = enrichedDescription.descriptionSourceAttribution;
                place.descriptionConfidence = enrichedDescription.descriptionConfidence;
                place.descriptionGeneratedAt = enrichedDescription.descriptionGeneratedAt;
                place.descriptionVersion = enrichedDescription.descriptionVersion;
                place.descriptionLanguage = enrichedDescription.descriptionLanguage;
                place.descriptionGenerationMethod = enrichedDescription.descriptionGenerationMethod;
                place.editorialDescription = enrichedDescription.descriptionSourceType === "provider_editorial";
            }
        }
        const previousPrimaryId = place.primaryPhoto?.canonicalPhotoId;
        place.photoGallery = dedupeAndRankPhotos([...place.photoGallery, ...incomingPhotos]).map((photo) => ({ ...photo, placeId: place.canonicalPlaceId }));
        if (!place.manualOverrides.primaryPhotoId) {
            const preferredPrimary = previousPrimaryId
                ? place.photoGallery.find((photo) => photo.canonicalPhotoId === previousPrimaryId)
                : undefined;
            place.primaryPhoto = preferredPrimary ?? place.photoGallery[0];
            if (place.primaryPhoto) {
                place.photoGallery = [
                    { ...place.primaryPhoto, isPrimary: true, sortOrder: 0 },
                    ...place.photoGallery
                        .filter((photo) => photo.canonicalPhotoId !== place.primaryPhoto?.canonicalPhotoId)
                        .map((photo, index) => ({ ...photo, isPrimary: false, sortOrder: index + 1 }))
                ];
            }
        }
        place.providerPhotoRefs = dedupeAndRankPhotos([
            ...place.providerPhotoRefs.map((entry) => ({
                canonicalPhotoId: `${entry.provider}:${entry.providerPhotoRef}`,
                provider: entry.provider,
                sourceProvider: entry.provider,
                sourceType: "provider",
                providerPhotoRef: entry.providerPhotoRef,
                sourcePhotoId: entry.providerPhotoRef,
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
    place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "address", sourceRecord, place.formattedAddress, 0.8, "most_complete_address");
    place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "phone", sourceRecord, place.phone, 0.75, "normalized_phone_match");
    place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "website", sourceRecord, place.websiteUrl, 0.75, "normalized_url_match");
    place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "hours", sourceRecord, place.rawHoursText, 0.65, "latest_hours_payload");
    place.fieldAttribution = addFieldAttribution(place.fieldAttribution, "category", sourceRecord, `${place.canonicalCategory}:${place.canonicalSubcategory ?? ""}`, category.confidence, category.reasoning);
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
