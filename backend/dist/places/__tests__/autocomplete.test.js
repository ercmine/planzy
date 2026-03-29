import { describe, expect, it } from "vitest";
import { autocompleteCanonicalPlaces } from "../autocomplete.js";
function buildPlace(input) {
    const now = new Date().toISOString();
    return {
        canonicalPlaceId: input.canonicalPlaceId,
        slug: input.canonicalPlaceId,
        status: "active",
        primaryDisplayName: input.primaryDisplayName,
        alternateNames: input.alternateNames ?? [],
        latitude: input.latitude,
        longitude: input.longitude,
        geohash: "",
        locality: input.locality,
        region: input.region,
        canonicalCategory: input.canonicalCategory ?? "cafe",
        providerCategories: [],
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
        dataCompletenessScore: input.dataCompletenessScore ?? 0.9,
        mergeConfidence: 0.8,
        categoryConfidence: 0.8,
        geocodeConfidence: 0.8,
        permanentlyClosed: false,
        temporarilyClosed: false,
        sourceLinks: input.sourceLinks ?? [{ provider: "osm", providerPlaceId: input.canonicalPlaceId, sourceRecordId: "src", lastSeenAt: now }],
        sourceRecordIds: [],
        fieldAttribution: [],
        manualOverrides: {},
        firstSeenAt: now,
        lastSeenAt: now,
        lastNormalizedAt: now,
        lastMergedAt: now
    };
}
describe("autocompleteCanonicalPlaces", () => {
    it("prioritizes exact + nearby matches and returns canonical DTO fields", () => {
        const places = [
            buildPlace({ canonicalPlaceId: "pl_nyc", primaryDisplayName: "Central Park", locality: "New York", region: "NY", latitude: 40.7812, longitude: -73.9665 }),
            buildPlace({ canonicalPlaceId: "pl_sf", primaryDisplayName: "Central Park Cafe", locality: "San Francisco", region: "CA", latitude: 37.78, longitude: -122.41 }),
            buildPlace({ canonicalPlaceId: "pl_alias", primaryDisplayName: "The Met", alternateNames: ["Metropolitan Museum of Art"], locality: "New York", region: "NY", latitude: 40.7794, longitude: -73.9632 })
        ];
        const results = autocompleteCanonicalPlaces(places, { q: "central park", lat: 40.78, lng: -73.97, scope: "local" });
        expect(results[0]?.canonicalPlaceId).toBe("pl_nyc");
        expect(results[0]?.displayName).toBe("Central Park");
        expect(results[0]?.category).toBe("cafe");
        expect(results[0]?.distanceMeters).toBeTypeOf("number");
        expect(results.some((item) => item.canonicalPlaceId === "pl_sf")).toBe(true);
    });
    it("supports alias matching and category filters", () => {
        const places = [
            buildPlace({ canonicalPlaceId: "pl_met", primaryDisplayName: "The Met", alternateNames: ["Metropolitan Museum of Art"], canonicalCategory: "museum", latitude: 40.7794, longitude: -73.9632 }),
            buildPlace({ canonicalPlaceId: "pl_met_cafe", primaryDisplayName: "Met Cafe", canonicalCategory: "cafe", latitude: 40.771, longitude: -73.97 })
        ];
        const results = autocompleteCanonicalPlaces(places, { q: "metropolitan", category: "museum" });
        expect(results).toHaveLength(1);
        expect(results[0]?.canonicalPlaceId).toBe("pl_met");
    });
});
