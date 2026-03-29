import { ValidationError } from "../../plans/errors.js";
const LINK_TYPES = ["maps", "website", "call", "booking", "ticket"];
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeString(value, field, details, opts) {
    if (value === undefined) {
        if (opts.required) {
            details.push(`${field} is required`);
        }
        return undefined;
    }
    if (typeof value !== "string") {
        details.push(`${field} must be a string`);
        return undefined;
    }
    const trimmed = value.trim();
    if (opts.required && trimmed.length === 0) {
        details.push(`${field} must be a non-empty string`);
        return undefined;
    }
    if (trimmed.length > opts.maxLen) {
        details.push(`${field} must be <= ${opts.maxLen} characters`);
        return undefined;
    }
    return trimmed;
}
function validateLinkType(value, details, field) {
    if (typeof value !== "string" || !LINK_TYPES.includes(value)) {
        details.push(`${field} must be one of ${LINK_TYPES.join(", ")}`);
        return undefined;
    }
    return value;
}
function parseAtISO(value, details) {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== "string" || value.trim().length === 0) {
        details.push("atISO must be a non-empty ISO datetime string when provided");
        return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        details.push("atISO must be a valid ISO datetime string");
        return undefined;
    }
    return date.toISOString();
}
function validateMeta(metaUnknown, details) {
    if (metaUnknown === undefined) {
        return undefined;
    }
    if (!isObject(metaUnknown)) {
        details.push("meta must be an object");
        return undefined;
    }
    const campaign = normalizeString(metaUnknown.campaign, "meta.campaign", details, { maxLen: 60 });
    const provider = normalizeString(metaUnknown.provider, "meta.provider", details, { maxLen: 60 });
    const source = normalizeString(metaUnknown.source, "meta.source", details, { maxLen: 60 });
    let extra;
    if (metaUnknown.extra !== undefined) {
        if (!isObject(metaUnknown.extra)) {
            details.push("meta.extra must be an object");
        }
        else {
            const entries = Object.entries(metaUnknown.extra);
            if (entries.length > 20) {
                details.push("meta.extra must have at most 20 keys");
            }
            const nextExtra = {};
            for (const [key, rawValue] of entries) {
                const trimmedKey = key.trim();
                if (trimmedKey.length === 0) {
                    details.push("meta.extra keys must be non-empty");
                    continue;
                }
                if (trimmedKey.length > 40) {
                    details.push(`meta.extra key '${key}' must be <= 40 characters`);
                    continue;
                }
                const rawType = typeof rawValue;
                const allowedPrimitive = rawValue === null || rawType === "string" || rawType === "number" || rawType === "boolean";
                if (!allowedPrimitive) {
                    details.push(`meta.extra['${key}'] must be a primitive value`);
                    continue;
                }
                if (typeof rawValue === "string") {
                    const trimmedValue = rawValue.trim();
                    if (trimmedValue.length > 120) {
                        details.push(`meta.extra['${key}'] must be <= 120 characters`);
                        continue;
                    }
                    if (/^https?:\/\//i.test(trimmedValue)) {
                        details.push(`meta.extra['${key}'] must not contain url-like values`);
                        continue;
                    }
                    nextExtra[trimmedKey] = trimmedValue;
                    continue;
                }
                if (typeof rawValue === "number" || typeof rawValue === "boolean" || rawValue === null) {
                    nextExtra[trimmedKey] = rawValue;
                }
            }
            if (Object.keys(nextExtra).length > 0) {
                extra = nextExtra;
            }
        }
    }
    if (details.length > 0) {
        return undefined;
    }
    if (campaign === undefined && provider === undefined && source === undefined && extra === undefined) {
        return undefined;
    }
    return {
        ...(campaign !== undefined ? { campaign } : {}),
        ...(provider !== undefined ? { provider } : {}),
        ...(source !== undefined ? { source } : {}),
        ...(extra !== undefined ? { extra } : {})
    };
}
export function validateOutboundClickInput(x) {
    const details = [];
    if (!isObject(x)) {
        throw new ValidationError(["input must be an object"]);
    }
    if ("url" in x) {
        details.push("url field is not allowed");
    }
    const sessionId = normalizeString(x.sessionId, "sessionId", details, { required: true, maxLen: 120 });
    const planId = normalizeString(x.planId, "planId", details, { required: true, maxLen: 240 });
    const linkType = validateLinkType(x.linkType, details, "linkType");
    const userId = normalizeString(x.userId, "userId", details, { maxLen: 120 });
    const atISO = parseAtISO(x.atISO, details);
    const meta = validateMeta(x.meta, details);
    if (details.length > 0 || !sessionId || !planId || !linkType) {
        throw new ValidationError(details.length > 0 ? details : ["invalid click input"]);
    }
    return {
        sessionId,
        planId,
        linkType,
        ...(userId !== undefined ? { userId } : {}),
        ...(atISO !== undefined ? { atISO } : {}),
        ...(meta !== undefined ? { meta } : {})
    };
}
export function validateListClicksOptions(x) {
    if (x === undefined || x === null) {
        return {
            limit: DEFAULT_LIMIT,
            cursor: null
        };
    }
    const details = [];
    if (!isObject(x)) {
        throw new ValidationError(["list options must be an object"]);
    }
    const opts = x;
    const limitCandidate = opts.limit ?? DEFAULT_LIMIT;
    if (!Number.isInteger(limitCandidate) || limitCandidate < 1) {
        details.push("limit must be a positive integer");
    }
    let cursor = null;
    if (opts.cursor !== undefined && opts.cursor !== null) {
        if (typeof opts.cursor !== "string" || opts.cursor.trim().length === 0) {
            details.push("cursor must be a non-empty string when provided");
        }
        else {
            cursor = opts.cursor;
        }
    }
    const linkType = opts.linkType === undefined ? undefined : validateLinkType(opts.linkType, details, "linkType");
    const planId = normalizeString(opts.planId, "planId", details, { maxLen: 240 });
    if (details.length > 0) {
        throw new ValidationError(details);
    }
    return {
        limit: Math.min(limitCandidate, MAX_LIMIT),
        cursor,
        ...(linkType !== undefined ? { linkType } : {}),
        ...(planId !== undefined ? { planId } : {})
    };
}
