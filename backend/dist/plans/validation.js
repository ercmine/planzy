import { ValidationError } from "./errors.js";
const MIN_RADIUS_METERS = 100;
const MAX_RADIUS_METERS = 50_000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_TIME_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export function validateSearchPlansInput(input) {
    const details = [];
    if (!input || typeof input !== "object") {
        throw new ValidationError(["input must be an object"]);
    }
    const rawInput = input;
    const latCandidate = input.location?.lat;
    const lngCandidate = input.location?.lng;
    const hasValidLat = typeof latCandidate === "number" && Number.isFinite(latCandidate) && latCandidate >= -90 && latCandidate <= 90;
    const hasValidLng = typeof lngCandidate === "number" && Number.isFinite(lngCandidate) && lngCandidate >= -180 && lngCandidate <= 180;
    if (!hasValidLat) {
        details.push("location.lat must be a number between -90 and 90");
    }
    if (!hasValidLng) {
        details.push("location.lng must be a number between -180 and 180");
    }
    let radiusMeters = input.radiusMeters;
    if (typeof radiusMeters !== "number" || Number.isNaN(radiusMeters) || !Number.isFinite(radiusMeters)) {
        details.push("radiusMeters must be a finite number");
        radiusMeters = MIN_RADIUS_METERS;
    }
    else {
        radiusMeters = Math.max(MIN_RADIUS_METERS, Math.min(MAX_RADIUS_METERS, Math.round(radiusMeters)));
    }
    const rawLimit = rawInput.batchSize ?? input.limit;
    let limit = DEFAULT_LIMIT;
    if (rawLimit === undefined) {
        limit = DEFAULT_LIMIT;
    }
    else if (typeof rawLimit !== "number" || Number.isNaN(rawLimit) || !Number.isFinite(rawLimit)) {
        details.push("limit must be a finite number");
    }
    else {
        limit = Math.round(rawLimit);
    }
    limit = Math.max(1, Math.min(MAX_LIMIT, limit));
    const cursor = input.cursor ?? null;
    if (cursor !== null && typeof cursor !== "string") {
        details.push("cursor must be a string or null");
    }
    if (input.timeWindow !== undefined) {
        const startMs = Date.parse(input.timeWindow.start);
        const endMs = Date.parse(input.timeWindow.end);
        if (Number.isNaN(startMs)) {
            details.push("timeWindow.start must be a valid ISO 8601 string");
        }
        if (Number.isNaN(endMs)) {
            details.push("timeWindow.end must be a valid ISO 8601 string");
        }
        if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
            if (startMs >= endMs) {
                details.push("timeWindow.start must be earlier than timeWindow.end");
            }
            if (endMs - startMs > MAX_TIME_WINDOW_MS) {
                details.push("timeWindow must not exceed 14 days");
            }
        }
    }
    if (input.categories !== undefined) {
        if (!Array.isArray(input.categories)) {
            details.push("categories must be an array");
        }
        else {
            const seen = new Set();
            for (const rawCategory of input.categories) {
                if (typeof rawCategory !== "string" || rawCategory.trim().length === 0) {
                    details.push("categories must contain non-empty strings");
                    break;
                }
                if (seen.has(rawCategory)) {
                    details.push("categories must not contain duplicates");
                    break;
                }
                seen.add(rawCategory);
            }
        }
    }
    if (input.priceLevelMax !== undefined) {
        const price = input.priceLevelMax;
        if (typeof price !== "number" || !Number.isInteger(price) || price < 0 || price > 4) {
            details.push("priceLevelMax must be an integer between 0 and 4");
        }
    }
    if (input.openNow !== undefined && typeof input.openNow !== "boolean") {
        details.push("openNow must be a boolean");
    }
    if (input.locale !== undefined && (typeof input.locale !== "string" || input.locale.trim() === "")) {
        details.push("locale must be a non-empty string");
    }
    if (details.length > 0) {
        throw new ValidationError(details);
    }
    return {
        location: { lat: latCandidate, lng: lngCandidate },
        radiusMeters,
        timeWindow: input.timeWindow,
        categories: input.categories,
        priceLevelMax: input.priceLevelMax,
        openNow: input.openNow,
        limit,
        cursor,
        locale: input.locale
    };
}
