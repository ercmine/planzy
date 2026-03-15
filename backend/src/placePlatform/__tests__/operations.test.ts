import { describe, expect, it, vi } from "vitest";
import { InMemoryPlacePlatformRepository } from "../repositories.js";
import {
  AttributionComplianceService,
  CanonicalDetailBackend,
  InMemoryOpenDataJobQueue,
  OpenDataCache,
  OpenDataObservability,
  OpenDataWorkerOrchestrator,
  RolloutSafeDetailApi,
  RolloutSafeDiscoveryApi,
  type DiscoveryBackend
} from "../operations.js";
import { OSM_CATEGORY_RULES, PERBUG_CATEGORIES } from "../categoryIntelligence.js";
import { CategoryNormalizationService, PlaceImportService } from "../services.js";

describe("open-data operational infrastructure", () => {
  function setupRepo() {
    const repo = new InMemoryPlacePlatformRepository({ categories: PERBUG_CATEGORIES, rules: OSM_CATEGORY_RULES });
    const importer = new PlaceImportService(repo, repo, repo, repo, new CategoryNormalizationService(repo));
    return { repo, importer };
  }

  it("queues and processes import jobs with progress tracking", async () => {
    const queue = new InMemoryOpenDataJobQueue();
    const observability = new OpenDataObservability();
    const handler = vi.fn(async (_job, controls) => {
      controls.updateProgress({ processed: 1, succeeded: 1, total: 1, cursor: "1" });
    });
    const orchestrator = new OpenDataWorkerOrchestrator(queue, { osm_bootstrap_import: handler }, { imports: 1, enrichment: 1, reindex: 1, backfills: 1, cache: 1 }, observability);

    const job = queue.enqueue({ queue: "imports", type: "osm_bootstrap_import", payload: { region: "nyc" } });
    const processed = await orchestrator.processNext("imports");

    expect(processed?.status).toBe("succeeded");
    expect(queue.getById(job.id)?.cursor).toBe("1");
    expect(observability.snapshot().counters["jobs.osm_bootstrap_import.succeeded"]).toBe(1);
  });

  it("retries failed enrichment jobs and isolates failures", async () => {
    const queue = new InMemoryOpenDataJobQueue();
    const observability = new OpenDataObservability();
    let first = true;
    const orchestrator = new OpenDataWorkerOrchestrator(
      queue,
      {
        wikidata_backfill: async () => {
          if (first) {
            first = false;
            throw new Error("transient");
          }
        },
        geonames_backfill: async () => undefined
      },
      { imports: 1, enrichment: 1, reindex: 1, backfills: 1, cache: 1 },
      observability
    );

    const a = queue.enqueue({ queue: "enrichment", type: "wikidata_backfill", maxAttempts: 2 });
    queue.enqueue({ queue: "enrichment", type: "geonames_backfill" });
    await orchestrator.processNext("enrichment");
    expect(queue.getById(a.id)?.status).toBe("queued");

    await orchestrator.processNext("enrichment");
    await orchestrator.processNext("enrichment");
    expect(queue.metrics("enrichment").failed).toBe(0);
    expect(observability.snapshot().counters["jobs.wikidata_backfill.failed"]).toBe(1);
  });

  it("supports idempotent backfill enqueue and predictable status", () => {
    const queue = new InMemoryOpenDataJobQueue();
    const first = queue.enqueue({ queue: "backfills", type: "category_recompute", idempotencyKey: "rules:v2:us" });
    const second = queue.enqueue({ queue: "backfills", type: "category_recompute", idempotencyKey: "rules:v2:us" });
    expect(first.id).toBe(second.id);
  });

  it("builds normalized cache keys and invalidates place-linked cache", () => {
    const observability = new OpenDataObservability();
    const cache = new OpenDataCache({ discoveryTtlMs: 1_000, detailTtlMs: 1_000, geocodeTtlMs: 1_000 }, observability);
    const keyA = cache.key("discovery", { city: "austin", q: "coffee", page: 1 });
    const keyB = cache.key("discovery", { q: "coffee", page: 1, city: "austin" });
    expect(keyA).toBe(keyB);

    cache.write("discovery", keyA, { items: [1] }, ["place:abc"]);
    expect(cache.read(keyA)).toEqual({ items: [1] });
    expect(cache.invalidateByTag("place:abc")).toBe(1);
    expect(cache.read(keyA)).toBeUndefined();
  });

  it("preserves attribution through compliance summary and detail serialization", async () => {
    const { repo, importer } = setupRepo();
    const created = importer.ingestOsmPlace({
      sourceRecordId: "node/attr",
      name: "Attr Cafe",
      lat: 1,
      lng: 1,
      tags: { amenity: "cafe" },
      payload: {},
      sourceUrl: "https://www.openstreetmap.org/node/attr"
    });

    const attribution = new AttributionComplianceService(repo);
    const backend = new CanonicalDetailBackend(repo, attribution);
    const detail = await backend.getDetail(created.canonicalPlaceId);

    expect(detail?.attribution.primary?.label).toBe("OpenStreetMap");
    expect(detail?.images).toEqual([]);
    expect(detail?.attribution.requiredNotice).toContain("OpenStreetMap");
  });

  it("uses rollout-safe discovery fallback when owned backend degrades", async () => {
    const owned: DiscoveryBackend = { nearby: async () => { throw new Error("down"); } };
    const fallback: DiscoveryBackend = { nearby: async () => [{ placeId: "p1", title: "Fallback" }] };
    const observability = new OpenDataObservability();
    const api = new RolloutSafeDiscoveryApi(
      owned,
      fallback,
      { useOwned: () => true },
      new OpenDataCache({ discoveryTtlMs: 10_000, detailTtlMs: 10_000, geocodeTtlMs: 10_000 }, observability),
      observability
    );

    const payload = await api.nearby({ city: "austin" });
    expect(payload.source).toBe("fallback");
    expect(payload.items[0]?.title).toBe("Fallback");
  });

  it("serves rollout-safe detail payload with fallback and cache", async () => {
    const owned = { getDetail: async () => { throw new Error("owned missing"); } };
    const fallback = {
      getDetail: async () => ({
        placeId: "p2",
        title: "Fallback Place",
        location: { lat: 0, lng: 0 },
        images: [],
        notable: { aliases: [] },
        attribution: { primary: { source: "osm", label: "OpenStreetMap" }, allSources: [{ source: "osm", label: "OpenStreetMap" }] },
        trustIndicators: { hasEnrichment: false, sourceCount: 1 }
      })
    };
    const observability = new OpenDataObservability();
    const api = new RolloutSafeDetailApi(
      owned,
      fallback,
      { useOwned: () => true },
      new OpenDataCache({ discoveryTtlMs: 10_000, detailTtlMs: 10_000, geocodeTtlMs: 10_000 }, observability),
      observability
    );

    const first = await api.get("p2");
    const second = await api.get("p2");
    expect(first.source).toBe("fallback");
    expect(second.detail?.title).toBe("Fallback Place");
    expect(observability.snapshot().counters["cache.hit"]).toBeGreaterThanOrEqual(1);
  });
});
