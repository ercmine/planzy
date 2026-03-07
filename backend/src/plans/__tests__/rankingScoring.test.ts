import { describe, expect, it } from "vitest";

import type { Plan } from "../plan.js";
import { validatePlan } from "../planValidation.js";
import { rankPlansAdvanced, scorePlan } from "../router/rankingEngine.js";
import type { SearchPlansInput } from "../types.js";

const NOW = new Date("2026-03-01T12:00:00.000Z");

const BASE_INPUT: SearchPlansInput = {
  location: { lat: 44.98, lng: -93.26 },
  radiusMeters: 3000,
  limit: 20
};

function makePlan(input: Partial<Plan> & Pick<Plan, "id" | "title" | "category">): Plan {
  return validatePlan({
    id: input.id,
    source: input.source ?? "google",
    sourceId: input.sourceId ?? input.id,
    title: input.title,
    category: input.category,
    location: input.location ?? { lat: 44.98, lng: -93.26, address: "123 Main St" },
    hours: input.hours,
    priceLevel: input.priceLevel,
    rating: input.rating,
    reviewCount: input.reviewCount,
    distanceMeters: input.distanceMeters,
    metadata: input.metadata
  });
}

describe("ranking scoring", () => {
  it("boosts category matches", () => {
    const food = makePlan({ id: "food", title: "Food Place", category: "food" });
    const outdoors = makePlan({ id: "out", title: "Trail", category: "outdoors" });

    const ranked = rankPlansAdvanced([outdoors, food], { input: { ...BASE_INPUT, categories: ["food"] }, now: NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["food", "out"]);
  });

  it("applies openNow boosts and penalties", () => {
    const open = makePlan({ id: "open", title: "Open", category: "food", hours: { openNow: true } });
    const unknown = makePlan({ id: "unknown", title: "Unknown", category: "food" });
    const closed = makePlan({ id: "closed", title: "Closed", category: "food", hours: { openNow: false } });

    const ranked = rankPlansAdvanced([unknown, closed, open], { input: { ...BASE_INPUT, openNow: true }, now: NOW }, { includeScorecards: true });
    expect(ranked.plans.map((plan) => plan.id)).toEqual(["open", "unknown", "closed"]);
    expect(ranked.scorecards?.find((card) => card.id === "closed")?.parts.openNow).toBe(-18);
  });

  it("penalizes plans above requested max price", () => {
    const cheap = makePlan({ id: "cheap", title: "Cheap", category: "food", priceLevel: 2 });
    const pricey = makePlan({ id: "pricey", title: "Pricey", category: "food", priceLevel: 3 });

    const result = rankPlansAdvanced([pricey, cheap], { input: { ...BASE_INPUT, priceLevelMax: 2 }, now: NOW }, { includeScorecards: true });
    expect(result.plans.map((plan) => plan.id)).toEqual(["cheap", "pricey"]);
    expect(result.scorecards?.find((card) => card.id === "pricey")?.parts.priceFit).toBe(-25);
  });

  it("ranks higher popularity above lower popularity", () => {
    const high = makePlan({ id: "high", title: "High", category: "food", rating: 4.8, reviewCount: 1200 });
    const low = makePlan({ id: "low", title: "Low", category: "food", rating: 3.7, reviewCount: 20 });

    const ranked = rankPlansAdvanced([low, high], { input: BASE_INPUT, now: NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["high", "low"]);
  });

  it("ranks nearer plan higher when all else equal", () => {
    const near = makePlan({ id: "near", title: "Near", category: "food", distanceMeters: 1000, rating: 4, reviewCount: 100 });
    const far = makePlan({ id: "far", title: "Far", category: "food", distanceMeters: 2500, rating: 4, reviewCount: 100 });

    const ranked = rankPlansAdvanced([far, near], { input: BASE_INPUT, now: NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["near", "far"]);
  });

  it("applies novelty penalty for seen ids", () => {
    const fresh = makePlan({ id: "fresh", title: "Fresh", category: "food" });
    const seen = makePlan({ id: "seen", title: "Seen", category: "food" });

    const result = rankPlansAdvanced([seen, fresh], { input: BASE_INPUT, now: NOW, signals: { seenPlanIds: ["seen"] } }, { includeScorecards: true });
    expect(result.plans.map((plan) => plan.id)).toEqual(["fresh", "seen"]);
    expect(result.scorecards?.find((card) => card.id === "seen")?.parts.novelty).toBe(-100);
  });

  it("gives user idea / byo a moderate boost", () => {
    const normal = makePlan({ id: "normal", title: "Normal", category: "food", source: "curated", rating: 4.4, reviewCount: 300 });
    const byo = makePlan({
      id: "byo",
      title: "BYO Idea",
      category: "food",
      source: "byo",
      rating: 4.4,
      reviewCount: 300,
      metadata: { kind: "user_idea", createdAtISO: "2026-02-28T10:00:00.000Z" }
    });
    const better = makePlan({
      id: "better",
      title: "Much Better",
      category: "food",
      source: "google",
      rating: 5,
      reviewCount: 5000,
      hours: { openNow: true }
    });

    const byoScore = scorePlan(byo, { input: BASE_INPUT, now: NOW });
    const normalScore = scorePlan(normal, { input: BASE_INPUT, now: NOW });

    expect(byoScore.parts.userIdeaBoost).toBeGreaterThanOrEqual(10);
    expect(byoScore.total).toBeGreaterThan(normalScore.total);

    const ranked = rankPlansAdvanced([normal, byo, better], { input: { ...BASE_INPUT, openNow: true }, now: NOW }).plans;
    expect(ranked.map((plan) => plan.id)).toEqual(["better", "byo", "normal"]);
  });
});
