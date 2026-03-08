import { describe, expect, it } from "vitest";

import { enrichPlaceDescriptions } from "../descriptionEnrichment.js";
import { InMemoryPlaceStore, PlaceNormalizationService } from "../index.js";

describe("description enrichment", () => {
  it("prefers trusted provider editorial text", () => {
    const store = new InMemoryPlaceStore();
    const service = new PlaceNormalizationService(store);

    const result = service.importProviderPlace({
      provider: "google_places",
      rawPayload: {
        id: "desc-1",
        displayName: { text: "Cafe Sun" },
        location: { latitude: 44.98, longitude: -93.26 },
        types: ["coffee_shop"],
        editorialSummary: { text: "Neighborhood cafe serving coffee and pastries with indoor seating." }
      }
    });

    const place = service.getCanonicalPlace(result.canonicalPlaceId);
    expect(place?.descriptionStatus).toBe("provider");
    expect(place?.descriptionSourceType).toBe("provider_editorial");
    expect(place?.descriptionConfidence).toBeGreaterThan(0.9);
    expect(place?.shortDescription).toContain("Neighborhood cafe");
  });

  it("builds structured fallback when provider text is missing", () => {
    const enriched = enrichPlaceDescriptions({
      normalized: {
        provider: "foursquare",
        providerPlaceId: "f-5",
        name: "North Loop Fitness",
        aliases: [],
        normalizedName: "north loop fitness",
        latitude: 44.98,
        longitude: -93.27,
        locality: "Minneapolis",
        region: "MN",
        providerCategories: ["gym"],
        tags: [],
        socialLinks: {},
        normalizedHours: {},
        rawHoursText: ["Mon-Fri 6am-10pm"],
        photos: [{ providerPhotoRef: "a" }],
        permanentlyClosed: false,
        temporarilyClosed: false,
        comparisonAddress: "",
        raw: {}
      },
      sourceRecord: {
        sourceRecordId: "src-1",
        provider: "foursquare",
        providerPlaceId: "f-5",
        rawPayload: {},
        rawPayloadHash: "hash",
        normalizedPayload: {} as never,
        fetchTimestamp: new Date().toISOString(),
        sourceConfidence: 0.8,
        version: 1
      },
      canonicalCategory: "fitness_gym"
    });

    expect(enriched.descriptionStatus).toBe("synthesized");
    expect(enriched.longDescription).toContain("gym");
    expect(enriched.longDescription).toContain("Minneapolis");
    expect(enriched.descriptionConfidence).toBeGreaterThan(0.6);
  });

  it("does not overwrite high confidence provider description with weaker text", () => {
    const store = new InMemoryPlaceStore();
    const service = new PlaceNormalizationService(store);

    const first = service.importProviderPlace({
      provider: "google_places",
      rawPayload: {
        id: "stable-1",
        displayName: { text: "Luna Cafe" },
        location: { latitude: 44.98, longitude: -93.2 },
        types: ["cafe"],
        editorialSummary: { text: "Cozy cafe with espresso drinks and baked goods." }
      }
    });

    service.importProviderPlace({
      provider: "generic",
      rawPayload: {
        providerPlaceId: "stable-1b",
        name: "Luna Cafe",
        latitude: 44.9801,
        longitude: -93.2001,
        providerCategories: ["cafe"]
      }
    });

    const place = service.getCanonicalPlace(first.canonicalPlaceId);
    expect(place?.descriptionSourceType).toBe("provider_editorial");
    expect(place?.longDescription).toContain("espresso");
  });
});
