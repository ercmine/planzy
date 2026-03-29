import type { PriceLevel } from "../plan.js";
export declare function clamp(n: number, lo: number, hi: number): number;
export declare function safeNumber(x: unknown): number | undefined;
export declare function log10p(x: number): number;
export declare function distanceScore(distanceMeters?: number): number;
export declare function popularityScore(rating?: number, reviewCount?: number): number;
export declare function priceFitScore(planPrice?: PriceLevel, requestedMax?: PriceLevel, comfortMax?: PriceLevel): number;
