import type { Plan } from "../plan.js";
import type { SearchPlansInput } from "../types.js";

export interface RankContext {
  input: SearchPlansInput;
  now: Date;
}

function scoreDistance(distanceMeters?: number): number {
  if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters)) {
    return 0;
  }
  const distanceKm = Math.max(0, distanceMeters) / 1000;
  return Math.max(0, 15 - distanceKm * 3);
}

function scoreReviewCount(reviewCount?: number): number {
  if (typeof reviewCount !== "number" || !Number.isFinite(reviewCount) || reviewCount < 0) {
    return 0;
  }
  return Math.min(9, Math.log10(reviewCount + 1) * 3);
}

function scorePlan(plan: Plan, ctx: RankContext): number {
  let score = 0;

  const categories = ctx.input.categories;
  if (Array.isArray(categories) && categories.includes(plan.category)) {
    score += 20;
  }

  if (ctx.input.openNow === true) {
    if (plan.hours?.openNow === true) {
      score += 15;
    } else if (plan.hours?.openNow === undefined) {
      score -= 5;
    }
  }

  score += scoreDistance(plan.distanceMeters);

  if (typeof plan.rating === "number" && Number.isFinite(plan.rating)) {
    score += Math.max(0, plan.rating) * 2;
  }

  score += scoreReviewCount(plan.reviewCount);

  if (ctx.input.priceLevelMax !== undefined) {
    if (typeof plan.priceLevel === "number") {
      score += plan.priceLevel <= ctx.input.priceLevelMax ? 6 : -20;
    }
  }

  return score;
}

export function rankPlans(plans: Plan[], ctx: RankContext): Plan[] {
  return [...plans].sort((a, b) => {
    const scoreDiff = scorePlan(b, ctx) - scorePlan(a, ctx);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    const distanceA = typeof a.distanceMeters === "number" && Number.isFinite(a.distanceMeters) ? a.distanceMeters : Number.POSITIVE_INFINITY;
    const distanceB = typeof b.distanceMeters === "number" && Number.isFinite(b.distanceMeters) ? b.distanceMeters : Number.POSITIVE_INFINITY;
    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }

    const titleDiff = a.title.localeCompare(b.title);
    if (titleDiff !== 0) {
      return titleDiff;
    }

    return a.id.localeCompare(b.id);
  });
}
