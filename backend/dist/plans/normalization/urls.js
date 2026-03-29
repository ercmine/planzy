import { isSafeCallUrl, isSafeHttpUrl } from "../deeplinks/deepLinkValidation.js";
const MAX_URL_LENGTH = 1000;
function asTrimmedString(input) {
    if (typeof input !== "string") {
        return undefined;
    }
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
export function normalizeHttpUrl(url) {
    const value = asTrimmedString(url);
    if (!value || value.length > MAX_URL_LENGTH) {
        return undefined;
    }
    try {
        const parsed = new URL(value);
        const normalized = parsed.toString();
        return isSafeHttpUrl(normalized) ? normalized : undefined;
    }
    catch {
        return undefined;
    }
}
export function normalizeTelUrl(url) {
    const value = asTrimmedString(url);
    if (!value || value.length > MAX_URL_LENGTH) {
        return undefined;
    }
    let digits = "";
    if (value.startsWith("tel:")) {
        digits = value.slice(4).replace(/[^\d+]/g, "");
    }
    else if (value.startsWith("sms:")) {
        digits = value.slice(4).replace(/[^\d+]/g, "");
        const sms = `sms:${digits}`;
        return isSafeCallUrl(sms) ? sms : undefined;
    }
    else {
        digits = value.replace(/[^\d+]/g, "");
    }
    const normalizedDigits = digits.startsWith("+") ? `+${digits.slice(1).replace(/\+/g, "")}` : digits.replace(/\+/g, "");
    const tel = `tel:${normalizedDigits}`;
    return isSafeCallUrl(tel) ? tel : undefined;
}
export function normalizeBookingUrl(url) {
    return normalizeHttpUrl(url);
}
export function normalizeTicketUrl(url) {
    return normalizeHttpUrl(url);
}
export function normalizeWebsiteUrl(url) {
    return normalizeHttpUrl(url);
}
export function buildMapsLink(lat, lng, label) {
    const query = label ? `${label} @ ${lat},${lng}` : `${lat},${lng}`;
    const params = new URLSearchParams({
        api: "1",
        query
    });
    return `https://www.google.com/maps/search/?${params.toString()}`;
}
