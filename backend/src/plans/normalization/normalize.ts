import { ValidationError } from "../errors.js";
import { type Plan, planId, type PlanPhoto } from "../plan.js";
import { validatePlan } from "../planValidation.js";
import { mapProviderCategory } from "./categoryMap.js";
import { normalizePriceLevel } from "./price.js";
import { buildMapsLink, normalizeHttpUrl, normalizeTelUrl } from "./urls.js";

export interface NormalizeOptions {
  provider: string;
  sourceId: string;
  now?: Date;
}

function toStringSafe(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function toNumberSafe(value: unknown): number | undefined {
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

function toIntegerSafe(value: unknown): number | undefined {
  const parsed = toNumberSafe(value);
  return parsed === undefined ? undefined : Math.round(parsed);
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((entry) => toStringSafe(entry))
    .filter((entry): entry is string => entry !== undefined);

  return normalized.length > 0 ? normalized : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function normalizePhotos(photos: unknown): PlanPhoto[] | undefined {
  if (!Array.isArray(photos)) {
    return undefined;
  }

  const normalized: PlanPhoto[] = [];
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

function sanitizeMetadataValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) {
    return null;
  }

  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
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

  const sanitized: Record<string, unknown> = {};
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

function normalizeMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(metadata)) {
    return undefined;
  }

  const seen = new WeakSet<object>();
  const sanitized = sanitizeMetadataValue(metadata, seen);
  if (!isPlainObject(sanitized)) {
    return undefined;
  }

  const entries = Object.entries(sanitized)
    .filter(([key]) => !key.startsWith("_"))
    .slice(0, 50);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function normalizeBasePlan(
  fields: {
    title: unknown;
    description?: unknown;
    categoryInput?: { categories?: unknown; primary?: unknown };
    location?: { lat?: unknown; lng?: unknown; address?: unknown };
    rating?: unknown;
    reviewCount?: unknown;
    price?: unknown;
    photos?: unknown;
    hoursOpenNow?: unknown;
    hoursWeekdayText?: unknown;
    website?: unknown;
    phone?: unknown;
    booking?: unknown;
    ticket?: unknown;
    metadata?: unknown;
    distanceMeters?: unknown;
  },
  opts: NormalizeOptions
): Plan {
  const lat = toNumberSafe(fields.location?.lat);
  const lng = toNumberSafe(fields.location?.lng);

  const plan: Plan = {
    id: planId(opts.provider, opts.sourceId),
    source: opts.provider,
    sourceId: opts.sourceId,
    title: toStringSafe(fields.title) ?? "",
    category: mapProviderCategory(opts.provider, {
      categories: toStringArray(fields.categoryInput?.categories),
      primary: toStringSafe(fields.categoryInput?.primary) ?? null
    }),
    location: {
      lat: lat ?? Number.NaN,
      lng: lng ?? Number.NaN,
      address: toStringSafe(fields.location?.address)
    }
  };

  const description = toStringSafe(fields.description);
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
  const weekdayText = toStringArray(fields.hoursWeekdayText);
  if (openNow !== undefined || weekdayText) {
    plan.hours = { openNow, weekdayText };
  }

  const maps = lat !== undefined && lng !== undefined ? buildMapsLink(lat, lng, toStringSafe(fields.title)) : undefined;
  const website = normalizeHttpUrl(fields.website);
  const call = normalizeTelUrl(fields.phone);
  const booking = normalizeHttpUrl(fields.booking);
  const ticket = normalizeHttpUrl(fields.ticket);
  if (maps || website || call || booking || ticket) {
    plan.deepLinks = { maps, website, call, booking, ticket };
  }

  const metadata = normalizeMetadata(fields.metadata);
  if (metadata) {
    plan.metadata = metadata;
  }

  try {
    return validatePlan(plan);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError([error instanceof Error ? error.message : "unknown normalization error"]);
  }
}
