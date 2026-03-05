import type { Category, Plan, PriceLevel } from "./plan.js";

export type { Category, PriceLevel } from "./plan.js";

export interface TimeWindow {
  start: string;
  end: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SearchPlansInput {
  location: GeoPoint;
  radiusMeters: number;
  timeWindow?: TimeWindow;
  categories?: Category[];
  priceLevelMax?: PriceLevel;
  openNow?: boolean;
  limit?: number;
  cursor?: string | null;
  locale?: string;
}

export type NormalizedPlan = Plan;

export interface SearchPlansResult {
  plans: Plan[];
  nextCursor?: string | null;
  source: string;
  debug?: {
    tookMs: number;
    returned: number;
  };
}

export type { NormalizeOptions } from "./normalization/normalize.js";

export type { RouterSearchResult } from "./router/routerTypes.js";

export type { AppConfig, PlansRouterConfig, ProviderConfig, ProviderName } from "../config/schema.js";
