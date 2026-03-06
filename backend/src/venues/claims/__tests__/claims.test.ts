import { describe, expect, it } from "vitest";

import { ValidationError } from "../../../plans/errors.js";
import { VenueClaimsService } from "../claimsService.js";
import { MemoryVenueClaimStore } from "../memoryStore.js";

describe("VenueClaimsService", () => {
  it("createLead validates email and creates pending record", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore(), {
      now: () => new Date("2025-01-01T00:00:00.000Z")
    });

    await expect(
      service.createLead({
        venueId: "venue-1",
        contactEmail: "invalid"
      })
    ).rejects.toThrowError(ValidationError);

    const created = await service.createLead({
      venueId: "venue-1",
      contactEmail: "owner@example.com"
    });

    expect(created.verificationStatus).toBe("pending");
    expect(created.createdAtISO).toBe("2025-01-01T00:00:00.000Z");
  });

  it("idempotency returns same claimId for pending duplicate", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore());

    const first = await service.createLead({
      venueId: "venue-1",
      contactEmail: "owner@example.com"
    });

    const second = await service.createLead({
      venueId: "venue-1",
      contactEmail: "owner@example.com"
    });

    expect(first.claimId).toBe(second.claimId);
  });

  it("list pagination works", async () => {
    let tick = 0;
    const service = new VenueClaimsService(new MemoryVenueClaimStore(), {
      now: () => new Date(`2025-01-01T00:00:0${tick++}.000Z`)
    });

    for (let i = 0; i < 4; i += 1) {
      await service.createLead({
        venueId: "venue-1",
        contactEmail: `owner${i}@example.com`
      });
    }

    const page1 = await service.listLeads({ limit: 2 });
    expect(page1.claims).toHaveLength(2);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await service.listLeads({ limit: 2, cursor: page1.nextCursor });
    expect(page2.claims).toHaveLength(2);
    expect(page1.claims[0]?.claimId).not.toBe(page2.claims[0]?.claimId);
  });

  it("setStatus updates status", async () => {
    const store = new MemoryVenueClaimStore();
    const service = new VenueClaimsService(store, {
      now: () => new Date("2025-01-03T00:00:00.000Z")
    });

    const created = await service.createLead({
      venueId: "venue-9",
      contactEmail: "hello@example.com"
    });

    await service.setStatus(created.claimId, "verified");
    const found = await store.getById(created.claimId);

    expect(found?.verificationStatus).toBe("verified");
    expect(found?.updatedAtISO).toBe("2025-01-03T00:00:00.000Z");
  });
});
