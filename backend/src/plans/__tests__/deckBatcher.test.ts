import { describe, expect, it } from "vitest";

import { ValidationError } from "../errors.js";
import type { Plan } from "../plan.js";
import { decodeCursor, encodeCursor } from "../router/pagination/cursor.js";
import { DeckBatcher } from "../router/pagination/deckBatcher.js";
import { MemoryDeckSnapshotStore } from "../router/pagination/deckSnapshotStore.js";

function makePlan(id: string): Plan {
  return {
    id,
    source: "test",
    sourceId: id,
    title: id,
    category: "other",
    location: { lat: 0, lng: 0 }
  };
}

describe("DeckBatcher", () => {
  it("returns first page and next cursor", () => {
    const plans = ["p1", "p2", "p3", "p4", "p5"].map(makePlan);
    const batcher = new DeckBatcher({}, { now: () => 1_000 });

    const first = batcher.batch(plans, { requestedBatchSize: 2 });

    expect(first.items.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(first.nextCursor).toBeTruthy();
  });

  it("returns non-overlapping second page in order", () => {
    const plans = ["p1", "p2", "p3", "p4", "p5"].map(makePlan);
    const batcher = new DeckBatcher({}, { now: () => 1_000 });

    const first = batcher.batch(plans, { requestedBatchSize: 2 });
    const second = batcher.batch(plans, { cursor: first.nextCursor, requestedBatchSize: 2 });

    expect(second.items.map((p) => p.id)).toEqual(["p3", "p4"]);
  });

  it("uses snapshot ordering across pages when sessionId is present", () => {
    const store = new MemoryDeckSnapshotStore();
    let nowMs = 1_000;
    const batcher = new DeckBatcher({}, { store, now: () => nowMs });

    const firstInput = ["p1", "p2", "p3", "p4", "p5"].map(makePlan);
    const first = batcher.batch(firstInput, { requestedBatchSize: 2, sessionId: "session_1" });

    const secondInput = ["p4", "p3", "p2", "p1", "p5"].map(makePlan);
    nowMs += 10;
    const second = batcher.batch(secondInput, {
      cursor: first.nextCursor,
      requestedBatchSize: 2,
      sessionId: "session_1"
    });

    expect(second.items.map((p) => p.id)).toEqual(["p3", "p4"]);
  });

  it("clamps requested batch size", () => {
    const plans = Array.from({ length: 150 }, (_, idx) => makePlan(`p${idx}`));
    const batcher = new DeckBatcher({}, { now: () => 1_000 });

    const first = batcher.batch(plans, { requestedBatchSize: 1_000 });

    expect(first.items).toHaveLength(100);
    const decoded = decodeCursor(first.nextCursor as string);
    expect(decoded?.batchSize).toBe(100);
  });

  it("throws ValidationError for expired cursor", () => {
    const batcher = new DeckBatcher({}, { now: () => 1_000_000 });
    const expiredCursor = encodeCursor({
      v: 2,
      offset: 5,
      batchSize: 10,
      createdAtMs: 1_000_000 - 31 * 60 * 1000
    });

    expect(() => batcher.batch([makePlan("p1")], { cursor: expiredCursor })).toThrowError(ValidationError);
  });
});
