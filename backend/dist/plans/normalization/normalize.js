import { defaultLogger } from "../../logging/logger.js";
import { hashString } from "../../logging/redact.js";
import { ValidationError } from "../errors.js";
import { planId } from "../plan.js";
import { validatePlan } from "../planValidation.js";
import { mapProviderCategory } from "./categoryMap.js";
import { normalizePriceLevel } from "./price.js";
import { buildMapsLink, normalizeBookingUrl, normalizeHttpUrl, normalizeTelUrl, normalizeTicketUrl, normalizeWebsiteUrl } from "./urls.js";
import { normalizeDeepLinks } from "../deeplinks/deepLinkNormalize.js";
import { sanitizeText } from "../../sanitize/text.js";
function toStringSafe(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return undefined;
}
function toNumberSafe(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
}
function toIntegerSafe(value) {
    const parsed = toNumberSafe(value);
    return parsed === undefined ? undefined : Math.round(parsed);
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const normalized = value
        .map((entry) => toStringSafe(entry))
        .filter((entry) => entry !== undefined);
    return normalized.length > 0 ? normalized : undefined;
}
function isPlainObject(value) {
    return (!!value &&
        typeof value === "object" &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));
}
function normalizePhotos(photos) {
    if (!Array.isArray(photos)) {
        return undefined;
    }
    const normalized = [];
    for (const photo of photos) {
        if (normalized.length >= 20) {
            break;
        }
        if (typeof photo === "string") {
            const url = normalizeHttpUrl(photo);
            if (url) {
                normalized.push({ url });
            }
            continue;
        }
        if (isPlainObject(photo)) {
            const url = normalizeHttpUrl(photo.url);
            if (!url) {
                continue;
            }
            const width = toIntegerSafe(photo.width);
            const height = toIntegerSafe(photo.height);
            normalized.push({
                url,
                width: width !== undefined && width > 0 ? width : undefined,
                height: height !== undefined && height > 0 ? height : undefined
            });
        }
    }
    return normalized.length > 0 ? normalized : undefined;
}
function sanitizeMetadataValue(value, seen) {
    if (value === null) {
        return null;
    }
    const type = typeof value;
    if (type === "string") {
        return sanitizeText(value, {
            source: "provider",
            maxLen: 300,
            allowNewlines: true,
            profanityMode: "none"
        });
    }
    if (type === "number" || type === "boolean") {
        return value;
    }
    if (type !== "object") {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value
            .map((entry) => sanitizeMetadataValue(entry, seen))
            .filter((entry) => entry !== undefined);
    }
    if (!isPlainObject(value)) {
        return undefined;
    }
    if (seen.has(value)) {
        return undefined;
    }
    seen.add(value);
    const sanitized = {};
    for (const [key, child] of Object.entries(value)) {
        if (key.startsWith("_")) {
            continue;
        }
        const cleanChild = sanitizeMetadataValue(child, seen);
        if (cleanChild !== undefined) {
            sanitized[key] = cleanChild;
        }
    }
    return sanitized;
}
function normalizeMetadata(metadata) {
    if (!isPlainObject(metadata)) {
        return undefined;
    }
    const seen = new WeakSet();
    const sanitized = sanitizeMetadataValue(metadata, seen);
    if (!isPlainObject(sanitized)) {
        return undefined;
    }
    const entries = Object.entries(sanitized)
        .filter(([key]) => !key.startsWith("_"))
        .slice(0, 50);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
export function normalizeBasePlan(fields, opts) {
    const logger = opts.logger ?? defaultLogger;
    const lat = toNumberSafe(fields.location?.lat);
    const lng = toNumberSafe(fields.location?.lng);
    const title = sanitizeText(fields.title, {
        source: "provider",
        maxLen: 140,
        allowNewlines: false,
        profanityMode: "none"
    }) ?? "";
    if (title.length === 0) {
        throw new ValidationError(["title is required"]);
    }
    const providerCategories = Array.isArray(fields.categoryInput?.categories)
        ? fields.categoryInput.categories
            .map((entry) => sanitizeText(entry, {
            source: "provider",
            maxLen: 80,
            allowNewlines: false,
            profanityMode: "none"
        }))
            .filter((entry) => entry !== undefined)
        : undefined;
    const primaryCategory = sanitizeText(fields.categoryInput?.primary, {
        source: "provider",
        maxLen: 80,
        allowNewlines: false,
        profanityMode: "none"
    });
    const sanitizedAddress = sanitizeText(fields.location?.address, {
        source: "provider",
        maxLen: 200,
        allowNewlines: true,
        profanityMode: "none"
    });
    const plan = {
        id: planId(opts.provider, opts.sourceId),
        source: opts.provider,
        sourceId: opts.sourceId,
        title,
        category: mapProviderCategory(opts.provider, {
            categories: providerCategories,
            primary: primaryCategory ?? null
        }),
        location: {
            lat: lat ?? Number.NaN,
            lng: lng ?? Number.NaN,
            address: sanitizedAddress
        }
    };
    const description = sanitizeText(fields.description, {
        source: "provider",
        maxLen: 400,
        allowNewlines: true,
        profanityMode: "none"
    });
    if (description) {
        plan.description = description;
    }
    const rating = toNumberSafe(fields.rating);
    if (rating !== undefined) {
        plan.rating = rating;
    }
    const reviewCount = toIntegerSafe(fields.reviewCount);
    if (reviewCount !== undefined) {
        plan.reviewCount = Math.max(0, reviewCount);
    }
    const distanceMeters = toNumberSafe(fields.distanceMeters);
    if (distanceMeters !== undefined) {
        plan.distanceMeters = Math.max(0, distanceMeters);
    }
    const priceLevel = normalizePriceLevel(fields.price);
    if (priceLevel !== undefined) {
        plan.priceLevel = priceLevel;
    }
    const photos = normalizePhotos(fields.photos);
    if (photos) {
        plan.photos = photos;
    }
    const openNow = typeof fields.hoursOpenNow === "boolean" ? fields.hoursOpenNow : undefined;
    const weekdayText = Array.isArray(fields.hoursWeekdayText)
        ? fields.hoursWeekdayText
            .map((entry) => sanitizeText(entry, {
            source: "provider",
            maxLen: 120,
            allowNewlines: false,
            profanityMode: "none"
        }))
            .filter((entry) => entry !== undefined)
        : undefined;
    const normalizedWeekdayText = weekdayText && weekdayText.length > 0 ? weekdayText : undefined;
    if (openNow !== undefined || normalizedWeekdayText) {
        plan.hours = { openNow, weekdayText: normalizedWeekdayText };
    }
    const maps = lat !== undefined && lng !== undefined ? buildMapsLink(lat, lng, title) : undefined;
    const websiteLink = normalizeWebsiteUrl(fields.website);
    const callLink = normalizeTelUrl(fields.phone);
    const bookingLink = normalizeBookingUrl(fields.booking);
    const ticketLink = normalizeTicketUrl(fields.ticket);
    const normalizedDeepLinks = normalizeDeepLinks({ mapsLink: maps, websiteLink, callLink, bookingLink, ticketLink });
    if (normalizedDeepLinks) {
        plan.deepLinks = normalizedDeepLinks;
    }
    const metadata = normalizeMetadata(fields.metadata);
    if (metadata) {
        plan.metadata = metadata;
    }
    try {
        return validatePlan(plan);
    }
    catch (error) {
        if (error instanceof ValidationError) {
            logger.warn("plan_normalization_failed", {
                requestId: opts.requestId,
                provider: opts.provider,
                module: "normalizeBasePlan",
                sourceIdHash: hashString(opts.sourceId),
                categoryGuess: plan.category,
                errors: error.details.slice(0, 10),
                fieldSummary: {
                    hasTitle: toStringSafe(fields.title) !== undefined,
                    hasLocation: fields.location !== undefined,
                    hasWebsite: normalizeWebsiteUrl(fields.website) !== undefined,
                    hasPhone: normalizeTelUrl(fields.phone) !== undefined,
                    photosCount: Array.isArray(fields.photos) ? Math.min(fields.photos.length, 1000) : 0
                }
            });
            throw error;
        }
        throw new ValidationError([error instanceof Error ? error.message : "unknown normalization error"]);
    }
}
