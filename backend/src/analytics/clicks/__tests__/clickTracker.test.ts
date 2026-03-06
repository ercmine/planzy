import { describe, expect, it } from "vitest";

import { ValidationError } from "../../../plans/errors.js";
import { ClickTracker } from "../clickTracker.js";
import { MemoryClickStore } from "../memoryStore.js";

describe("ClickTracker", () => {
  it("track stores record with serverAtISO and generated clickId", async () => {
    const tracker = new ClickTracker(new MemoryClickStore(), {
      now: () => new Date("2025-01-02T03:04:05.000Z")
    });

    const record = await tracker.track({
      sessionId: "session-1",
      planId: "plan-1",
      linkType: "website"
    });

    expect(record.serverAtISO).toBe("2025-01-02T03:04:05.000Z");
    expect(record.clickId).toMatch(/^[0-9a-f-]{36}$/i);

    const listed = await tracker.list("session-1");
    expect(listed.clicks).toEqual([record]);
  });

  it("linkType validation rejects invalid values", async () => {
    const tracker = new ClickTracker(new MemoryClickStore());

    await expect(
      tracker.track({
        sessionId: "session-1",
        planId: "plan-1",
        linkType: "invalid"
      })
    ).rejects.toThrowError(ValidationError);
  });

  it("meta.extra rejects url-like string values", async () => {
    const tracker = new ClickTracker(new MemoryClickStore());

    await expect(
      tracker.track({
        sessionId: "session-1",
        planId: "plan-1",
        linkType: "maps",
        meta: {
          extra: {
            ref: "https://example.com/track"
          }
        }
      })
    ).rejects.toThrowError(ValidationError);
  });

  it("list pagination works", async () => {
    const tracker = new ClickTracker(new MemoryClickStore(), {
      now: () => new Date("2025-01-02T03:04:05.000Z")
    });

    for (let i = 0; i < 4; i += 1) {
      await tracker.track({
        sessionId: "session-1",
        planId: `plan-${i}`,
        linkType: "website"
      });
    }

    const page1 = await tracker.list("session-1", { limit: 2 });
    expect(page1.clicks).toHaveLength(2);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await tracker.list("session-1", {
      limit: 2,
      cursor: page1.nextCursor
    });

    expect(page2.clicks).toHaveLength(2);
    expect(page1.clicks[0]?.clickId).not.toBe(page2.clicks[0]?.clickId);
  });

  it("aggregate counts by linkType correctly", async () => {
    const tracker = new ClickTracker(new MemoryClickStore());

    await tracker.track({ sessionId: "session-1", planId: "plan-1", linkType: "maps" });
    await tracker.track({ sessionId: "session-1", planId: "plan-1", linkType: "maps" });
    await tracker.track({ sessionId: "session-1", planId: "plan-2", linkType: "ticket" });

    const aggregate = await tracker.aggregate("session-1");
    expect(aggregate.total).toBe(3);
    expect(aggregate.byLinkType.maps).toBe(2);
    expect(aggregate.byLinkType.ticket).toBe(1);
    expect(aggregate.byLinkType.website).toBe(0);
  });

  it("limit caps at 500", async () => {
    const tracker = new ClickTracker(new MemoryClickStore());

    for (let i = 0; i < 520; i += 1) {
      await tracker.track({
        sessionId: "session-1",
        planId: `plan-${i}`,
        linkType: "booking"
      });
    }

    const page = await tracker.list("session-1", { limit: 5_000 });
    expect(page.clicks).toHaveLength(500);
    expect(page.nextCursor).toBeTruthy();
  });
});
