import { describe, expect, it } from "vitest";

import { InMemoryPlaceStore } from "../memoryStore.js";
import { MultiSourcePlaceIngestionService, type IngestionConfig, type PlaceQueryContext, type ProviderPlaceClient } from "../ingestion.js";
import { PlaceNormalizationService } from "../service.js";

function buildConfig(): IngestionConfig {
  return {
    priorities: {
      text_search: ["foursquare", "google_places"],
      category_search: ["foursquare", "google_places"],
      nearby: ["foursquare", "google_places"],
      map_viewport: ["google_places", "foursquare"],
      detail: ["google_places", "foursquare"],
      next_page: ["foursquare", "google_places"],
      hydrate: ["google_places", "foursquare"]
    },
    fallbackMinResultsByIntent: {
      text_search: 2,
      category_search: 2,
      nearby: 2
    },
    maxExpensiveProviderCallsPerRequest: 1,
    maxEnrichmentCallsPerRequest: 2,
    ttl: {
      searchMs: 60_000,
      detailMs: 120_000,
      canonicalMs: 180_000,
      failureMs: 15_000
    }
  };
}

function providerWith(records: Array<{ id: string; name: string }>, options?: { fail?: boolean; nextToken?: string }): ProviderPlaceClient {
  return {
    metadata: {
      provider: "foursquare",
      costTier: "low",
      priority: 1,
      enabled: true,
      capabilities: {
        supportsSearch: true,
        supportsNearby: true,
        supportsPhotos: true,
        supportsHours: true,
        supportsDescriptions: true,
        supportsReviews: true,
        supportsCategorySearch: true,
        supportsAutocomplete: false,
        supportsRichDetails: true
      }
    },
    async searchPlaces() {
      if (options?.fail) {
        throw new Error("timeout");
      }
      return {
        records: records.map((item) => ({
          provider: "foursquare",
          providerPlaceId: item.id,
          rawPayload: {
            fsq_id: item.id,
            name: item.name,
            geocodes: { main: { latitude: 37.77, longitude: -122.41 } },
            categories: [{ name: "Coffee Shop" }]
          }
        })),
        nextPageToken: options?.nextToken
      };
    },
    async getPlaceDetails(req) {
      return {
        provider: "foursquare",
        providerPlaceId: req.providerPlaceId,
        rawPayload: {
          fsq_id: req.providerPlaceId,
          name: "Detail Place",
          geocodes: { main: { latitude: 37.77, longitude: -122.41 } },
          categories: [{ name: "Coffee Shop" }],
          description: "Long detail",
          photos: [{ id: "a", prefix: "https://img/", suffix: ".jpg" }],
          hours: { display: "Mon 8-5" }
        }
      };
    }
  };
}

