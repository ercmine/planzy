import { describe, expect, it, vi } from "vitest";

import { InMemoryPlaceStore } from "../memoryStore.js";
import { PlaceMaintenanceService } from "../maintenance.js";
import type { CanonicalPlace, PlaceAttachmentLink, PlaceSourceRecord } from "../types.js";

function makePlace(id: string, name: string, lat: number, lng: number): CanonicalPlace {
  return {
    canonicalPlaceId: id,
    slug: id,
    status: "active",
    primaryDisplayName: name,
    alternateNames: [],
    latitude: lat,
    longitude: lng,
    geohash: "",
    canonicalCategory: "restaurant",
    providerCategories: ["restaurant"],
    tags: [],
    cuisineTags: [],
    vibeTags: [],
    socialLinks: {},
    descriptionStatus: "empty",
    descriptionConfidence: 0,
    descriptionVersion: 1,
    alternateDescriptions: [],
    descriptionProvenance: [],
    aiGeneratedDescription: false,
    editorialDescription: false,
    descriptionCandidates: [],
    photoGallery: [],
    providerPhotoRefs: [],
    normalizedHours: {},
    rawHoursText: [],
    dataCompletenessScore: 0.4,
    mergeConfidence: 0.6,
    categoryConfidence: 0.7,
    geocodeConfidence: 0.8,
    permanentlyClosed: false,
    temporarilyClosed: false,
    sourceLinks: [],
    sourceRecordIds: [],
    fieldAttribution: [],
    manualOverrides: {},
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    lastNormalizedAt: new Date().toISOString(),
    lastMergedAt: new Date().toISOString()
  };
}

function makeSource(sourceRecordId: string, canonicalPlaceId: string, provider = "osm"): PlaceSourceRecord {
  return {
    sourceRecordId,
    provider,
    providerPlaceId: sourceRecordId,
    canonicalPlaceId,
    rawPayload: {},
    rawPayloadHash: sourceRecordId,
    normalizedPayload: {
      provider,
      providerPlaceId: sourceRecordId,
      name: "n",
      aliases: [],
      normalizedName: "n",
      latitude: 0,
      longitude: 0,
      providerCategories: ["restaurant"],
      tags: [],
      socialLinks: {},
      normalizedHours: {},
      rawHoursText: [],
      photos: [],
      permanentlyClosed: false,
      temporarilyClosed: false,
      comparisonAddress: "",
      raw: {}
    },
    fetchTimestamp: new Date().toISOString(),
    sourceConfidence: 0.9,
    version: 1
  };
}

