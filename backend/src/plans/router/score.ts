import type { PriceLevel } from "../plan.js";

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function safeNumber(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

export function log10p(x: number): number {
  return Math.log10(Math.max(0, x) + 1);
}

export function distanceScore(distanceMeters?: number): number {
  const distance = safeNumber(distanceMeters);
  if (distance === undefined) {
    return 0;
  }

  const distanceKm = Math.max(0, distance) / 1000;
  return clamp(18 - distanceKm * 3.2, 0, 18);
}

export function popularityScore(rating?: number, reviewCount?: number): number {
  const normalizedRating = clamp(safeNumber(rating) ?? 0, 0, 5);
  const ratingPart = normalizedRating * 2.2;

  const normalizedReviews = Math.max(0, safeNumber(reviewCount) ?? 0);
  const reviewPart = clamp(log10p(normalizedReviews) * 3.5, 0, 10);

  return clamp(ratingPart + reviewPart, 0, 18);
}

export function priceFitScore(
  planPrice?: PriceLevel,
  requestedMax?: PriceLevel,
  comfortMax?: PriceLevel
): number {
  if (requestedMax !== undefined) {
    if (planPrice === undefined) {
      return -2;
    }
    return planPrice <= requestedMax ? 8 : -25;
  }

  if (comfortMax !== undefined && planPrice !== undefined) {
    return planPrice <= comfortMax ? 4 : -8;
  }

  return 0;
}
