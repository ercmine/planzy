import { describe, expect, it, vi } from "vitest";
import { OSM_CATEGORY_RULES, DRYAD_CATEGORIES } from "../categoryIntelligence.js";
import {
  EnrichmentJobRunner,
  InMemoryEnrichmentRepository,
  InMemoryPlacePlatformRepository,
  normalizeGeoNamesResponse,
  normalizeOpenTripMapResponse,
  normalizeWikidataResponse,
  PlaceEnrichmentService,
  scoreCandidateMatch,
  selectPrioritizedPlaceImages
} from "../index.js";
import { CategoryNormalizationService, PlaceImportService } from "../services.js";

function setup() {
  const placeRepo = new InMemoryPlacePlatformRepository({ categories: DRYAD_CATEGORIES, rules: OSM_CATEGORY_RULES });
  const enrichmentRepo = new InMemoryEnrichmentRepository();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const importer = new PlaceImportService(placeRepo, placeRepo, placeRepo, placeRepo, new CategoryNormalizationService(placeRepo), logger);

  const imported = importer.ingestOsmPlace({
    sourceRecordId: "node/landmark",
    name: "Old Castle",
    lat: 48.86,
    lng: 2.34,
    tags: { tourism: "attraction" },
    payload: { city: "Paris", country_code: "FR" }
  });

  const providers = {
    wikidata: vi.fn(async () => ({
      id: "Q123",
      url: "https://www.wikidata.org/wiki/Q123",
      label: "Old Castle",
      description: "Historic hilltop castle in Paris",
      aliases: ["Chateau Ancien"],
      landmarkType: "castle",
      externalIds: { viaf: "765" },
      wikipediaUrl: "https://en.wikipedia.org/wiki/Old_Castle",
      imageUrl: "https://upload.wikimedia.org/old-castle.jpg",
      imageSourceUrl: "https://commons.wikimedia.org/wiki/File:Old_Castle.jpg",
      imageAttributionText: "Image from Wikidata",
      imageAllowed: true,
      lat: 48.8601,
      lng: 2.3401
    })),
    geonames: vi.fn(async () => ({
      geonameId: "2988507",
      url: "https://www.geonames.org/2988507",
      city: "Paris",
      adminName1: "Île-de-France",
      adminName2: "Paris",
      countryCode: "FR",
      alternateNames: ["Parigi"],
      lat: 48.86,
      lng: 2.34
    })),
    opentripmap: vi.fn(async () => ({
      xid: "N123",
      url: "https://opentripmap.com/en/card/N123",
      description: "Must-see medieval attraction",
      kinds: "historic,architecture,tourism",
      wikipedia: "https://en.wikipedia.org/wiki/Old_Castle",
      lat: 48.8601,
      lng: 2.3402
    }))
  };

  const service = new PlaceEnrichmentService(placeRepo, placeRepo, placeRepo, enrichmentRepo, providers, undefined, logger);

  return { placeRepo, enrichmentRepo, canonicalPlaceId: imported.canonicalPlaceId, service, providers };
}

