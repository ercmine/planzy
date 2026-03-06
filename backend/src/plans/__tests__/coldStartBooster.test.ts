import { describe, expect, it } from "vitest";

import type { Plan } from "../plan.js";
import { applyColdStartBooster } from "../router/coldStartBooster.js";
import type { SearchPlansInput } from "../types.js";

const baseInput: SearchPlansInput = {
  location: { lat: 37.7749, lng: -122.4194 },
  radiusMeters: 5_000,
  limit: 50
};

function makePlan(index: number, category: Plan["category"]): Plan {
  return {
    id: `${category}-${index}`,
    source: "test",
    sourceId: `${category}-${index}`,
    title: `${category}-${index}`,
    category,
    location: { lat: 37.77, lng: -122.41 }
  };
}

function maxRun(plans: Plan[]): number {
  let last: string | null = null;
  let run = 0;
  let max = 0;

  for (const plan of plans) {
    if (plan.category === last) {
      run += 1;
    } else {
      last = plan.category;
      run = 1;
    }
    max = Math.max(max, run);
  }

  return max;
}

describe("coldStartBooster", () => {
  it("interleaves categories in the first window and limits long runs when alternatives exist", () => {
    const plans: Plan[] = [
      ...Array.from({ length: 20 }, (_, idx) => makePlan(idx, "food")),
      ...Array.from({ length: 5 }, (_, idx) => makePlan(idx, "coffee")),
      ...Array.from({ length: 5 }, (_, idx) => makePlan(idx, "outdoors"))
    ];

    const result = applyColdStartBooster(plans, { input: baseInput }, { includeDebug: true });
    const firstTwelve = result.plans.slice(0, 12);
    const categories = new Set(firstTwelve.map((plan) => plan.category));

    expect(categories.size).toBeGreaterThanOrEqual(3);
    expect(maxRun(firstTwelve)).toBeLessThanOrEqual(3);
    expect(result.debug?.applied).toBe(true);
  });

  it("skips diversification for explicit single-category filters", () => {
    const plans: Plan[] = [
      ...Array.from({ length: 8 }, (_, idx) => makePlan(idx, "food")),
      ...Array.from({ length: 4 }, (_, idx) => makePlan(idx, "coffee"))
    ];

    const result = applyColdStartBooster(
      plans,
      { input: { ...baseInput, categories: ["food"] } },
      { includeDebug: true }
    );

    expect(result.plans.map((plan) => plan.id)).toEqual(plans.map((plan) => plan.id));
    expect(result.debug?.applied).toBe(false);
    expect(result.debug?.reason).toBe("explicit_single_category_filter");
  });

  it("enforces maxRun <= 3 in target window when enough alternatives exist", () => {
    const plans: Plan[] = [
      ...Array.from({ length: 12 }, (_, idx) => makePlan(idx, "food")),
      ...Array.from({ length: 10 }, (_, idx) => makePlan(idx, "coffee")),
      ...Array.from({ length: 10 }, (_, idx) => makePlan(idx, "outdoors"))
    ];

    const result = applyColdStartBooster(plans, { input: baseInput }, { targetWindow: 30 });

    expect(maxRun(result.plans.slice(0, 30))).toBeLessThanOrEqual(3);
  });

  it("never drops or duplicates plans", () => {
    const plans: Plan[] = [
      ...Array.from({ length: 14 }, (_, idx) => makePlan(idx, "food")),
      ...Array.from({ length: 7 }, (_, idx) => makePlan(idx, "coffee")),
      ...Array.from({ length: 3 }, (_, idx) => makePlan(idx, "outdoors")),
      ...Array.from({ length: 2 }, (_, idx) => makePlan(idx, "music"))
    ];

    const result = applyColdStartBooster(plans, { input: baseInput });
    const beforeIds = plans.map((plan) => plan.id).sort();
    const afterIds = result.plans.map((plan) => plan.id).sort();

    expect(result.plans).toHaveLength(plans.length);
    expect(afterIds).toEqual(beforeIds);
  });

  it("is deterministic across repeated runs", () => {
    const plans: Plan[] = [
      ...Array.from({ length: 16 }, (_, idx) => makePlan(idx, "food")),
      ...Array.from({ length: 8 }, (_, idx) => makePlan(idx, "coffee")),
      ...Array.from({ length: 6 }, (_, idx) => makePlan(idx, "outdoors"))
    ];

    const first = applyColdStartBooster(plans, { input: baseInput }).plans.map((plan) => plan.id);
    const second = applyColdStartBooster(plans, { input: baseInput }).plans.map((plan) => plan.id);

    expect(first).toEqual(second);
  });
});
