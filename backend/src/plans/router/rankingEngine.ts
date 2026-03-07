import type { Plan } from "../plan.js";
import type { RankingSignals } from "../provider.js";
import type { SearchPlansInput } from "../types.js";
import { noveltyPenalty } from "./novelty.js";
import { distanceScore, popularityScore, priceFitScore, safeNumber } from "./score.js";

const HIGH_QUALITY_SOURCES = new Set(["google", "yelp", "ticketmaster", "tmdb"]);
const STANDARD_SOURCES = new Set(["curated", "byo"]);
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const USER_IDEA_BASE_BOOST = 10;
const RECENT_USER_IDEA_BOOST = 3;
const USER_IDEA_BOOST_CAP = 12;

export interface RankContext {
  input: SearchPlansInput;
  now: Date;
  signals?: RankingSignals;
}

export interface PlanScorecard {
  id: string;
  total: number;
  parts: Record<string, number>;
  notes?: string[];
}

function finiteScore(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function eventTimeScore(plan: Plan, now: Date): number {
  const kind = typeof plan.metadata?.kind === "string" ? plan.metadata.kind : undefined;
  if (kind !== "event") {
    return 0;
  }

  const startTimeISO = typeof plan.metadata?.startTimeISO === "string" ? plan.metadata.startTimeISO : undefined;
  if (!startTimeISO) {
    return 0;
  }

  const startTimeMs = Date.parse(startTimeISO);
  if (!Number.isFinite(startTimeMs)) {
    return 0;
  }

  const delta = startTimeMs - now.getTime();
  if (delta < 0) {
    return -50;
  }

  if (delta <= 72 * HOUR_MS) {
    return 6;
  }

  return 2;
}


function userIdeaBoost(plan: Plan, now: Date): number {
  const kind = typeof plan.metadata?.kind === "string" ? plan.metadata.kind : undefined;
  const isUserIdea = kind === "user_idea" || plan.source === "byo";
  if (!isUserIdea) {
    return 0;
  }

  let boost = USER_IDEA_BASE_BOOST;
  const createdAtISO = typeof plan.metadata?.createdAtISO === "string" ? plan.metadata.createdAtISO : undefined;
  if (createdAtISO) {
    const createdAtMs = Date.parse(createdAtISO);
    if (Number.isFinite(createdAtMs)) {
      const ageMs = now.getTime() - createdAtMs;
      if (ageMs >= 0 && ageMs <= 7 * DAY_MS) {
        boost += RECENT_USER_IDEA_BOOST;
      }
    }
  }

  return Math.min(USER_IDEA_BOOST_CAP, boost);
}

function sourceQualityScore(source: string): number {
  if (HIGH_QUALITY_SOURCES.has(source)) {
    return 2;
  }

  if (STANDARD_SOURCES.has(source)) {
    return 1;
  }

  return 0;
}

function completenessScore(plan: Plan): number {
  let score = 0;

  if (plan.deepLinks?.websiteLink) {
    score += 1;
  }

  if (Array.isArray(plan.photos) && plan.photos.length > 0) {
    score += 1;
  }

  if (plan.location?.address) {
    score += 1;
  }

  return Math.min(3, score);
}

export function scorePlan(plan: Plan, ctx: RankContext): PlanScorecard {
  const parts: Record<string, number> = {};
  const notes: string[] = [];

  if (Array.isArray(ctx.input.categories) && ctx.input.categories.length > 0) {
    parts.categoryMatch = ctx.input.categories.includes(plan.category) ? 22 : -8;
  } else {
    parts.categoryMatch = 0;
  }

  if (ctx.signals?.preferredCategories?.includes(plan.category)) {
    parts.preferredCategory = 6;
  } else {
    parts.preferredCategory = 0;
  }

  if (ctx.signals?.avoidedCategories?.includes(plan.category)) {
    parts.avoidedCategory = -12;
  } else {
    parts.avoidedCategory = 0;
  }

  if (ctx.input.openNow === true) {
    if (plan.hours?.openNow === true) {
      parts.openNow = 14;
    } else if (plan.hours?.openNow === false) {
      parts.openNow = -18;
    } else {
      parts.openNow = -5;
    }
  } else {
    parts.openNow = 0;
  }

  parts.distance = distanceScore(plan.distanceMeters);
  parts.popularity = popularityScore(plan.rating, plan.reviewCount);
  parts.priceFit = priceFitScore(plan.priceLevel, ctx.input.priceLevelMax, ctx.signals?.priceComfortMax);

  const novelty = noveltyPenalty(plan, ctx.signals);
  parts.novelty = novelty.penalty;
  if (novelty.reason) {
    notes.push(novelty.reason);
  }

  parts.sourceQuality = sourceQualityScore(plan.source);
  parts.completeness = completenessScore(plan);
  parts.eventTime = eventTimeScore(plan, ctx.now);
  parts.userIdeaBoost = userIdeaBoost(plan, ctx.now);

  const total = finiteScore(Object.values(parts).reduce((sum, value) => sum + finiteScore(value), 0));

  return {
    id: plan.id,
    total,
    parts,
    notes: notes.length > 0 ? notes : undefined
  };
}

function comparePlans(a: Plan, b: Plan, byId: Map<string, PlanScorecard>): number {
  const scoreA = byId.get(a.id)?.total ?? 0;
  const scoreB = byId.get(b.id)?.total ?? 0;
  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }

  const distanceA = safeNumber(a.distanceMeters) ?? Number.POSITIVE_INFINITY;
  const distanceB = safeNumber(b.distanceMeters) ?? Number.POSITIVE_INFINITY;
  if (distanceA !== distanceB) {
    return distanceA - distanceB;
  }

  const reviewsA = safeNumber(a.reviewCount) ?? 0;
  const reviewsB = safeNumber(b.reviewCount) ?? 0;
  if (reviewsA !== reviewsB) {
    return reviewsB - reviewsA;
  }

  const ratingA = safeNumber(a.rating) ?? 0;
  const ratingB = safeNumber(b.rating) ?? 0;
  if (ratingA !== ratingB) {
    return ratingB - ratingA;
  }

  const titleDiff = a.title.localeCompare(b.title);
  if (titleDiff !== 0) {
    return titleDiff;
  }

  return a.id.localeCompare(b.id);
}

export function rankPlansAdvanced(
  plans: Plan[],
  ctx: RankContext,
  opts?: { includeScorecards?: boolean }
): { plans: Plan[]; scorecards?: PlanScorecard[] } {
  const scorecards = plans.map((plan) => scorePlan(plan, ctx));
  const scoreById = new Map(scorecards.map((card) => [card.id, card]));

  const ranked = [...plans].sort((a, b) => comparePlans(a, b, scoreById));

  if (opts?.includeScorecards) {
    const orderedScorecards = ranked.map((plan) => scoreById.get(plan.id)).filter((card): card is PlanScorecard => card !== undefined);
    return { plans: ranked, scorecards: orderedScorecards };
  }

  return { plans: ranked };
}
