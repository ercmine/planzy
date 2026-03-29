import type { PlanDeepLinksLegacy, PlanDeepLinksV2 } from "./deeplinks/deepLinkTypes.js";
export declare const PLAN_CATEGORIES: readonly ["food", "drinks", "coffee", "outdoors", "movies", "music", "shopping", "wellness", "sports", "other"];
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
export interface PlanDeepLinks extends PlanDeepLinksV2 {
}
export type { PlanDeepLinksLegacy };
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
export declare function planId(source: string, sourceId: string): PlanId;
export declare function toPublicPlan(plan: Plan): Plan;
