import { ValidationError } from "../../plans/errors.js";
import { sanitizeText } from "../../sanitize/text.js";
import type { ListClaimsOptionsNormalized, VerificationStatus, VenueClaimLeadInput } from "./types.js";

const STATUS_VALUES: VerificationStatus[] = ["pending", "verified", "rejected"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(
  source: Record<string, unknown>,
  key: string,
  details: string[],
  maxLength: number,
  opts?: { source?: "provider" | "user"; allowNewlines?: boolean; profanityMode?: "none" | "mask" | "block" }
): string | undefined {
  const value = source[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    details.push(`${key} must be a string`);
    return undefined;
  }

  const cleaned = sanitizeText(value, {
    source: opts?.source ?? "user",
    maxLen: maxLength,
    allowNewlines: opts?.allowNewlines ?? false,
    profanityMode: opts?.profanityMode
  });

  return cleaned;
}

function isValidEmail(email: string): boolean {
  if (email.length === 0 || email.length > 254 || email.includes(" ")) {
    return false;
  }
  const firstAt = email.indexOf("@");
  if (firstAt <= 0 || firstAt !== email.lastIndexOf("@")) {
    return false;
  }
  const domain = email.slice(firstAt + 1);
  const dotIndex = domain.indexOf(".");
  return dotIndex > 0 && dotIndex < domain.length - 1;
}

export function validateVenueClaimLeadInput(x: unknown): VenueClaimLeadInput {
  if (!isObject(x)) {
    throw new ValidationError(["request body must be an object"]);
  }

  const details: string[] = [];
  const venueIdRaw = x.venueId;
  const emailRaw = x.contactEmail;

  if (typeof venueIdRaw !== "string") {
    details.push("venueId is required and must be a string");
  }
  if (typeof emailRaw !== "string") {
    details.push("contactEmail is required and must be a string");
  }

  const venueId = typeof venueIdRaw === "string" ? venueIdRaw.trim() : "";
  if (venueId.length === 0 || venueId.length > 200) {
    details.push("venueId must be 1-200 characters");
  }

  const contactEmail = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  if (!isValidEmail(contactEmail)) {
    details.push("contactEmail must be a valid email address");
  }

  let message: string | undefined;
  try {
    message = readOptionalString(x, "message", details, 400, { source: "user", allowNewlines: true, profanityMode: "block" });
  } catch (error) {
    if (error instanceof ValidationError) {
      details.push(...error.details);
    } else {
      throw error;
    }
  }
  const userId = readOptionalString(x, "userId", details, 120, { source: "user", allowNewlines: false, profanityMode: "none" });
  const planId = readOptionalString(x, "planId", details, 120, { source: "user", allowNewlines: false, profanityMode: "none" });
  const provider = readOptionalString(x, "provider", details, 120, { source: "user", allowNewlines: false, profanityMode: "none" });

  if (details.length > 0) {
    throw new ValidationError(details);
  }

  return {
    venueId,
    contactEmail,
    ...(message ? { message } : {}),
    ...(userId ? { userId } : {}),
    ...(planId ? { planId } : {}),
    ...(provider ? { provider } : {})
  };
}

export function validateListClaimsOptions(x: unknown): ListClaimsOptionsNormalized {
  if (x === undefined || x === null) {
    return { limit: 50, cursor: null };
  }

  if (!isObject(x)) {
    throw new ValidationError(["list options must be an object"]);
  }

  const details: string[] = [];
  const limitRaw = x.limit;
  let limit = 50;
  if (limitRaw !== undefined) {
    if (typeof limitRaw !== "number" || !Number.isInteger(limitRaw) || limitRaw <= 0) {
      details.push("limit must be a positive integer");
    } else {
      limit = Math.min(limitRaw, 200);
    }
  }

  let cursor: string | null = null;
  if (x.cursor !== undefined && x.cursor !== null) {
    if (typeof x.cursor !== "string") {
      details.push("cursor must be a string");
    } else {
      cursor = x.cursor;
    }
  }

  let venueId: string | undefined;
  if (x.venueId !== undefined) {
    if (typeof x.venueId !== "string") {
      details.push("venueId must be a string");
    } else {
      const trimmed = x.venueId.trim();
      if (trimmed.length === 0 || trimmed.length > 200) {
        details.push("venueId must be 1-200 characters");
      } else {
        venueId = trimmed;
      }
    }
  }

  let status: VerificationStatus | undefined;
  if (x.status !== undefined) {
    if (typeof x.status !== "string" || !STATUS_VALUES.includes(x.status as VerificationStatus)) {
      details.push(`status must be one of ${STATUS_VALUES.join(", ")}`);
    } else {
      status = x.status as VerificationStatus;
    }
  }

  if (details.length > 0) {
    throw new ValidationError(details);
  }

  return {
    limit,
    cursor,
    ...(venueId ? { venueId } : {}),
    ...(status ? { status } : {})
  };
}
