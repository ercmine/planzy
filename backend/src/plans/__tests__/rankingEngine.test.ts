import { describe, expect, it } from "vitest";

import type { Plan } from "../plan.js";
import { rankPlansAdvanced } from "../router/rankingEngine.js";
import type { SearchPlansInput } from "../types.js";

const FIXED_NOW = new Date("2026-03-01T12:00:00.000Z");

const baseInput: SearchPlansInput = {
  location: { lat: 37.7749, lng: -122.4194 },
  radiusMeters: 5_000,
  limit: 20
};

function makePlan(input: Partial<Plan> & Pick<Plan, "id" | "title" | "category">): Plan {
  const { id, title, category, ...overrides } = input;

  return {
    id,
    source: overrides.source ?? "google",
    sourceId: overrides.sourceId ?? id,
    title,
    category,
    location: overrides.location ?? { lat: 37.775, lng: -122.418, address: "123 Main St" },
    ...overrides
  };
}

describe("rankingEngine", () => {
  it("ranks near plans above far plans when otherwise equal", () => {
    const near = makePlan({ id: "near", title: "Near Place", category: "food", distanceMeters: 150 });
    const far = makePlan({ id: "far", title: "Far Place", category: "food", distanceMeters: 3000 });

    const ranked = rankPlansAdvanced([far, near], { input: baseInput, now: FIXED_NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["near", "far"]);
  });

  it("boosts requested category above non-matching category", () => {
    const coffee = makePlan({ id: "coffee", title: "Coffee Spot", category: "coffee" });
    const food = makePlan({ id: "food", title: "Food Spot", category: "food" });

    const ranked = rankPlansAdvanced([food, coffee], { input: { ...baseInput, categories: ["coffee"] }, now: FIXED_NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["coffee", "food"]);
  });

  it("prioritizes openNow true over unknown and penalizes closed", () => {
    const openPlan = makePlan({ id: "open", title: "Open", category: "food", hours: { openNow: true } });
    const unknownPlan = makePlan({ id: "unknown", title: "Unknown", category: "food" });
    const closedPlan = makePlan({ id: "closed", title: "Closed", category: "food", hours: { openNow: false } });

    const ranked = rankPlansAdvanced([unknownPlan, closedPlan, openPlan], { input: { ...baseInput, openNow: true }, now: FIXED_NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["open", "unknown", "closed"]);
  });

  it("ranks high rating and review count above low popularity", () => {
    const popular = makePlan({ id: "popular", title: "Popular", category: "food", rating: 4.8, reviewCount: 1500 });
    const niche = makePlan({ id: "niche", title: "Niche", category: "food", rating: 3.1, reviewCount: 12 });

    const ranked = rankPlansAdvanced([niche, popular], { input: baseInput, now: FIXED_NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["popular", "niche"]);
  });

  it("heavily penalizes plan prices above requested max", () => {
    const affordable = makePlan({ id: "cheap", title: "Affordable", category: "food", priceLevel: 2 });
    const expensive = makePlan({ id: "expensive", title: "Expensive", category: "food", priceLevel: 3 });

    const result = rankPlansAdvanced([expensive, affordable], { input: { ...baseInput, priceLevelMax: 2 }, now: FIXED_NOW }, { includeScorecards: true });
    expect(result.plans.map((plan) => plan.id)).toEqual(["cheap", "expensive"]);
    expect(result.scorecards?.find((card) => card.id === "expensive")?.parts.priceFit).toBe(-25);
  });

  it("applies hard novelty drop for seen plan ids", () => {
    const fresh = makePlan({ id: "fresh", title: "Fresh", category: "food" });
    const seen = makePlan({ id: "seen", title: "Seen", category: "food" });

    const ranked = rankPlansAdvanced(
      [seen, fresh],
      {
        input: baseInput,
        now: FIXED_NOW,
        signals: { seenPlanIds: ["seen"] }
      },
      { includeScorecards: true }
    );

    expect(ranked.plans.map((plan) => plan.id)).toEqual(["fresh", "seen"]);
    expect(ranked.scorecards?.find((card) => card.id === "seen")?.parts.novelty).toBe(-100);
  });

  it("boosts near-term events over similar non-events", () => {
    const soonEvent = makePlan({
      id: "event",
      title: "Tonight Event",
      category: "music",
      metadata: {
        kind: "event",
        startTimeISO: "2026-03-02T06:00:00.000Z"
      }
    });

    const nonEvent = makePlan({ id: "place", title: "Regular Place", category: "music" });

    const ranked = rankPlansAdvanced([nonEvent, soonEvent], { input: baseInput, now: FIXED_NOW }, { includeScorecards: true });
    expect(ranked.plans.map((plan) => plan.id)).toEqual(["event", "place"]);
    expect(ranked.scorecards?.find((card) => card.id === "event")?.parts.eventTime).toBe(6);
  });

  it("returns deterministic ordering for repeated runs", () => {
    const a = makePlan({ id: "a", title: "Alpha", category: "food", distanceMeters: 500, rating: 4.2, reviewCount: 100 });
    const b = makePlan({ id: "b", title: "Beta", category: "food", distanceMeters: 500, rating: 4.2, reviewCount: 100 });
    const c = makePlan({ id: "c", title: "Gamma", category: "food", distanceMeters: 500, rating: 4.2, reviewCount: 100 });

    const first = rankPlansAdvanced([c, b, a], { input: baseInput, now: FIXED_NOW }).plans.map((plan) => plan.id);
    const second = rankPlansAdvanced([c, b, a], { input: baseInput, now: FIXED_NOW }).plans.map((plan) => plan.id);

    expect(first).toEqual(second);
  });
});
