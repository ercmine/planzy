import { describe, expect, it } from "vitest";

import { computeCanonicalPlaceCompleteness } from "../qualityScoring.js";
import type { CanonicalPlace, PlaceSourceRecord } from "../types.js";

const now = new Date().toISOString();

function makePlace(overrides: Partial<CanonicalPlace> = {}): CanonicalPlace {
  return {
    id: "pl_1",
    primaryName: "Place",
    latitude: 30,
    longitude: -97,
    status: "ACTIVE",
    visibilityStatus: "PUBLIC",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeSource(overrides: Partial<PlaceSourceRecord> = {}): PlaceSourceRecord {
  return {
    id: "src_1",
    canonicalPlaceId: "pl_1",
    sourceName: "osm",
    sourceRecordId: "node/1",
    rawTags: { amenity: "cafe" },
    rawPayload: {},
    sourceCategoryKeys: ["amenity"],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("canonical place completeness scoring", () => {
  it("scores complete places above incomplete records", () => {
    const complete = computeCanonicalPlaceCompleteness(
      makePlace({ city: "Austin", countryCode: "US", description: "Desc", phoneE164: "+15125551212", websiteUrl: "https://a.co", sourceFreshnessAt: now }),
      makeSource()
    );

    const sparse = computeCanonicalPlaceCompleteness(makePlace({ primaryName: "", latitude: Number.NaN, longitude: Number.NaN, status: "HIDDEN", visibilityStatus: "SUPPRESSED" }));
    expect(complete.score).toBeGreaterThan(sparse.score);
  });
});
