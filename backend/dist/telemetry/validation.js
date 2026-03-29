import { ValidationError } from "../plans/errors.js";
const EVENT_NAMES = ["deck_loaded", "card_viewed", "card_opened", "swipe", "outbound_link_clicked"];
const SWIPE_ACTIONS = ["yes", "no", "maybe"];
const LINK_TYPES = ["maps", "website", "call", "booking", "ticket"];
const CARD_OPENED_SECTIONS = ["details", "links", "photos"];
const BASE_KEYS = ["event", "sessionId", "planId", "clientAtISO", "deckKey", "cursor", "position", "source"];
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertNoPii(value, path = "root") {
    if (typeof value === "string") {
        if (value.toLowerCase().startsWith("http")) {
            throw new ValidationError([`PII-unsafe URL-like value at ${path}`]);
        }
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => assertNoPii(item, `${path}[${index}]`));
        return;
    }
    if (!isObject(value)) {
        return;
    }
    for (const [key, nested] of Object.entries(value)) {
        if (key.toLowerCase().includes("url")) {
            throw new ValidationError([`PII-unsafe key '${key}' is not allowed`]);
        }
        assertNoPii(nested, `${path}.${key}`);
    }
}
function allowKeys(input, allowed) {
    for (const key of Object.keys(input)) {
        if (!allowed.includes(key)) {
            throw new ValidationError([`unknown field '${key}'`]);
        }
    }
}
function readString(input, field, required = false) {
    const raw = input[field];
    if (raw === undefined) {
        if (required)
            throw new ValidationError([`${field} must be a non-empty string`]);
        return undefined;
    }
    if (typeof raw !== "string" || raw.trim().length === 0) {
        throw new ValidationError([`${field} must be a non-empty string`]);
    }
    return raw.trim();
}
function readInteger(input, field, min, max, required = false) {
    const raw = input[field];
    if (raw === undefined) {
        if (required)
            throw new ValidationError([`${field} is required`]);
        return undefined;
    }
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < min || raw > max) {
        throw new ValidationError([`${field} must be an integer between ${min} and ${max}`]);
    }
    return raw;
}
function readOptionalISO(input) {
    const raw = input.clientAtISO;
    if (raw === undefined)
        return undefined;
    if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
        throw new ValidationError(["clientAtISO must be a parseable ISO date string"]);
    }
    return raw;
}
function readBase(input, sessionIdFromPath, event) {
    const sessionId = sessionIdFromPath.trim();
    if (!sessionId) {
        throw new ValidationError(["sessionId must be a non-empty string"]);
    }
    const deckKey = input.deckKey;
    if (deckKey !== undefined && typeof deckKey !== "string") {
        throw new ValidationError(["deckKey must be a string"]);
    }
    const source = input.source;
    if (source !== undefined && typeof source !== "string") {
        throw new ValidationError(["source must be a string"]);
    }
    const cursor = input.cursor;
    if (cursor !== undefined && cursor !== null && typeof cursor !== "string") {
        throw new ValidationError(["cursor must be string or null"]);
    }
    const position = readInteger(input, "position", 0, 500, false);
    const clientAtISO = readOptionalISO(input);
    return {
        event,
        sessionId,
        ...(clientAtISO !== undefined ? { clientAtISO } : {}),
        ...(typeof deckKey === "string" ? { deckKey } : {}),
        ...(cursor !== undefined ? { cursor: cursor } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(typeof source === "string" ? { source } : {})
    };
}
export function validateTelemetryEventInput(x, sessionIdFromPath) {
    if (!isObject(x)) {
        throw new ValidationError(["telemetry event must be an object"]);
    }
    assertNoPii(x);
    const rawEvent = x.event;
    if (typeof rawEvent !== "string" || !EVENT_NAMES.includes(rawEvent)) {
        throw new ValidationError(["event must be one of: deck_loaded, card_viewed, card_opened, swipe, outbound_link_clicked"]);
    }
    if (rawEvent === "deck_loaded") {
        allowKeys(x, [...BASE_KEYS, "batchSize", "returned", "nextCursorPresent", "planSourceCounts"]);
        const batchSize = readInteger(x, "batchSize", 0, 200, true);
        const returned = readInteger(x, "returned", 0, 200, true);
        if (typeof x.nextCursorPresent !== "boolean") {
            throw new ValidationError(["nextCursorPresent must be a boolean"]);
        }
        let planSourceCounts;
        if (x.planSourceCounts !== undefined) {
            if (!isObject(x.planSourceCounts)) {
                throw new ValidationError(["planSourceCounts must be an object"]);
            }
            planSourceCounts = {};
            for (const [key, value] of Object.entries(x.planSourceCounts)) {
                if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 200) {
                    throw new ValidationError(["planSourceCounts values must be integers between 0 and 200"]);
                }
                planSourceCounts[key] = value;
            }
        }
        const event = {
            ...readBase(x, sessionIdFromPath, "deck_loaded"),
            batchSize,
            returned,
            nextCursorPresent: x.nextCursorPresent,
            ...(planSourceCounts ? { planSourceCounts } : {})
        };
        return event;
    }
    const planId = readString(x, "planId", true);
    if (rawEvent === "card_viewed") {
        allowKeys(x, [...BASE_KEYS, "viewMs"]);
        const viewMs = readInteger(x, "viewMs", 0, 600000, false);
        const event = {
            ...readBase(x, sessionIdFromPath, "card_viewed"),
            planId,
            ...(viewMs !== undefined ? { viewMs } : {})
        };
        return event;
    }
    if (rawEvent === "card_opened") {
        allowKeys(x, [...BASE_KEYS, "section"]);
        if (x.section !== undefined && (typeof x.section !== "string" || !CARD_OPENED_SECTIONS.includes(x.section))) {
            throw new ValidationError(["section must be one of: details, links, photos"]);
        }
        const event = {
            ...readBase(x, sessionIdFromPath, "card_opened"),
            planId,
            ...(typeof x.section === "string" ? { section: x.section } : {})
        };
        return event;
    }
    if (rawEvent === "swipe") {
        allowKeys(x, [...BASE_KEYS, "action"]);
        if (typeof x.action !== "string" || !SWIPE_ACTIONS.includes(x.action)) {
            throw new ValidationError(["action must be one of: yes, no, maybe"]);
        }
        const event = {
            ...readBase(x, sessionIdFromPath, "swipe"),
            planId,
            action: x.action
        };
        return event;
    }
    allowKeys(x, [...BASE_KEYS, "linkType", "affiliate"]);
    if (typeof x.linkType !== "string" || !LINK_TYPES.includes(x.linkType)) {
        throw new ValidationError(["linkType must be one of: maps, website, call, booking, ticket"]);
    }
    if (x.affiliate !== undefined && typeof x.affiliate !== "boolean") {
        throw new ValidationError(["affiliate must be a boolean"]);
    }
    const outbound = {
        ...readBase(x, sessionIdFromPath, "outbound_link_clicked"),
        planId,
        linkType: x.linkType,
        ...(x.affiliate !== undefined ? { affiliate: x.affiliate } : {})
    };
    return outbound;
}
export function validateTelemetryBatch(x, sessionIdFromPath) {
    if (!Array.isArray(x)) {
        throw new ValidationError(["events must be an array"]);
    }
    return x.map((item) => validateTelemetryEventInput(item, sessionIdFromPath));
}