describe("place maintenance", () => {
  it("detects duplicate candidates with explicit evidence", () => {
    const store = new InMemoryPlaceStore();
    store.upsertCanonicalPlace({ ...makePlace("p1", "Sunrise Cafe", 40.7128, -74.006), formattedAddress: "123 Main St NYC", phone: "+12125551234" });
    store.upsertCanonicalPlace({ ...makePlace("p2", "Sunrise Cafe NYC", 40.71281, -74.00601), formattedAddress: "123 Main Street New York", phone: "+12125551234" });

    const service = new PlaceMaintenanceService(store);
    const candidates = service.detectDuplicateCandidates();

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.reasons.join("|")).toContain("geo_close");
  });

  it("safely merges and relinks source + first-party attachments with dedupe", () => {
    const store = new InMemoryPlaceStore();
    store.upsertCanonicalPlace(makePlace("p_target", "Rich Place", 40, -73));
    store.upsertCanonicalPlace(makePlace("p_source", "Rich Place Inc", 40.0001, -73.0001));
    store.upsertSourceRecord(makeSource("src_a", "p_source"));
    store.upsertAttachmentLink({ id: "save-1", placeId: "p_target", attachmentType: "save", attachmentId: "save:alice", ownerUserId: "alice", metadata: {} });
    store.upsertAttachmentLink({ id: "save-2", placeId: "p_source", attachmentType: "save", attachmentId: "save:alice", ownerUserId: "alice", metadata: {} });
    store.upsertAttachmentLink({ id: "video-1", placeId: "p_source", attachmentType: "video", attachmentId: "vid-1", metadata: {} });

    const onRecompute = vi.fn();
    const service = new PlaceMaintenanceService(store, { onRecompute });
    const merged = service.mergePlaces({ targetPlaceId: "p_target", sourcePlaceIds: ["p_source"], actorUserId: "admin-1" });

    expect(merged.sourceRecordIds).toContain("src_a");
    expect(store.getCanonicalPlace("p_source")?.status).toBe("merged");
    expect(store.listAttachmentLinks("p_target").filter((item) => item.attachmentType === "save")).toHaveLength(1);
    expect(store.listAttachmentLinks("p_target").some((item) => item.attachmentType === "video")).toBe(true);
    expect(onRecompute).toHaveBeenCalled();
  });

  it("supports manual correction + override persistence", () => {
    const store = new InMemoryPlaceStore();
    store.upsertCanonicalPlace(makePlace("p1", "Old Name", 0, 0));
    const service = new PlaceMaintenanceService(store);

    service.correctPlace({
      placeId: "p1",
      actorUserId: "admin",
      reason: "fix_name",
      updates: { primaryDisplayName: "Correct Name", canonicalCategory: "museum" }
    });

    const place = store.getCanonicalPlace("p1");
    expect(place?.primaryDisplayName).toBe("Correct Name");
    expect(place?.manualOverrides.primaryDisplayName).toBe("Correct Name");
    expect(place?.manualOverrides.canonicalCategory).toBe("museum");
  });

  it("tracks candidate review and audit history", () => {
    const store = new InMemoryPlaceStore();
    store.upsertCanonicalPlace(makePlace("a", "Dup A", 1, 1));
    store.upsertCanonicalPlace(makePlace("b", "Dup A", 1.00001, 1.00001));
    const service = new PlaceMaintenanceService(store);
    const [candidate] = service.detectDuplicateCandidates();
    expect(candidate).toBeTruthy();
    const updated = service.reviewDuplicateCandidate({ candidateId: candidate!.id, actorUserId: "op", status: "rejected", note: "different wings" });

    expect(updated?.status).toBe("rejected");
    expect(store.listMaintenanceAudits().some((item) => item.actionType === "candidate_review")).toBe(true);
  });

  it("blocks high-risk far-distance merge unless override is set", () => {
    const store = new InMemoryPlaceStore();
    store.upsertCanonicalPlace(makePlace("a", "Same Name", 40, -73));
    store.upsertCanonicalPlace(makePlace("b", "Same Name", 41, -73));
    const service = new PlaceMaintenanceService(store);

    expect(() => service.mergePlaces({ targetPlaceId: "a", sourcePlaceIds: ["b"], actorUserId: "op" })).toThrow(/too_far/);
    expect(() => service.mergePlaces({ targetPlaceId: "a", sourcePlaceIds: ["b"], actorUserId: "op", allowFarDistance: true })).not.toThrow();
  });

  it("reassigns place attachments safely", () => {
    const store = new InMemoryPlaceStore();
    store.upsertCanonicalPlace(makePlace("a", "A", 0, 0));
    store.upsertCanonicalPlace(makePlace("b", "B", 0, 0));
    const link: PlaceAttachmentLink = { id: "rev-1", placeId: "a", attachmentType: "review", attachmentId: "r-1", metadata: {} };
    store.upsertAttachmentLink(link);
    const service = new PlaceMaintenanceService(store);

    const moved = service.reassignAttachment({ actorUserId: "admin", linkId: "rev-1", toPlaceId: "b", reason: "retag" });
    expect(moved.placeId).toBe("b");
    expect(store.listMaintenanceAudits().some((entry) => entry.actionType === "attachment_relink")).toBe(true);
  });
});
