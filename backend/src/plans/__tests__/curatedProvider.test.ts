import { describe, expect, it } from "vitest";

import { validatePlanArray } from "../planValidation.js";
import { CuratedProvider } from "../curated/curatedProvider.js";

describe("CuratedProvider", () => {
  const baseInput = {
    location: { lat: 37.775, lng: -122.418 },
    radiusMeters: 10_000,
    limit: 20
  };

  it("returns templates when includeTemplates is true", async () => {
    const provider = new CuratedProvider({ includeTemplates: true, enableLocalSuggestions: false });
    const result = await provider.searchPlans(baseInput);

    expect(result.plans.length).toBeGreaterThan(0);
    expect(result.plans.some((plan) => plan.sourceId.startsWith("template:"))).toBe(true);
  });

  it("returns suggestions when enableLocalSuggestions is true", async () => {
    const provider = new CuratedProvider({ includeTemplates: false, enableLocalSuggestions: true, maxSuggestions: 5 });
    const result = await provider.searchPlans(baseInput);

    expect(result.plans.length).toBeGreaterThan(0);
    expect(result.plans.every((plan) => plan.sourceId.startsWith("suggestion:"))).toBe(true);
  });

  it("biases results toward requested categories", async () => {
    const provider = new CuratedProvider({ includeTemplates: true, enableLocalSuggestions: true, maxTemplates: 12, maxSuggestions: 6 });
    const result = await provider.searchPlans({
      ...baseInput,
      categories: ["sports"]
    });

    const sportsCount = result.plans.filter((plan) => plan.category === "sports").length;
    expect(sportsCount).toBeGreaterThanOrEqual(Math.ceil(result.plans.length / 2));
  });

  it("supports cursor pagination", async () => {
    const provider = new CuratedProvider({ includeTemplates: true, enableLocalSuggestions: true, maxTemplates: 20, maxSuggestions: 8 });
    const page1 = await provider.searchPlans({ ...baseInput, limit: 5 });
    const page2 = await provider.searchPlans({ ...baseInput, limit: 5, cursor: page1.nextCursor ?? null });

    expect(page1.plans).toHaveLength(5);
    expect(page2.plans).toHaveLength(5);
    expect(page1.plans[0]?.id).not.toBe(page2.plans[0]?.id);
  });

  it("returns plans that pass validatePlanArray", async () => {
    const provider = new CuratedProvider({ includeTemplates: true, enableLocalSuggestions: true });
    const result = await provider.searchPlans(baseInput);

    expect(() => validatePlanArray(result.plans)).not.toThrow();
  });
});
