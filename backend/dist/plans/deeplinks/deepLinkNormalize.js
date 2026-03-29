import { isSafeCallUrl, isSafeHttpUrl } from "./deepLinkValidation.js";
function choosePreferredUrl(first, second) {
    if (!first)
        return second;
    if (!second)
        return first;
    if (first.startsWith("https://") && second.startsWith("http://"))
        return first;
    if (second.startsWith("https://") && first.startsWith("http://"))
        return second;
    return first;
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
export function normalizeDeepLinks(input) {
    if (!input)
        return undefined;
    const canonical = toCanonicalLinks(input);
    const normalized = {
        mapsLink: canonical.mapsLink && isSafeHttpUrl(canonical.mapsLink) ? canonical.mapsLink : undefined,
        websiteLink: canonical.websiteLink && isSafeHttpUrl(canonical.websiteLink) ? canonical.websiteLink : undefined,
        callLink: canonical.callLink && isSafeCallUrl(canonical.callLink) ? canonical.callLink : undefined,
        bookingLink: canonical.bookingLink && isSafeHttpUrl(canonical.bookingLink) ? canonical.bookingLink : undefined,
        ticketLink: canonical.ticketLink && isSafeHttpUrl(canonical.ticketLink) ? canonical.ticketLink : undefined
    };
    if (!normalized.mapsLink && !normalized.websiteLink && !normalized.callLink && !normalized.bookingLink && !normalized.ticketLink) {
        return undefined;
    }
    return normalized;
}
export function pickPreferredLinks(a, b) {
    const merged = {
        mapsLink: choosePreferredUrl(a?.mapsLink, b?.mapsLink),
        websiteLink: choosePreferredUrl(a?.websiteLink, b?.websiteLink),
        bookingLink: choosePreferredUrl(a?.bookingLink, b?.bookingLink),
        ticketLink: choosePreferredUrl(a?.ticketLink, b?.ticketLink),
        callLink: choosePreferredUrl(a?.callLink, b?.callLink)
    };
    if (!merged.mapsLink && !merged.websiteLink && !merged.callLink && !merged.bookingLink && !merged.ticketLink) {
        return undefined;
    }
    return merged;
}
