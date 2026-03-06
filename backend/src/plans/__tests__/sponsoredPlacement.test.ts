import { describe, expect, it } from "vitest";

import type { Plan } from "../plan.js";
import type { SearchPlansInput } from "../types.js";
import { applySponsoredPlacement, isSponsoredPlan } from "../router/sponsored/sponsoredPlacement.js";

function makeOrganic(index: number, category: Plan["category"] = "food"): Plan {
  return {
    id: `organic-${index}`,
    source: "places",
    sourceId: `organic-${index}`,
    title: `Organic ${index}`,
    category,
    location: { lat: 37.775, lng: -122.418 }
  };
}

function makeSponsored(index: number, category: Plan["category"] = "food"): Plan {
  return {
    id: `sponsored-${index}`,
    source: "promoted",
    sourceId: `sponsored-${index}`,
    title: `Sponsored ${index}`,
    category,
    location: { lat: 37.775, lng: -122.418 },
    metadata: {
      kind: "promoted"
    }
  };
}

function fixturePlans(): Plan[] {
  const organic = Array.from({ length: 40 }, (_, i) => makeOrganic(i + 1));
  const sponsored = Array.from({ length: 10 }, (_, i) => makeSponsored(i + 1));
  return [...organic, ...sponsored];
}

const baseInput: SearchPlansInput = {
  location: { lat: 37.775, lng: -122.418 },
  radiusMeters: 1_000
};

describe("applySponsoredPlacement", () => {
  it("caps sponsored insertion and spaces placements", () => {
    const result = applySponsoredPlacement(
      fixturePlans(),
      { input: baseInput },
      { ratioN: 10, windowSize: 50, maxSponsoredTotal: 3, minGap: 10, includeDebug: true }
    );

    expect(result.debug?.sponsoredInserted).toBeLessThanOrEqual(3);

    const sponsoredIndices = result.plans
      .map((plan, idx) => (isSponsoredPlan(plan, { sponsoredSources: ["promoted"] }) ? idx : -1))
      .filter((idx) => idx >= 0);

    for (let i = 1; i < sponsoredIndices.length; i += 1) {
      expect(sponsoredIndices[i] - sponsoredIndices[i - 1]).toBeGreaterThanOrEqual(10);
    }
  });

  it("labels inserted sponsored plans", () => {
    const result = applySponsoredPlacement(
      fixturePlans(),
      { input: baseInput },
      { ratioN: 10, windowSize: 50, maxSponsoredTotal: 3, includeDebug: true }
    );

    const insertedSponsored = result.plans.filter((plan) => (plan.metadata as Record<string, unknown> | undefined)?.sponsored === true);
    expect(insertedSponsored.length).toBeGreaterThan(0);

    for (const plan of insertedSponsored) {
      const metadata = plan.metadata as Record<string, unknown>;
      expect(metadata.sponsored).toBe(true);
      expect(metadata.sponsoredLabel).toBeDefined();
    }
  });

  it("drops sponsored plans that do not match explicit single-category filter", () => {
    const result = applySponsoredPlacement(
      fixturePlans(),
      {
        input: {
          ...baseInput,
          categories: ["outdoors"]
        }
      },
      { includeDebug: true }
    );

    expect(result.debug?.sponsoredDroppedByCategory).toBeGreaterThan(0);
    const sponsoredInResult = result.plans.filter((plan) => plan.source === "promoted");
    expect(sponsoredInResult).toHaveLength(0);
  });

  it("avoids sponsored placement in first positions when enough organic plans exist", () => {
    const result = applySponsoredPlacement(
      fixturePlans(),
      { input: baseInput },
      { placeFirstSponsoredAfter: 3, includeDebug: true }
    );

    expect(result.plans.slice(0, 3).every((plan) => plan.source !== "promoted")).toBe(true);
  });

  it("is deterministic", () => {
    const first = applySponsoredPlacement(
      fixturePlans(),
      { input: baseInput },
      { ratioN: 10, windowSize: 50, maxSponsoredTotal: 3 }
    );
    const second = applySponsoredPlacement(
      fixturePlans(),
      { input: baseInput },
      { ratioN: 10, windowSize: 50, maxSponsoredTotal: 3 }
    );

    expect(first.plans.map((plan) => plan.id)).toEqual(second.plans.map((plan) => plan.id));
  });

  it("does not drop organic plans", () => {
    const sourcePlans = fixturePlans();
    const organicIds = sourcePlans.filter((plan) => plan.source !== "promoted").map((plan) => plan.id);

    const result = applySponsoredPlacement(sourcePlans, { input: baseInput }, { includeDebug: true });
    const resultOrganicIds = result.plans.filter((plan) => plan.source !== "promoted").map((plan) => plan.id);

    expect(resultOrganicIds).toEqual(organicIds);
  });
});
