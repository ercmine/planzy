import { describe, expect, it, vi } from "vitest";
import { buildNearbyPlacesSqlQuery, InMemoryPlacePlatformRepository } from "../repositories.js";
import { CategoryNormalizationService, NearbyPlacesService, PlaceImportService } from "../services.js";

function makeDeps() {
  const repo = new InMemoryPlacePlatformRepository({
    categories: [
      { id: "cat_food", slug: "food", displayName: "Food", status: "ACTIVE" },
      { id: "cat_cafe", slug: "cafe", displayName: "Cafe", status: "ACTIVE", parentCategoryId: "cat_food" }
    ],
    rules: [
      {
        id: "rule_amenity_cafe",
        sourceName: "osm",
        sourceKey: "amenity",
        sourceValue: "cafe",
        categoryId: "cat_cafe",
        confidence: 0.92,
        priority: 1,
        status: "ACTIVE"
      }
    ]
  });
  const logger = { info: vi.fn() };
  const categoryNormalization = new CategoryNormalizationService(repo);
  const importer = new PlaceImportService(repo, repo, repo, repo, categoryNormalization, logger);
  const nearby = new NearbyPlacesService(repo, logger);
  return { repo, importer, categoryNormalization, nearby, logger };
}

describe("place platform foundations", () => {
  it("maps OSM tags into canonical categories", () => {
    const { categoryNormalization } = makeDeps();
    const mapped = categoryNormalization.mapOsmTagsToCategories({ amenity: "cafe", cuisine: "coffee_shop" });

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.categoryId).toBe("cat_cafe");
  });

  it("creates canonical place and source records on first OSM ingest", () => {
    const { importer, repo } = makeDeps();

    const result = importer.ingestOsmPlace({
      sourceRecordId: "node/123",
      name: "Sunrise Cafe",
      lat: 40.7128,
      lng: -74.006,
      tags: { amenity: "cafe", website: "https://sunrise.example" },
      payload: { city: "New York", country_code: "US" },
      sourceUrl: "https://www.openstreetmap.org/node/123",
      importBatchId: "batch-1"
    });

    expect(result.outcome).toBe("created");
    const place = repo.getById(result.canonicalPlaceId);
    expect(place?.primaryName).toBe("Sunrise Cafe");
    expect(repo.getSourceRecordBySourceRef("osm", "node/123")?.canonicalPlaceId).toBe(result.canonicalPlaceId);
    expect(repo.listSourceRecordsByCanonicalPlaceId(result.canonicalPlaceId)).toHaveLength(1);
    expect(repo.listCanonicalPlaceCategories(result.canonicalPlaceId).map((item) => item.categoryId)).toContain("cat_cafe");
  });

  it("dedupes by source identity and updates existing canonical place", () => {
    const { importer, repo } = makeDeps();

    const first = importer.ingestOsmPlace({
      sourceRecordId: "node/999",
      name: "Old Name",
      lat: 51.5,
      lng: -0.12,
      tags: { amenity: "cafe" },
      payload: { city: "London" }
    });
    const second = importer.ingestOsmPlace({
      sourceRecordId: "node/999",
      name: "New Name",
      lat: 51.5,
      lng: -0.12,
      tags: { amenity: "cafe" },
      payload: { city: "London", region: "England" }
    });

    expect(second.outcome).toBe("updated");
    expect(second.canonicalPlaceId).toBe(first.canonicalPlaceId);
    expect(repo.listSourceRecordsByCanonicalPlaceId(first.canonicalPlaceId)).toHaveLength(1);
    expect(repo.getById(first.canonicalPlaceId)?.primaryName).toBe("New Name");
  });

  it("persists source attribution for canonical place", () => {
    const { importer, repo } = makeDeps();
    const result = importer.ingestOsmPlace({
      sourceRecordId: "way/321",
      name: "Attribution Place",
      lat: 37.77,
      lng: -122.43,
      tags: { amenity: "cafe" },
      payload: {}
    });

    const attributions = repo.listAttributionsByCanonicalPlaceId(result.canonicalPlaceId);
    expect(attributions).toHaveLength(1);
    expect(attributions[0]?.sourceLabel).toBe("OpenStreetMap");
    expect(attributions[0]?.isPrimary).toBe(true);
  });

  it("supports nearby query by radius and category", () => {
    const { importer, nearby } = makeDeps();

    importer.ingestOsmPlace({
      sourceRecordId: "node/a",
      name: "Near Cafe",
      lat: 40.7128,
      lng: -74.006,
      tags: { amenity: "cafe" },
      payload: {}
    });
    importer.ingestOsmPlace({
      sourceRecordId: "node/b",
      name: "Far Cafe",
      lat: 40.9,
      lng: -74.3,
      tags: { amenity: "cafe" },
      payload: {}
    });

    const nearbyResults = nearby.findNearbyPlaces({
      lat: 40.7127,
      lng: -74.0059,
      radiusMeters: 1000,
      categoryIds: ["cat_cafe"]
    });

    expect(nearbyResults).toHaveLength(1);
    expect(nearbyResults[0]?.place.primaryName).toBe("Near Cafe");
  });

  it("exposes PostGIS nearby SQL primitive", () => {
    const sql = buildNearbyPlacesSqlQuery();
    expect(sql).toContain("ST_DWithin");
    expect(sql).toContain("ORDER BY distance_meters ASC");
  });

  it("logs ingestion and nearby query observability events", () => {
    const { importer, nearby, logger } = makeDeps();
    importer.ingestOsmPlace({
      sourceRecordId: "node/log",
      name: "Log Place",
      lat: 0,
      lng: 0,
      tags: { amenity: "cafe" },
      payload: {}
    });
    nearby.findNearbyPlaces({ lat: 0, lng: 0, radiusMeters: 100 });

    expect(logger.info).toHaveBeenCalledWith("place.import.osm", expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith("place.nearby.query", expect.any(Object));
  });
});
