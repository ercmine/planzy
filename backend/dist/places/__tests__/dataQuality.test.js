import { describe, expect, it } from "vitest";
import { PlaceDataQualityService } from "../dataQuality.js";
function place(overrides) {
    return {
        canonicalPlaceId: "place-1",
        slug: "place-1",
        status: "active",
        primaryDisplayName: "Cafe North",
        alternateNames: [],
        latitude: 37.77,
        longitude: -122.41,
        geohash: "9q8yy",
        canonicalCategory: "restaurant",
        providerCategories: ["coffee_shop"],
        tags: [],
        cuisineTags: [],
        vibeTags: [],
        socialLinks: {},
        descriptionStatus: "empty",
        descriptionConfidence: 0,
        descriptionVersion: 1,
        alternateDescriptions: [],
        descriptionProvenance: [],
        aiGeneratedDescription: false,
        editorialDescription: false,
        descriptionCandidates: [],
        photoGallery: [],
        providerPhotoRefs: [],
        normalizedHours: {},
        rawHoursText: [],
        dataCompletenessScore: 0.2,
        mergeConfidence: 0.8,
        categoryConfidence: 0.2,
        geocodeConfidence: 0.9,
        permanentlyClosed: false,
        temporarilyClosed: false,
        sourceLinks: [{ provider: "foursquare", providerPlaceId: "p1", sourceRecordId: "s1", lastSeenAt: "2025-01-01T00:00:00.000Z" }],
        sourceRecordIds: ["s1"],
        fieldAttribution: [],
        manualOverrides: {},
        firstSeenAt: "2025-01-01T00:00:00.000Z",
        lastSeenAt: "2025-01-01T00:00:00.000Z",
        lastNormalizedAt: "2025-01-01T00:00:00.000Z",
        lastMergedAt: "2025-01-01T00:00:00.000Z",
        ...overrides
    };
}
function source(overrides = {}) {
    return {
        sourceRecordId: "s1",
        provider: "foursquare",
        providerPlaceId: "p1",
        canonicalPlaceId: "place-1",
        rawPayload: {},
        rawPayloadHash: "h1",
        normalizedPayload: {},
        fetchTimestamp: "2025-01-02T00:00:00.000Z",
        sourceConfidence: 0.3,
        version: 1,
        ...overrides
    };
}
describe("PlaceDataQualityService", () => {
    it("detects core quality issue types and supports status transitions", () => {
        const service = new PlaceDataQualityService(undefined, () => new Date("2026-01-20T00:00:00.000Z").getTime());
        const p1 = place({ phone: "+14155550100", websiteUrl: "https://cafenorth.example", locality: "SF" });
        const p2 = place({
            canonicalPlaceId: "place-2",
            slug: "place-2",
            primaryDisplayName: "Cafe North",
            latitude: 37.7701,
            longitude: -122.4101,
            phone: "+14155550100",
            websiteUrl: "https://cafenorth.example",
            locality: "SF",
            canonicalCategory: "fine_dining",
            providerCategories: ["coffee_shop"],
            categoryConfidence: 0.1
        });
        const issues = service.evaluate([p1, p2], [
            source(),
            source({ sourceRecordId: "s1b", canonicalPlaceId: "place-1", providerPlaceId: "p1b" }),
            source({ sourceRecordId: "s1c", canonicalPlaceId: "place-1", providerPlaceId: "p1c" }),
            source({ sourceRecordId: "s2", canonicalPlaceId: "place-2" })
        ]);
        const issueTypes = new Set(issues.map((issue) => issue.issueType));
        expect(issueTypes).toEqual(new Set(["sync_failure", "missing_photos", "blank_description", "category_drift", "stale_record", "duplicate_place"]));
        const duplicate = issues.find((issue) => issue.issueType === "duplicate_place");
        expect(duplicate?.evidence.reasons).toBeDefined();
        const acknowledged = service.updateIssueStatus(issues[0].id, "acknowledged", "admin-1", "investigating");
        expect(acknowledged?.after.status).toBe("acknowledged");
        expect(service.summarize().totalOpen).toBeGreaterThan(0);
    });
});