describe("MultiSourcePlaceIngestionService", () => {
  it("uses primary provider without fallback when enough results", async () => {
    const store = new InMemoryPlaceStore();
    const service = new PlaceNormalizationService(store);
    const fsq = providerWith([
      { id: "1", name: "Cafe One" },
      { id: "2", name: "Cafe Two" }
    ]);

    const ingestion = new MultiSourcePlaceIngestionService(service, new Map([["foursquare", fsq]]), buildConfig(), () => 1000);

    const context: PlaceQueryContext = { intent: "text_search", queryText: "coffee", resultLimit: 2 };
    const result = await ingestion.searchCanonicalPlaces(context);

    expect(result.canonicalPlaces).toHaveLength(2);
    expect(result.fallbackUsed).toBe(false);
    expect(result.providersUsed).toEqual(["foursquare"]);
  });

  it("falls back when primary provider underfills", async () => {
    const store = new InMemoryPlaceStore();
    const service = new PlaceNormalizationService(store);
    const fsq = providerWith([{ id: "1", name: "Cafe One" }]);
    const google: ProviderPlaceClient = {
      ...providerWith([{ id: "g1", name: "Cafe Three" }]),
      metadata: { ...providerWith([], {}).metadata, provider: "google_places", costTier: "high" },
      async searchPlaces() {
        return {
          records: [
            {
              provider: "google_places",
              providerPlaceId: "g1",
              rawPayload: {
                id: "g1",
                displayName: { text: "Cafe Three" },
                location: { latitude: 37.775, longitude: -122.412 },
                types: ["coffee_shop"]
              }
            }
          ]
        };
      },
      async getPlaceDetails() {
        return undefined;
      }
    };

    const ingestion = new MultiSourcePlaceIngestionService(
      service,
      new Map([
        ["foursquare", fsq],
        ["google_places", google]
      ]),
      buildConfig(),
      () => 2000
    );

    const context: PlaceQueryContext = { intent: "text_search", queryText: "coffee", resultLimit: 2 };
    const result = await ingestion.searchCanonicalPlaces(context);

    expect(result.canonicalPlaces).toHaveLength(2);
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReasons).toContain("insufficient_results");
    expect(result.providersUsed).toEqual(["foursquare", "google_places"]);
  });

  it("uses cache to avoid duplicate provider calls", async () => {
    const store = new InMemoryPlaceStore();
    const service = new PlaceNormalizationService(store);
    let calls = 0;
    const fsq: ProviderPlaceClient = {
      ...providerWith([{ id: "1", name: "Cached Cafe" }]),
      async searchPlaces() {
        calls += 1;
        return {
          records: [
            {
              provider: "foursquare",
              providerPlaceId: "1",
              rawPayload: {
                fsq_id: "1",
                name: "Cached Cafe",
                geocodes: { main: { latitude: 37.77, longitude: -122.41 } },
                categories: [{ name: "Coffee Shop" }]
              }
            }
          ]
        };
      },
      async getPlaceDetails() {
        return undefined;
      }
    };

    const ingestion = new MultiSourcePlaceIngestionService(service, new Map([["foursquare", fsq]]), buildConfig(), () => 3000);
    const context: PlaceQueryContext = { intent: "text_search", queryText: "coffee", resultLimit: 1 };

    await ingestion.searchCanonicalPlaces(context);
    const second = await ingestion.searchCanonicalPlaces(context);

    expect(calls).toBe(1);
    expect(second.cacheStats.hits).toBe(1);
  });

  it("continuation token avoids repeating seen canonical places", async () => {
    const store = new InMemoryPlaceStore();
    const service = new PlaceNormalizationService(store);

    const pages = [
      [{ id: "1", name: "A" }, { id: "2", name: "B" }],
      [{ id: "2", name: "B" }, { id: "3", name: "C" }]
    ];
    let index = 0;
    const fsq: ProviderPlaceClient = {
      ...providerWith([]),
      async searchPlaces() {
        const records = pages[Math.min(index, pages.length - 1)] ?? [];
        index += 1;
        return {
          records: records.map((item) => ({
            provider: "foursquare",
            providerPlaceId: item.id,
            rawPayload: {
              fsq_id: item.id,
              name: item.name,
              geocodes: { main: { latitude: 37.77 + Number(item.id) * 0.001, longitude: -122.41 } },
              categories: [{ name: "Coffee Shop" }]
            }
          })),
          nextPageToken: String(index)
        };
      },
      async getPlaceDetails() {
        return undefined;
      }
    };

    const ingestion = new MultiSourcePlaceIngestionService(service, new Map([["foursquare", fsq]]), buildConfig(), () => 4000);
    const first = await ingestion.searchCanonicalPlaces({ intent: "text_search", queryText: "coffee", resultLimit: 2 });
    const second = await ingestion.getNextPlacePage(first.continuationToken ?? "");

    expect(first.canonicalPlaces.map((entry) => entry.primaryDisplayName)).toEqual(["A", "B"]);
    expect(second.canonicalPlaces.map((entry) => entry.primaryDisplayName)).toEqual(["C"]);
  });
});
