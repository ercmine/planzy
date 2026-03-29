import { ValidationError } from "../plans/errors.js";
import { PLAN_CATEGORIES } from "../plans/plan.js";
import { isSafeHttpUrl, isSafeCallUrl } from "../plans/deeplinks/deepLinkValidation.js";
import { sanitizeText } from "../sanitize/text.js";
const MAX_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function asOptionalString(value) {
    if (value === undefined || value === null)
        return undefined;
    return typeof value === "string" ? value : undefined;
}
function requireString(value, field, maxLen, allowNewlines = false) {
    const cleaned = sanitizeText(value, {
        source: "user",
        maxLen,
        allowNewlines,
        profanityMode: "none"
    });
    if (!cleaned) {
        throw new ValidationError([`${field} is required`]);
    }
    return cleaned;
}
function validateOptionalString(value, field, maxLen, allowNewlines = false) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "string") {
        throw new ValidationError([`${field} must be a string`]);
    }
    return sanitizeText(value, {
        source: "user",
        maxLen,
        allowNewlines,
        profanityMode: "none"
    });
}
function validateDateWindow(startsAtISO, endsAtISO) {
    if (!startsAtISO && !endsAtISO)
        return;
    const startMs = startsAtISO ? Date.parse(startsAtISO) : undefined;
    const endMs = endsAtISO ? Date.parse(endsAtISO) : undefined;
    if (startsAtISO && Number.isNaN(startMs)) {
        throw new ValidationError(["startsAtISO must be a valid ISO string"]);
    }
    if (endsAtISO && Number.isNaN(endMs)) {
        throw new ValidationError(["endsAtISO must be a valid ISO string"]);
    }
    if (startMs !== undefined && endMs !== undefined) {
        if (startMs >= endMs) {
            throw new ValidationError(["startsAtISO must be earlier than endsAtISO"]);
        }
        if (endMs - startMs > MAX_WINDOW_MS) {
            throw new ValidationError(["time window must be <= 180 days"]);
        }
    }
}
function validateVenueId(value) {
    const venueId = requireString(value, "venueId", 240);
    if (venueId.length > 240) {
        throw new ValidationError(["venueId must be <= 240 chars"]);
    }
    return venueId;
}
function validateStatus(value, field, allowed) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "string" || !allowed.includes(value)) {
        throw new ValidationError([`${field} must be one of: ${allowed.join(", ")}`]);
    }
    return value;
}
function validatePriority(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "number" || !Number.isInteger(value) || value < -10 || value > 100) {
        throw new ValidationError(["priority must be an integer in range [-10, 100]"]);
    }
    return value;
}
function validateImageUrls(value) {
    if (value === undefined || value === null)
        return undefined;
    if (!Array.isArray(value)) {
        throw new ValidationError(["imageUrls must be an array"]);
    }
    if (value.length > 5) {
        throw new ValidationError(["imageUrls length must be <= 5"]);
    }
    const urls = value.map((item, index) => {
        if (typeof item !== "string" || !isSafeHttpUrl(item)) {
            throw new ValidationError([`imageUrls[${index}] must be a safe http(s) url`]);
        }
        return item;
    });
    return urls;
}
function validateCategory(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "string" || !PLAN_CATEGORIES.includes(value)) {
        throw new ValidationError([`category must be one of: ${PLAN_CATEGORIES.join(", ")}`]);
    }
    return value;
}
function validateOptionalHttp(value, field) {
    const str = asOptionalString(value);
    if (str === undefined || str.trim() === "")
        return undefined;
    if (!isSafeHttpUrl(str)) {
        throw new ValidationError([`${field} must be a safe http(s) url`]);
    }
    return str;
}
function validateOptionalCall(value) {
    const str = asOptionalString(value);
    if (str === undefined || str.trim() === "")
        return undefined;
    if (!isSafeCallUrl(str)) {
        throw new ValidationError(["callLink must be a safe tel: or sms: link"]);
    }
    return str;
}
export function validatePromotedPlanInput(x) {
    if (!isRecord(x)) {
        throw new ValidationError(["input must be an object"]);
    }
    const startsAtISO = validateOptionalString(x.startsAtISO, "startsAtISO", 80);
    const endsAtISO = validateOptionalString(x.endsAtISO, "endsAtISO", 80);
    validateDateWindow(startsAtISO, endsAtISO);
    return {
        venueId: validateVenueId(x.venueId),
        provider: validateOptionalString(x.provider, "provider", 40),
        title: requireString(x.title, "title", 140),
        description: validateOptionalString(x.description, "description", 400, true),
        category: validateCategory(x.category),
        websiteLink: validateOptionalHttp(x.websiteLink, "websiteLink"),
        bookingLink: validateOptionalHttp(x.bookingLink, "bookingLink"),
        ticketLink: validateOptionalHttp(x.ticketLink, "ticketLink"),
        callLink: validateOptionalCall(x.callLink),
        imageUrls: validateImageUrls(x.imageUrls),
        startsAtISO,
        endsAtISO,
        status: validateStatus(x.status, "status", ["active", "paused", "ended"]),
        priority: validatePriority(x.priority),
        budgetPerDay: typeof x.budgetPerDay === "number" && Number.isFinite(x.budgetPerDay) ? x.budgetPerDay : undefined
    };
}
export function validateSpecialInput(x) {
    if (!isRecord(x)) {
        throw new ValidationError(["input must be an object"]);
    }
    const startsAtISO = validateOptionalString(x.startsAtISO, "startsAtISO", 80);
    const endsAtISO = validateOptionalString(x.endsAtISO, "endsAtISO", 80);
    validateDateWindow(startsAtISO, endsAtISO);
    return {
        venueId: validateVenueId(x.venueId),
        provider: validateOptionalString(x.provider, "provider", 40),
        headline: requireString(x.headline, "headline", 120),
        details: validateOptionalString(x.details, "details", 400, true),
        startsAtISO,
        endsAtISO,
        status: validateStatus(x.status, "status", ["active", "paused", "ended"]),
        couponCode: validateOptionalString(x.couponCode, "couponCode", 40),
        bookingLink: validateOptionalHttp(x.bookingLink, "bookingLink")
    };
}
export function validateListOptions(x) {
    if (x === undefined || x === null) {
        return { limit: DEFAULT_LIMIT, cursor: null };
    }
    if (!isRecord(x)) {
        throw new ValidationError(["list options must be an object"]);
    }
    let limit = DEFAULT_LIMIT;
    if (x.limit !== undefined) {
        if (typeof x.limit !== "number" || !Number.isFinite(x.limit)) {
            throw new ValidationError(["limit must be a finite number"]);
        }
        limit = Math.max(1, Math.min(MAX_LIMIT, Math.round(x.limit)));
    }
    const cursor = x.cursor === undefined ? null : x.cursor;
    if (cursor !== null && typeof cursor !== "string") {
        throw new ValidationError(["cursor must be a string or null"]);
    }
    const nowISO = validateOptionalString(x.nowISO, "nowISO", 80);
    if (nowISO) {
        const parsed = Date.parse(nowISO);
        if (Number.isNaN(parsed)) {
            throw new ValidationError(["nowISO must be a valid ISO string"]);
        }
    }
    return {
        limit,
        cursor,
        venueId: validateOptionalString(x.venueId, "venueId", 240),
        status: validateOptionalString(x.status, "status", 20),
        nowISO
    };
}
