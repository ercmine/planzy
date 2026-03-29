function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
export function computeCanonicalPlaceCompleteness(place, sourceRecord) {
    const breakdown = {
        hasName: place.primaryName ? 0.16 : 0,
        hasCoordinates: Number.isFinite(place.latitude) && Number.isFinite(place.longitude) ? 0.14 : 0,
        hasAddress: place.addressLine1 || place.city || place.countryCode ? 0.11 : 0,
        hasDescription: place.description ? 0.08 : 0,
        hasPhone: place.phoneE164 ? 0.06 : 0,
        hasWebsite: place.websiteUrl ? 0.08 : 0,
        hasSourceAttribution: sourceRecord ? 0.08 : 0,
        hasRawTags: sourceRecord && Object.keys(sourceRecord.rawTags).length > 0 ? 0.1 : 0,
        hasSourceFreshness: place.sourceFreshnessAt ? 0.08 : 0,
        visibilityAndStatus: place.status === "ACTIVE" && place.visibilityStatus === "PUBLIC" ? 0.11 : 0
    };
    const score = clamp01(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
    return { score, breakdown };
}
