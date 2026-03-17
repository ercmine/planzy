import { describe, expect, it } from "vitest";

import { MemoryCollectionStore } from "../memoryStore.js";
import { CollectionsService } from "../service.js";
import type { CanonicalPlaceSnapshot, CollectionDefinition } from "../types.js";

const places: CanonicalPlaceSnapshot[] = [
  { canonicalPlaceId: "p1", cityId: "minneapolis", districtId: "north-loop", neighborhoodId: "north-loop", cuisineTags: ["coffee", "brunch"], attractionTags: ["cafe"], sceneTags: ["hidden_gems"] },
  { canonicalPlaceId: "p2", cityId: "minneapolis", districtId: "north-loop", neighborhoodId: "north-loop", cuisineTags: ["coffee"], attractionTags: ["cafe"], sceneTags: ["nightlife"] },
  { canonicalPlaceId: "p3", cityId: "minneapolis", districtId: "downtown", neighborhoodId: "downtown", cuisineTags: ["tacos"], attractionTags: ["museum"], sceneTags: ["date_night"] },
  { canonicalPlaceId: "p4", cityId: "minneapolis", districtId: "north-loop", neighborhoodId: "north-loop", cuisineTags: ["coffee"], attractionTags: ["park"], sceneTags: ["hidden_gems"], deleted: true }
];

const districtBrunch: CollectionDefinition = {
  id: "district-brunch",
  slug: "north-loop-brunch",
  title: "North Loop Brunch",
  description: "Finish brunch staples",
  type: "district",
  source: "curated",
  status: "active",
  visibility: "public",
  qualifyingActionType: "review",
  explicitPlaceIds: ["p1", "p2"],
  reward: { xp: 120, badgeId: "north-loop-brunch" },
  createdAtISO: "2026-01-01T00:00:00.000Z",
  updatedAtISO: "2026-01-01T00:00:00.000Z"
};

const coffeeScene: CollectionDefinition = {
  id: "coffee-scene",
  slug: "north-loop-coffee",
  title: "North Loop Coffee",
  description: "Collect coffee spots",
  type: "cuisine",
  source: "rule_based",
  status: "active",
  visibility: "public",
  qualifyingActionType: "save",
  rules: { cityId: "minneapolis", districtId: "north-loop", cuisineTags: ["coffee"], minPlaceCount: 2 },
  requiredCount: 2,
  createdAtISO: "2026-01-01T00:00:00.000Z",
  updatedAtISO: "2026-01-01T00:00:00.000Z"
};

describe("CollectionsService", () => {
  it("resolves curated and rule-based membership anchored by canonical places", () => {
    const service = new CollectionsService(new MemoryCollectionStore(places, [districtBrunch, coffeeScene]));
    const list = service.listAvailableCollections("u1");
    expect(list.find((x) => x.id === "district-brunch")?.totalItems).toBe(2);
    expect(list.find((x) => x.id === "coffee-scene")?.totalItems).toBe(2);
    const detail = service.getCollectionDetail("u1", "coffee-scene");
    expect(detail?.members.map((x) => x.canonicalPlaceId)).toEqual(["p1", "p2"]);
  });

  it("tracks progress and completion with anti-spam duplicate blocking", async () => {
    const service = new CollectionsService(new MemoryCollectionStore(places, [districtBrunch]));
    const r1 = await service.recordActivity({ eventId: "e1", userId: "u1", canonicalPlaceId: "p1", actionType: "review", occurredAtISO: "2026-01-02T00:00:00.000Z" });
    const r2 = await service.recordActivity({ eventId: "e2", userId: "u1", canonicalPlaceId: "p1", actionType: "review", occurredAtISO: "2026-01-02T00:00:01.000Z" });
    const r3 = await service.recordActivity({ eventId: "e3", userId: "u1", canonicalPlaceId: "p2", actionType: "review", occurredAtISO: "2026-01-02T00:01:00.000Z" });
    expect(r1.updated).toContain("district-brunch");
    expect(r2.updated).toHaveLength(0);
    expect(r3.completed).toContain("district-brunch");
    const detail = service.getCollectionDetail("u1", "district-brunch");
    expect(detail?.status).toBe("completed");
    expect(detail?.completedItems).toBe(2);
  });

  it("applies moderation and trust gating for creator-style collections", async () => {
    const creatorCollection: CollectionDefinition = {
      ...districtBrunch,
      id: "creator-scene",
      qualifyingActionType: "video",
      trustGate: { requireTrustedCreator: true, minTrustScore: 60, maxModerationStrikes: 1 }
    };
    const service = new CollectionsService(new MemoryCollectionStore(places, [creatorCollection]));
    const blocked = await service.recordActivity({ eventId: "e4", userId: "u1", canonicalPlaceId: "p1", actionType: "video", occurredAtISO: "2026-01-02T00:00:00.000Z", trustedCreator: false, trustScore: 10 });
    const modBlocked = await service.recordActivity({ eventId: "e5", userId: "u1", canonicalPlaceId: "p2", actionType: "video", occurredAtISO: "2026-01-02T00:00:01.000Z", trustedCreator: true, trustScore: 80, moderationState: "removed" });
    const ok = await service.recordActivity({ eventId: "e6", userId: "u1", canonicalPlaceId: "p1", actionType: "video", occurredAtISO: "2026-01-02T00:00:02.000Z", trustedCreator: true, trustScore: 80 });
    expect(blocked.updated).toHaveLength(0);
    expect(modBlocked.updated).toHaveLength(0);
    expect(ok.updated).toContain("creator-scene");
  });

  it("is idempotent for duplicate event ids", async () => {
    const service = new CollectionsService(new MemoryCollectionStore(places, [coffeeScene]));
    await service.recordActivity({ eventId: "same", userId: "u1", canonicalPlaceId: "p1", actionType: "save", occurredAtISO: "2026-01-02T00:00:00.000Z" });
    const again = await service.recordActivity({ eventId: "same", userId: "u1", canonicalPlaceId: "p2", actionType: "save", occurredAtISO: "2026-01-02T00:00:01.000Z" });
    expect(again.ignored).toBe(true);
    const detail = service.getCollectionDetail("u1", "coffee-scene");
    expect(detail?.completedItems).toBe(1);
  });
});
