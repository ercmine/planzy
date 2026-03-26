import { describe, expect, it, vi } from "vitest";
import { buildNearbyPlacesSqlQuery, InMemoryPlacePlatformRepository } from "../repositories.js";
import { CategoryNormalizationService, NearbyPlacesService, OsmImportRunnerService, PlaceImportService } from "../services.js";
import { OSM_CATEGORY_RULES, DRYAD_CATEGORIES } from "../categoryIntelligence.js";

function makeDeps() {
  const repo = new InMemoryPlacePlatformRepository({
    categories: DRYAD_CATEGORIES,
    rules: OSM_CATEGORY_RULES
  });
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const categoryNormalization = new CategoryNormalizationService(repo);
  const importer = new PlaceImportService(repo, repo, repo, repo, categoryNormalization, logger);
  const nearby = new NearbyPlacesService(repo, logger);
  const runner = new OsmImportRunnerService(importer, repo, repo, logger);
  return { repo, importer, categoryNormalization, nearby, runner, logger };
}

describe("place platform foundations", () => {
  it("maps OSM tags into canonical categories", () => {
    const { categoryNormalization } = makeDeps();
    const mapped = categoryNormalization.mapOsmTagsToCategories({ amenity: "cafe", cuisine: "coffee_shop" });

    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.categoryId).toBe("cat_coffee");
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
    expect(repo.listCanonicalPlaceCategories(result.canonicalPlaceId).map((item) => item.categoryId)).toContain("cat_coffee");
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

  it("tracks import run stats, incremental update, and stale marking", () => {
    const { runner, repo } = makeDeps();
    const first = runner.runImport({
      mode: "bootstrap",
      regionSlug: "nyc",
      importVersion: "v1",
      records: [
        { sourceRecordId: "node/1", name: "One", lat: 40, lng: -73, tags: { amenity: "cafe" }, payload: { city: "NYC" } },
        { sourceRecordId: "node/2", name: "Two", lat: 40.1, lng: -73.1, tags: { amenity: "cafe" }, payload: { city: "NYC" } }
      ]
    });

    const second = runner.runImport({
      mode: "incremental",
      regionSlug: "nyc",
      importVersion: "v2",
      markMissingAsStale: true,
      records: [{ sourceRecordId: "node/1", name: "One Updated", lat: 40, lng: -73, tags: { amenity: "cafe" }, payload: { city: "NYC" } }]
    });

    expect(first.stats.created).toBe(2);
    expect(second.stats.updated).toBe(1);
    expect(second.stats.staleMarked).toBe(1);
    expect(repo.getSourceRecordBySourceRef("osm", "node/2")?.staleAt).toBeTruthy();
    expect(repo.getImportRunById(second.run.id)?.status).toBe("SUCCEEDED");
  });

  it("is idempotent across reruns and preserves canonical id", () => {
    const { runner, repo } = makeDeps();
    const input = { sourceRecordId: "way/99", name: "Stable", lat: 12, lng: 13, tags: { amenity: "cafe" }, payload: { city: "X" } };
    const first = runner.runImport({ mode: "bootstrap", regionSlug: "test", records: [input] });
    const second = runner.runImport({ mode: "bootstrap", regionSlug: "test", records: [input] });

    const source = repo.getSourceRecordBySourceRef("osm", "way/99");
    expect(first.stats.created).toBe(1);
    expect(second.stats.unchanged).toBe(1);
    expect(source?.canonicalPlaceId).toBe(repo.findBySource("osm", "way/99")?.id);
  });

  it("skips malformed records without failing whole import", () => {
    const { runner } = makeDeps();
    const run = runner.runImport({
      mode: "bootstrap",
      regionSlug: "malformed",
      records: [
        { sourceRecordId: "node/valid", name: "Valid", lat: 1, lng: 1, tags: {}, payload: {} },
        { sourceRecordId: "", name: "Bad", lat: 0, lng: 0, tags: {}, payload: {} }
      ]
    });
    expect(run.stats.created).toBe(1);
    expect(run.stats.skipped).toBe(1);
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
      categoryIds: ["cat_coffee"]
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


  it("applies cuisine precedence over generic restaurant", () => {
    const { categoryNormalization } = makeDeps();
    const mapped = categoryNormalization.mapOsmTagsToCategories({ amenity: "restaurant", cuisine: "pizza" });
    expect(mapped[0]?.categoryId).toBe("cat_pizza");
    expect(mapped.some((item) => item.categoryId === "cat_restaurants")).toBe(true);
  });

  it("supports unknown tags with unmapped fallback", () => {
    const { categoryNormalization } = makeDeps();
    const mapped = categoryNormalization.mapOsmTagsToCategories({ highway: "bus_stop" });
    expect(mapped).toHaveLength(0);
  });

  it("stores completeness score and normalization metadata", () => {
    const { importer, repo } = makeDeps();
    const result = importer.ingestOsmPlace({
      sourceRecordId: "node/qual",
      name: "Quality Cafe",
      lat: 1,
      lng: 1,
      tags: { amenity: "cafe", website: "https://example.com" },
      payload: { city: "Austin", country_code: "US" }
    });
    const place = repo.getById(result.canonicalPlaceId);
    expect(place?.qualityScore).toBeGreaterThan(0.5);
    expect(place?.metadata["normalizationVersion"]).toBe("v1");
  });

});
