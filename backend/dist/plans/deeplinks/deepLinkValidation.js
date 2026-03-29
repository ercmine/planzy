import { ValidationError } from "../errors.js";
const MAX_URL_LENGTH = 1_000;
const TEL_PATTERN = /^tel:\+?\d{7,15}$/;
const SMS_PATTERN = /^sms:\+?\d{7,15}$/;
function isPlainObject(value) {
    return (!!value &&
        typeof value === "object" &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));
}
function toCanonicalLinks(input) {
    const record = input;
    return {
        mapsLink: (record.mapsLink ?? record.maps),
        websiteLink: (record.websiteLink ?? record.website),
        callLink: (record.callLink ?? record.call),
        bookingLink: (record.bookingLink ?? record.booking),
        ticketLink: (record.ticketLink ?? record.ticket)
    };
}
export function isSafeHttpUrl(url) {
    if (typeof url !== "string" || url.length === 0 || url.length > MAX_URL_LENGTH)
        return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            return false;
        if (!parsed.hostname)
            return false;
        if (["javascript:", "data:", "file:", "blob:"].includes(parsed.protocol))
            return false;
        return true;
    }
    catch {
        return false;
    }
}
export function isSafeCallUrl(url) {
    if (typeof url !== "string" || url.length === 0 || url.length > MAX_URL_LENGTH)
        return false;
    if (url.startsWith("tel:"))
        return TEL_PATTERN.test(url);
    if (url.startsWith("sms:"))
        return SMS_PATTERN.test(url);
    return false;
}
function assertSafe(path, value, validator) {
    if (value === undefined)
        return undefined;
    if (!validator(value)) {
        throw new ValidationError([`${path} invalid url`]);
    }
    return value;
}
export function validatePlanDeepLinks(input) {
    if (input === undefined || input === null)
        return undefined;
    if (!isPlainObject(input)) {
        throw new ValidationError(["deepLinks must be an object"]);
    }
    const canonical = toCanonicalLinks(input);
    const validated = {
        mapsLink: assertSafe("deepLinks.mapsLink", canonical.mapsLink, isSafeHttpUrl),
        websiteLink: assertSafe("deepLinks.websiteLink", canonical.websiteLink, isSafeHttpUrl),
        callLink: assertSafe("deepLinks.callLink", canonical.callLink, isSafeCallUrl),
        bookingLink: assertSafe("deepLinks.bookingLink", canonical.bookingLink, isSafeHttpUrl),
        ticketLink: assertSafe("deepLinks.ticketLink", canonical.ticketLink, isSafeHttpUrl)
    };
    if (!validated.mapsLink && !validated.websiteLink && !validated.callLink && !validated.bookingLink && !validated.ticketLink) {
        return undefined;
    }
    return validated;
}
