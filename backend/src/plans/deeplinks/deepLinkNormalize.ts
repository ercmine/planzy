import type { PlanDeepLinksAny, PlanDeepLinksV2 } from "./deepLinkTypes.js";
import { isSafeCallUrl, isSafeHttpUrl } from "./deepLinkValidation.js";

function choosePreferredUrl(first?: string, second?: string): string | undefined {
  if (!first) return second;
  if (!second) return first;
  if (first.startsWith("https://") && second.startsWith("http://")) return first;
  if (second.startsWith("https://") && first.startsWith("http://")) return second;
  return first;
}

function toCanonicalLinks(input: PlanDeepLinksAny): PlanDeepLinksV2 {
  const record = input as Record<string, unknown>;
  return {
    mapsLink: (record.mapsLink ?? record.maps) as string | undefined,
    websiteLink: (record.websiteLink ?? record.website) as string | undefined,
    callLink: (record.callLink ?? record.call) as string | undefined,
    bookingLink: (record.bookingLink ?? record.booking) as string | undefined,
    ticketLink: (record.ticketLink ?? record.ticket) as string | undefined
  };
}

export function normalizeDeepLinks(input: PlanDeepLinksAny | undefined): PlanDeepLinksV2 | undefined {
  if (!input) return undefined;

  const canonical = toCanonicalLinks(input);
  const normalized: PlanDeepLinksV2 = {
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

export function pickPreferredLinks(a?: PlanDeepLinksV2, b?: PlanDeepLinksV2): PlanDeepLinksV2 | undefined {
  const merged: PlanDeepLinksV2 = {
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
