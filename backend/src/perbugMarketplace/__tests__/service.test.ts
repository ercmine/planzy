import { describe, expect, it } from "vitest";

import { seedMarketplaceListings } from "../seed.js";
import { PerbugMarketplaceService } from "../service.js";

describe("PerbugMarketplaceService", () => {
  it("filters by category/search and provides facets", () => {
    const service = new PerbugMarketplaceService(seedMarketplaceListings());
    const result = service.listListings({ filters: { category: "relic", search: "storm" }, sort: "price_asc" });

    expect(result.total).toBe(1);
    expect(result.items[0]?.assetType).toBe("relic");
    expect(result.facets.byType.relic).toBe(1);
    expect(result.diagnostics.filtersApplied).toContain("search");
  });

  it("returns detailed payload with provenance and map-link-safe metadata", () => {
    const service = new PerbugMarketplaceService(seedMarketplaceListings());
    const detail = service.getListingDetail("mk_map_lumin_keep");

    expect(detail?.listing.metadata.mapLink?.regionId).toBe("emberfront");
    expect(detail?.listing.provenance.tags).toContain("map_linked");
    expect(detail?.debug.schemaVersion).toBe("marketplace.v1");
  });

  it("captures analytics distributions", () => {
    const service = new PerbugMarketplaceService(seedMarketplaceListings());
    service.listListings({ filters: { provenanceTag: "event" } });
    service.getListingDetail("mk_item_star_compass");

    const analytics = service.analyticsSnapshot();
    expect(analytics.listingViews).toBeGreaterThanOrEqual(1);
    expect(analytics.detailOpens).toBe(1);
    expect(analytics.mapLinkedListingCount).toBeGreaterThanOrEqual(1);
    expect(analytics.provenanceDistribution.event).toBeGreaterThanOrEqual(1);
  });
});
