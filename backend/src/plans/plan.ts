import { makePlanId } from "./provider.js";

export const PLAN_CATEGORIES = [
  "food",
  "drinks",
  "coffee",
  "outdoors",
  "movies",
  "music",
  "shopping",
  "wellness",
  "sports",
  "other"
] as const;

export type Category = (typeof PLAN_CATEGORIES)[number];

export type PlanId = string;

export interface PlanPhoto {
  url: string;
  width?: number;
  height?: number;
}

export interface PlanHours {
  openNow?: boolean;
  weekdayText?: string[];
}

export interface PlanLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface PlanDeepLinks {
  maps?: string;
  website?: string;
  call?: string;
  booking?: string;
  ticket?: string;
}

export type PriceLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Plan is the canonical internal + API shape; providers must return Plan objects.
 */
export interface Plan {
  id: PlanId;
  source: string;
  sourceId: string;
  title: string;
  category: Category;
  description?: string;
  location: PlanLocation;
  distanceMeters?: number;
  priceLevel?: PriceLevel;
  rating?: number;
  reviewCount?: number;
  photos?: PlanPhoto[];
  hours?: PlanHours;
  deepLinks?: PlanDeepLinks;
  metadata?: Record<string, unknown>;
}

export function planId(source: string, sourceId: string): PlanId {
  if (typeof makePlanId === "function") {
    return makePlanId(source, sourceId);
  }
  return `${source}:${sourceId}`;
}

function stripPrivateMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripPrivateMetadata(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const source = value as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(source)) {
    if (key.startsWith("_")) {
      continue;
    }
    cleaned[key] = stripPrivateMetadata(child);
  }

  return cleaned;
}

export function toPublicPlan(plan: Plan): Plan {
  const cloned: Plan = {
    ...plan,
    location: { ...plan.location },
    photos: plan.photos?.map((photo) => ({ ...photo })),
    hours: plan.hours ? { ...plan.hours, weekdayText: plan.hours.weekdayText ? [...plan.hours.weekdayText] : undefined } : undefined,
    deepLinks: plan.deepLinks ? { ...plan.deepLinks } : undefined
  };

  if (plan.metadata) {
    cloned.metadata = stripPrivateMetadata(plan.metadata) as Record<string, unknown>;
  }

  return cloned;
}
