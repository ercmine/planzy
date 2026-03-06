import type { Plan } from "../plan.js";
import type { BoostResult, BoosterContext, BoosterDebug, BoosterOptions } from "./boosterTypes.js";

const DEFAULT_MAX_RUN = 3;
const DEFAULT_TARGET_WINDOW = 30;
const DEFAULT_MIN_CATEGORIES = 3;
const DEFAULT_CATEGORY_CAP_IN_WINDOW = 14;
const EARLY_VARIETY_WINDOW = 12;
const OTHER_CATEGORY = "other";

interface CategoryBucket {
  category: string;
  plans: Plan[];
  originalFirstIndex: number;
  scheduledCount: number;
}

function normalizeCategory(plan: Plan): string {
  return typeof plan.category === "string" && plan.category.length > 0 ? plan.category : OTHER_CATEGORY;
}

function categoryCounts(plans: Plan[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const plan of plans) {
    const category = normalizeCategory(plan);
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

function maxCategoryRun(plans: Plan[]): number {
  let maxRun = 0;
  let currentRun = 0;
  let lastCategory: string | null = null;

  for (const plan of plans) {
    const category = normalizeCategory(plan);
    if (category === lastCategory) {
      currentRun += 1;
    } else {
      lastCategory = category;
      currentRun = 1;
    }
    maxRun = Math.max(maxRun, currentRun);
  }

  return maxRun;
}

function createDebug(headBefore: Plan[], headAfter: Plan[], applied: boolean, reason: string | undefined): BoosterDebug {
  return {
    beforeTopCategories: categoryCounts(headBefore),
    afterTopCategories: categoryCounts(headAfter),
    maxRunBefore: maxCategoryRun(headBefore),
    maxRunAfter: maxCategoryRun(headAfter),
    applied,
    reason
  };
}

function compareBuckets(a: CategoryBucket, b: CategoryBucket): number {
  if (a.plans.length !== b.plans.length) {
    return b.plans.length - a.plans.length;
  }

  if (a.originalFirstIndex !== b.originalFirstIndex) {
    return a.originalFirstIndex - b.originalFirstIndex;
  }

  return a.category.localeCompare(b.category);
}

function buildBuckets(head: Plan[]): CategoryBucket[] {
  const byCategory = new Map<string, CategoryBucket>();

  for (const [index, plan] of head.entries()) {
    const category = normalizeCategory(plan);
    const existing = byCategory.get(category);
    if (existing) {
      existing.plans.push(plan);
      continue;
    }

    byCategory.set(category, {
      category,
      plans: [plan],
      originalFirstIndex: index,
      scheduledCount: 0
    });
  }

  return [...byCategory.values()];
}

function pickBucket(
  buckets: CategoryBucket[],
  state: { lastCategory: string | null; runLength: number; usedEarly: Set<string>; picks: number },
  opts: { maxRun: number; minCategories: number; categoryCapInWindow: number },
  relaxCap: boolean,
  relaxRun: boolean
): CategoryBucket | null {
  const activeBuckets = buckets.filter((bucket) => bucket.plans.length > 0).sort(compareBuckets);
  if (activeBuckets.length === 0) {
    return null;
  }

  const shouldPreferUnusedEarly =
    state.picks < EARLY_VARIETY_WINDOW &&
    state.usedEarly.size < opts.minCategories &&
    activeBuckets.some((bucket) => !state.usedEarly.has(bucket.category));

  const groups = shouldPreferUnusedEarly
    ? [
        activeBuckets.filter((bucket) => !state.usedEarly.has(bucket.category)),
        activeBuckets.filter((bucket) => state.usedEarly.has(bucket.category))
      ]
    : [activeBuckets];

  for (const group of groups) {
    for (const bucket of group) {
      if (!relaxCap && bucket.scheduledCount >= opts.categoryCapInWindow) {
        continue;
      }

      if (!relaxRun && state.lastCategory === bucket.category && state.runLength >= opts.maxRun) {
        continue;
      }

      return bucket;
    }
  }

  return null;
}

function shapeHead(head: Plan[], maxRun: number, minCategories: number, categoryCapInWindow: number): Plan[] {
  const orderedBuckets = buildBuckets(head);
  const output: Plan[] = [];

  const state = {
    lastCategory: null as string | null,
    runLength: 0,
    usedEarly: new Set<string>(),
    picks: 0
  };

  while (output.length < head.length) {
    const chosen =
      pickBucket(orderedBuckets, state, { maxRun, minCategories, categoryCapInWindow }, false, false) ??
      pickBucket(orderedBuckets, state, { maxRun, minCategories, categoryCapInWindow }, true, false) ??
      pickBucket(orderedBuckets, state, { maxRun, minCategories, categoryCapInWindow }, true, true);

    if (!chosen) {
      break;
    }

    const plan = chosen.plans.shift();
    if (!plan) {
      continue;
    }

    chosen.scheduledCount += 1;
    output.push(plan);

    if (state.lastCategory === chosen.category) {
      state.runLength += 1;
    } else {
      state.lastCategory = chosen.category;
      state.runLength = 1;
    }

    if (state.picks < EARLY_VARIETY_WINDOW) {
      state.usedEarly.add(chosen.category);
    }

    state.picks += 1;
  }

  if (output.length < head.length) {
    const remainingSet = new Set(output.map((plan) => plan.id));
    for (const plan of head) {
      if (!remainingSet.has(plan.id)) {
        output.push(plan);
      }
    }
  }

  return output;
}

export function applyColdStartBooster(
  plans: Plan[],
  ctx: BoosterContext,
  opts?: BoosterOptions & { includeDebug?: boolean }
): BoostResult {
  const includeDebug = opts?.includeDebug === true;

  if (plans.length <= 1) {
    return {
      plans,
      debug: includeDebug ? createDebug(plans, plans, false, "insufficient_plans") : undefined
    };
  }

  if (opts?.enabled === false) {
    return {
      plans,
      debug: includeDebug ? createDebug(plans, plans, false, "disabled") : undefined
    };
  }

  const respectsExplicitCategoryFilter = opts?.respectExplicitCategoryFilter !== false;
  if (ctx.input.categories?.length === 1 && respectsExplicitCategoryFilter) {
    return {
      plans,
      debug: includeDebug ? createDebug(plans, plans, false, "explicit_single_category_filter") : undefined
    };
  }

  const maxRun = opts?.maxRun ?? DEFAULT_MAX_RUN;
  const targetWindow = opts?.targetWindow ?? DEFAULT_TARGET_WINDOW;
  const minCategories = opts?.minCategories ?? DEFAULT_MIN_CATEGORIES;
  const categoryCapInWindow = opts?.categoryCapInWindow ?? DEFAULT_CATEGORY_CAP_IN_WINDOW;

  const windowSize = Math.max(0, Math.min(targetWindow, plans.length));
  if (windowSize <= 1) {
    return {
      plans,
      debug: includeDebug ? createDebug(plans, plans, false, "insufficient_window") : undefined
    };
  }

  const head = plans.slice(0, windowSize);
  const tail = plans.slice(windowSize);
  const shapedHead = shapeHead(head, Math.max(1, maxRun), Math.max(1, minCategories), Math.max(1, categoryCapInWindow));
  const boosted = [...shapedHead, ...tail];

  return {
    plans: boosted,
    debug: includeDebug ? createDebug(head, shapedHead, true, undefined) : undefined
  };
}
