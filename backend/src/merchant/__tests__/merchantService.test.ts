import { describe, expect, it } from "vitest";

import { MemoryMerchantStore } from "../memoryStore.js";
import { MerchantService } from "../service.js";

describe("MerchantService", () => {
  it("createPromoted creates promoted plan with venue metadata", async () => {
    const service = new MerchantService(new MemoryMerchantStore(), { now: () => new Date("2026-01-01T00:00:00.000Z") });

    const created = await service.createPromoted({
      venueId: "google:g1",
      title: "Featured dinner",
      description: "Great food",
      websiteLink: "https://example.com"
    });

    expect(created.plan.source).toBe("promoted");
    expect((created.plan.metadata as Record<string, unknown>).venueId).toBe("google:g1");
  });

  it("updatePromoted updates status priority and title", async () => {
    const service = new MerchantService(new MemoryMerchantStore(), { now: () => new Date("2026-01-01T00:00:00.000Z") });
    const created = await service.createPromoted({
      venueId: "google:g2",
      title: "Old title"
    });

    const updated = await service.updatePromoted(created.promoId, {
      status: "paused",
      priority: 10,
      title: "New title"
    });

    expect(updated.status).toBe("paused");
    expect(updated.priority).toBe(10);
    expect(updated.plan.title).toBe("New title");
  });

  it("createSpecial/listSpecials filters active by now", async () => {
    const store = new MemoryMerchantStore();
    const service = new MerchantService(store, { now: () => new Date("2026-01-01T00:00:00.000Z") });

    await service.createSpecial({
      venueId: "google:g3",
      headline: "Now active",
      startsAtISO: "2025-12-31T00:00:00.000Z",
      endsAtISO: "2026-01-02T00:00:00.000Z"
    });

    await service.createSpecial({
      venueId: "google:g3",
      headline: "Expired",
      startsAtISO: "2025-12-01T00:00:00.000Z",
      endsAtISO: "2025-12-02T00:00:00.000Z"
    });

    const listed = await service.listSpecials({ nowISO: "2026-01-01T00:00:00.000Z" });
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.headline).toBe("Now active");
  });

  it("specialsForVenue only returns active venue specials", async () => {
    const service = new MerchantService(new MemoryMerchantStore(), { now: () => new Date("2026-01-01T00:00:00.000Z") });

    await service.createSpecial({
      venueId: "google:g4",
      headline: "Valid special",
      startsAtISO: "2025-12-01T00:00:00.000Z",
      endsAtISO: "2026-02-01T00:00:00.000Z"
    });
    await service.createSpecial({
      venueId: "google:g4",
      headline: "Paused special",
      status: "paused"
    });
    await service.createSpecial({
      venueId: "google:g5",
      headline: "Different venue"
    });

    const specials = await service.specialsForVenue("google:g4", new Date("2026-01-01T00:00:00.000Z"));
    expect(specials).toHaveLength(1);
    expect(specials[0]?.headline).toBe("Valid special");
  });
});
