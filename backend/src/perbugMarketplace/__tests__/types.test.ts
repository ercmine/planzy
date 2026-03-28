import { describe, expect, it } from "vitest";

import { seedMarketplaceListings } from "../seed.js";

describe("perbug marketplace model serialization", () => {
  it("round-trips listing payloads safely", () => {
    const listing = seedMarketplaceListings()[0];
    const parsed = JSON.parse(JSON.stringify(listing)) as typeof listing;

    expect(parsed.listingId).toBe(listing.listingId);
    expect(parsed.assetReference.assetType).toBe("character");
    expect(parsed.provenance.tags.length).toBeGreaterThan(0);
  });
});
