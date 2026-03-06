import { ValidationError } from "../errors.js";
import type { PlanDeepLinksAny, PlanDeepLinksV2 } from "./deepLinkTypes.js";

const MAX_URL_LENGTH = 1_000;
const TEL_PATTERN = /^tel:\+?\d{7,15}$/;
const SMS_PATTERN = /^sms:\+?\d{7,15}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
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

export function isSafeHttpUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (!parsed.hostname) return false;
    if (["javascript:", "data:", "file:", "blob:"].includes(parsed.protocol)) return false;
    return true;
  } catch {
    return false;
  }
}

export function isSafeCallUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > MAX_URL_LENGTH) return false;
  if (url.startsWith("tel:")) return TEL_PATTERN.test(url);
  if (url.startsWith("sms:")) return SMS_PATTERN.test(url);
  return false;
}

function assertSafe(path: string, value: string | undefined, validator: (url: string) => boolean): string | undefined {
  if (value === undefined) return undefined;
  if (!validator(value)) {
    throw new ValidationError([`${path} invalid url`]);
  }
  return value;
}

export function validatePlanDeepLinks(input: unknown): PlanDeepLinksV2 | undefined {
  if (input === undefined || input === null) return undefined;
  if (!isPlainObject(input)) {
    throw new ValidationError(["deepLinks must be an object"]);
  }

  const canonical = toCanonicalLinks(input as PlanDeepLinksAny);
  const validated: PlanDeepLinksV2 = {
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
