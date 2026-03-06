import { describe, expect, it } from "vitest";

import { MemoryClickStore } from "../../analytics/clicks/memoryStore.js";
import { MemoryMerchantStore } from "../../merchant/memoryStore.js";
import type { PromotedPlanRecord, SpecialRecord } from "../../merchant/types.js";
import { MemoryVenueClaimStore } from "../../venues/claims/memoryStore.js";

describe("memory store pruning", () => {
  it("prunes old clicks using retention default", async () => {
    const store = new MemoryClickStore();
    const now = new Date("2026-01-31T00:00:00.000Z");

    await store.record({
      clickId: "old",
      sessionId: "s1",
      planId: "p1",
      linkType: "maps",
      serverAtISO: "2025-12-01T00:00:00.000Z"
    });
    await store.record({
      clickId: "new",
      sessionId: "s1",
      planId: "p2",
      linkType: "website",
      serverAtISO: "2026-01-20T00:00:00.000Z"
    });

    expect(store.prune(undefined, now)).toBe(1);
    const listed = await store.listBySession("s1");
    expect(listed.clicks.map((c) => c.clickId)).toEqual(["new"]);
  });

  it("prunes old venue claims using retention default", async () => {
    const store = new MemoryVenueClaimStore();
    const now = new Date("2026-05-01T00:00:00.000Z");

    await store.create({
      claimId: "old-claim",
      venueId: "v1",
      contactEmail: "old@example.com",
      verificationStatus: "pending",
      createdAtISO: "2025-12-01T00:00:00.000Z"
    });
    await store.create({
      claimId: "new-claim",
      venueId: "v1",
      contactEmail: "new@example.com",
      verificationStatus: "pending",
      createdAtISO: "2026-04-20T00:00:00.000Z"
    });

    expect(store.prune(undefined, now)).toBe(1);
    const listed = await store.list();
    expect(listed.claims.map((c) => c.claimId)).toEqual(["new-claim"]);
  });

  it("prunes old promos and specials using retention defaults", async () => {
    const store = new MemoryMerchantStore();
    const now = new Date("2026-12-31T00:00:00.000Z");

    const oldPromo: PromotedPlanRecord = {
      promoId: "promo-old",
      venueId: "v1",
      status: "active",
      priority: 1,
      createdAtISO: "2025-01-01T00:00:00.000Z",
      plan: {
        id: "p1",
        source: "merchant",
        sourceId: "p1",
        title: "Old promo",
        category: "food",
        location: { lat: 0, lng: 0 }
      }
    };

    const newPromo: PromotedPlanRecord = {
      ...oldPromo,
      promoId: "promo-new",
      createdAtISO: "2026-12-20T00:00:00.000Z"
    };

    const oldSpecial: SpecialRecord = {
      specialId: "special-old",
      venueId: "v1",
      headline: "Old special",
      status: "active",
      createdAtISO: "2025-01-01T00:00:00.000Z"
    };

    const newSpecial: SpecialRecord = {
      ...oldSpecial,
      specialId: "special-new",
      createdAtISO: "2026-12-20T00:00:00.000Z"
    };

    await store.createPromoted(oldPromo);
    await store.createPromoted(newPromo);
    await store.createSpecial(oldSpecial);
    await store.createSpecial(newSpecial);

    expect(store.prunePromos(undefined, now)).toBe(1);
    expect(store.pruneSpecials(undefined, now)).toBe(1);

    const promos = await store.listPromoted();
    const specials = await store.listSpecials();

    expect(promos.items.map((p) => p.promoId)).toEqual(["promo-new"]);
    expect(specials.items.map((s) => s.specialId)).toEqual(["special-new"]);
  });
});