describe("place enrichment", () => {
  it("normalizes Wikidata payload", () => {
    const normalized = normalizeWikidataResponse({ id: "Q1", url: "u", aliases: ["a"], externalIds: { gnd: "x" }, imageUrl: "https://img/test.jpg", imageAllowed: true });
    expect(normalized.sourceId).toBe("Q1");
    expect(normalized.aliases).toEqual(["a"]);
    expect(normalized.externalIds.gnd).toBe("x");

    expect(normalized.image?.url).toBeDefined();
  });

  it("normalizes GeoNames payload", () => {
    const normalized = normalizeGeoNamesResponse({ geonameId: 9, adminName1: "X", alternateNames: ["Y"] });
    expect(normalized.sourceId).toBe("9");
    expect(normalized.region).toBe("X");
    expect(normalized.alternateNames).toEqual(["Y"]);
  });

  it("normalizes OpenTripMap payload", () => {
    const normalized = normalizeOpenTripMapResponse({ xid: "N1", kinds: "museum, architecture", image: "https://images.opentripmap.com/a.jpg" });
    expect(normalized.sourceId).toBe("N1");
    expect(normalized.tourismKinds).toEqual(["museum", "architecture"]);
    expect(normalized.image?.sourceName).toBe("opentripmap");
  });


  it("selects trusted image priority with Wikidata preferred over fallback", () => {
    const selected = selectPrioritizedPlaceImages([
      {
        imageUrl: "https://img.example.com/opentrip.jpg",
        sourceName: "opentripmap",
        attributionLabel: "Image from OpenTripMap",
        attributionUrl: "https://opentripmap.com",
        imageType: "attraction"
      },
      {
        imageUrl: "https://img.example.com/wikidata.jpg",
        sourceName: "wikidata",
        attributionLabel: "Image from Wikidata",
        attributionUrl: "https://commons.wikimedia.org",
        imageType: "landmark"
      }
    ]);

    expect(selected.primaryImage?.sourceName).toBe("wikidata");
    expect(selected.imageGallery).toHaveLength(2);
  });

  it("keeps OpenTripMap as fallback image when Wikidata image is missing", async () => {
    const { service, placeRepo, canonicalPlaceId, providers } = setup();
    providers.wikidata.mockImplementation(async () => ({
      id: "Q123",
      url: "https://www.wikidata.org/wiki/Q123",
      label: "Old Castle",
      description: "Historic site",
      aliases: [],
      landmarkType: "castle",
      externalIds: {},
      wikipediaUrl: "https://en.wikipedia.org/wiki/Old_Castle",
      imageAllowed: false,
      lat: 48.8601,
      lng: 2.3401
    } as any));
    providers.opentripmap.mockImplementation(async () => ({
      xid: "N123",
      url: "https://opentripmap.com/en/card/N123",
      description: "Fallback image candidate",
      image: "https://images.opentripmap.com/castle.jpg",
      imageAttributionText: "Image from OpenTripMap",
      imageSourceUrl: "https://opentripmap.com/en/card/N123",
      kinds: "historic,tourism",
      wikipedia: "https://en.wikipedia.org/wiki/Old_Castle",
      lat: 48.8601,
      lng: 2.3402
    } as any));

    await service.enrichPlace(canonicalPlaceId, "wikidata");
    const fallbackResult = await service.enrichPlace(canonicalPlaceId, "opentripmap");

    expect(fallbackResult.status).toBe("succeeded");
    const metadata = placeRepo.getById(canonicalPlaceId)?.metadata as Record<string, unknown>;
    const primaryImage = metadata.primaryImage as { sourceName?: string; imageUrl?: string } | undefined;
    const gallery = metadata.imageGallery as Array<{ sourceName?: string; imageUrl?: string }> | undefined;
    const attr = metadata.imageAttributionSummary as Array<{ sourceName?: string; label?: string }> | undefined;

    expect(primaryImage?.sourceName).toBe("opentripmap");
    expect(primaryImage?.imageUrl).toContain("opentripmap");
    expect(gallery?.some((item) => item.sourceName === "opentripmap")).toBe(true);
    expect(attr?.some((item) => item.sourceName === "opentripmap" && item.label?.includes("OpenTripMap"))).toBe(true);
  });

  it("rejects weak fallback image matches and keeps no-image state", async () => {
    const { service, placeRepo, canonicalPlaceId, providers } = setup();
    providers.opentripmap.mockImplementation(async () => ({
      xid: "N999",
      url: "https://opentripmap.com/en/card/N999",
      description: "Other location",
      kinds: "tourism",
      image: "https://images.opentripmap.com/other.jpg",
      lat: 35.0,
      lng: -80.0
    } as any));

    const result = await service.enrichPlace(canonicalPlaceId, "opentripmap");
    expect(result.status).toBe("no_match");
    expect((placeRepo.getById(canonicalPlaceId)?.metadata as Record<string, unknown>).primaryImage).toBeUndefined();
  });

  it("scores conservative match and no-match behavior", () => {
    const { placeRepo, canonicalPlaceId } = setup();
    const place = placeRepo.getById(canonicalPlaceId);
    if (!place) throw new Error("missing place");
    const strong = scoreCandidateMatch(place, { sourceId: "x", name: "Old Castle", latitude: 48.86, longitude: 2.34, countryCode: "FR" });
    const weak = scoreCandidateMatch(place, { sourceId: "x", name: "Other", latitude: 50, longitude: 10, countryCode: "DE" });

    expect(strong.matched).toBe(true);
    expect(weak.matched).toBe(false);
  });

  it("merges Wikidata fields with attribution without changing canonical id", async () => {
    const { service, placeRepo, enrichmentRepo, canonicalPlaceId } = setup();
    const record = await service.enrichPlace(canonicalPlaceId, "wikidata");

    expect(record.status).toBe("succeeded");
    expect(placeRepo.getById(canonicalPlaceId)?.description).toContain("Historic hilltop");
    expect(enrichmentRepo.listFieldAttributions(canonicalPlaceId).some((a) => a.field === "description" && a.sourceName === "wikidata")).toBe(true);
    expect((placeRepo.getById(canonicalPlaceId)?.metadata.wikidata as { image?: { url?: string } }).image?.url).toContain('wikimedia');
  });

  it("applies GeoNames admin context safely", async () => {
    const { service, placeRepo, canonicalPlaceId } = setup();
    await service.enrichPlace(canonicalPlaceId, "geonames");
    const place = placeRepo.getById(canonicalPlaceId);
    expect(place?.region).toBe("Île-de-France");
    expect((place?.metadata.geonames as { county?: string }).county).toBe("Paris");
  });

  it("uses OpenTripMap as supplemental source", async () => {
    const { service, placeRepo, canonicalPlaceId } = setup();
    await service.enrichPlace(canonicalPlaceId, "opentripmap");
    const place = placeRepo.getById(canonicalPlaceId);
    expect((place?.metadata.opentripmap as { kinds?: string[] }).kinds).toContain("tourism");
  });

  it("tracks freshness/status/source ids", async () => {
    const { service, enrichmentRepo, canonicalPlaceId } = setup();
    const record = await service.enrichPlace(canonicalPlaceId, "wikidata");
    expect(record.lastAttemptAt).toBeTruthy();
    expect(record.lastSuccessAt).toBeTruthy();
    expect(record.sourceRecordId).toBe("Q123");
    expect(enrichmentRepo.getRecord(canonicalPlaceId, "wikidata")?.status).toBe("succeeded");
  });

  it("runs resumable enrichment jobs over multiple sources", async () => {
    const { service, enrichmentRepo, canonicalPlaceId } = setup();
    const runner = new EnrichmentJobRunner(service, enrichmentRepo);
    const run = await runner.run({ sourceName: "all", canonicalPlaceIds: [canonicalPlaceId], batchSize: 1 });
    expect(run.stats.attempted).toBe(3);
    expect(run.stats.succeeded).toBe(3);
    expect(run.completedAt).toBeTruthy();
  });

  it("handles upstream errors without corrupting place", async () => {
    const { placeRepo, canonicalPlaceId } = setup();
    const enrichmentRepo = new InMemoryEnrichmentRepository();
    const service = new PlaceEnrichmentService(
      placeRepo,
      placeRepo,
      placeRepo,
      enrichmentRepo,
      {
        wikidata: async () => {
          throw new Error("timeout");
        },
        geonames: async () => undefined,
        opentripmap: async () => undefined
      }
    );

    const record = await service.enrichPlace(canonicalPlaceId, "wikidata");
    expect(record.status).toBe("failed");
    expect(placeRepo.getById(canonicalPlaceId)?.primaryName).toBe("Old Castle");
  });
});
