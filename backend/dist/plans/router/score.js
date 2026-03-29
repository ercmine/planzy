export function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
}
export function safeNumber(x) {
    return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}
export function log10p(x) {
    return Math.log10(Math.max(0, x) + 1);
}
export function distanceScore(distanceMeters) {
    const distance = safeNumber(distanceMeters);
    if (distance === undefined) {
        return 0;
    }
    const distanceKm = Math.max(0, distance) / 1000;
    return clamp(18 - distanceKm * 3.2, 0, 18);
}
export function popularityScore(rating, reviewCount) {
    const normalizedRating = clamp(safeNumber(rating) ?? 0, 0, 5);
    const ratingPart = normalizedRating * 2.2;
    const normalizedReviews = Math.max(0, safeNumber(reviewCount) ?? 0);
    const reviewPart = clamp(log10p(normalizedReviews) * 3.5, 0, 10);
    return clamp(ratingPart + reviewPart, 0, 18);
}
export function priceFitScore(planPrice, requestedMax, comfortMax) {
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
