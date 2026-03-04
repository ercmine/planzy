import { ValidationError } from "./errors.js";
import { PLAN_CATEGORIES, type Category, type Plan, type PriceLevel } from "./plan.js";

const MAX_TITLE_LENGTH = 140;
const MAX_ADDRESS_LENGTH = 200;
const MAX_DISTANCE_METERS = 500_000;
const MAX_URL_LENGTH = 1_000;
const MAX_PHOTOS = 20;
const MAX_WEEKDAY_LINES = 14;
const MAX_WEEKDAY_LINE_LENGTH = 120;
const MAX_METADATA_KEYS = 50;
const MAX_METADATA_KEY_LENGTH = 60;

function fail(path: string, message: string): never {
  throw new ValidationError([`${path}: ${message}`]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function asNonEmptyString(value: unknown, path: string, maxLength?: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(path, "must be a non-empty string");
  }
  if (maxLength !== undefined && value.length > maxLength) {
    fail(path, `must be at most ${maxLength} characters`);
  }
  return value;
}

function asFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "must be a finite number");
  }
  return value;
}

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && PLAN_CATEGORIES.includes(value as Category);
}

function isPriceLevel(value: unknown): value is PriceLevel {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function asUrl(value: unknown, path: string, allowTel = false): string {
  const url = asNonEmptyString(value, path, MAX_URL_LENGTH);
  if (allowTel && url.startsWith("tel:")) {
    return url;
  }
  if (!isHttpUrl(url)) {
    fail(path, "must be a valid http(s) URL");
  }
  return url;
}

export function validatePlan(plan: unknown): Plan {
  if (!isPlainObject(plan)) {
    fail("plan", "must be an object");
  }

  const id = asNonEmptyString(plan.id, "id");
  const source = asNonEmptyString(plan.source, "source");
  const sourceId = asNonEmptyString(plan.sourceId, "sourceId");
  const title = asNonEmptyString(plan.title, "title", MAX_TITLE_LENGTH);

  if (!isCategory(plan.category)) {
    fail("category", `must be one of: ${PLAN_CATEGORIES.join(", ")}`);
  }

  if (!isPlainObject(plan.location)) {
    fail("location", "must be an object");
  }

  const location = {
    lat: asFiniteNumber(plan.location.lat, "location.lat"),
    lng: asFiniteNumber(plan.location.lng, "location.lng"),
    address:
      plan.location.address === undefined
        ? undefined
        : asNonEmptyString(plan.location.address, "location.address", MAX_ADDRESS_LENGTH)
  };

  if (location.lat < -90 || location.lat > 90) {
    fail("location.lat", "must be between -90 and 90");
  }
  if (location.lng < -180 || location.lng > 180) {
    fail("location.lng", "must be between -180 and 180");
  }

  const validated: Plan = {
    id,
    source,
    sourceId,
    title,
    category: plan.category,
    location
  };

  if (plan.description !== undefined) {
    validated.description = asNonEmptyString(plan.description, "description");
  }
  if (plan.distanceMeters !== undefined) {
    const distanceMeters = asFiniteNumber(plan.distanceMeters, "distanceMeters");
    if (distanceMeters < 0 || distanceMeters > MAX_DISTANCE_METERS) {
      fail("distanceMeters", `must be between 0 and ${MAX_DISTANCE_METERS}`);
    }
    validated.distanceMeters = distanceMeters;
  }
  if (plan.priceLevel !== undefined) {
    if (!isPriceLevel(plan.priceLevel)) {
      fail("priceLevel", "must be an integer between 0 and 4");
    }
    validated.priceLevel = plan.priceLevel;
  }
  if (plan.rating !== undefined) {
    const rating = asFiniteNumber(plan.rating, "rating");
    if (rating < 0 || rating > 5) {
      fail("rating", "must be between 0 and 5");
    }
    validated.rating = rating;
  }
  if (plan.reviewCount !== undefined) {
    const reviewCount = asFiniteNumber(plan.reviewCount, "reviewCount");
    if (!Number.isInteger(reviewCount) || reviewCount < 0) {
      fail("reviewCount", "must be an integer greater than or equal to 0");
    }
    validated.reviewCount = reviewCount;
  }

  if (plan.photos !== undefined) {
    if (!Array.isArray(plan.photos)) {
      fail("photos", "must be an array");
    }
    if (plan.photos.length > MAX_PHOTOS) {
      fail("photos", `must have at most ${MAX_PHOTOS} items`);
    }
    validated.photos = plan.photos.map((photo, index) => {
      if (!isPlainObject(photo)) {
        fail(`photos[${index}]`, "must be an object");
      }
      const url = asUrl(photo.url, `photos[${index}].url`);
      const width = photo.width === undefined ? undefined : asFiniteNumber(photo.width, `photos[${index}].width`);
      const height = photo.height === undefined ? undefined : asFiniteNumber(photo.height, `photos[${index}].height`);
      return { url, width, height };
    });
  }

  if (plan.hours !== undefined) {
    if (!isPlainObject(plan.hours)) {
      fail("hours", "must be an object");
    }
    const openNow =
      plan.hours.openNow === undefined
        ? undefined
        : typeof plan.hours.openNow === "boolean"
          ? plan.hours.openNow
          : fail("hours.openNow", "must be a boolean");

    let weekdayText: string[] | undefined;
    if (plan.hours.weekdayText !== undefined) {
      if (!Array.isArray(plan.hours.weekdayText)) {
        fail("hours.weekdayText", "must be an array of strings");
      }
      if (plan.hours.weekdayText.length > MAX_WEEKDAY_LINES) {
        fail("hours.weekdayText", `must have at most ${MAX_WEEKDAY_LINES} entries`);
      }
      weekdayText = plan.hours.weekdayText.map((line, index) =>
        asNonEmptyString(line, `hours.weekdayText[${index}]`, MAX_WEEKDAY_LINE_LENGTH)
      );
    }

    validated.hours = { openNow, weekdayText };
  }

  if (plan.deepLinks !== undefined) {
    if (!isPlainObject(plan.deepLinks)) {
      fail("deepLinks", "must be an object");
    }
    validated.deepLinks = {
      maps: plan.deepLinks.maps === undefined ? undefined : asUrl(plan.deepLinks.maps, "deepLinks.maps"),
      website: plan.deepLinks.website === undefined ? undefined : asUrl(plan.deepLinks.website, "deepLinks.website"),
      call: plan.deepLinks.call === undefined ? undefined : asUrl(plan.deepLinks.call, "deepLinks.call", true),
      booking: plan.deepLinks.booking === undefined ? undefined : asUrl(plan.deepLinks.booking, "deepLinks.booking"),
      ticket: plan.deepLinks.ticket === undefined ? undefined : asUrl(plan.deepLinks.ticket, "deepLinks.ticket")
    };
  }

  if (plan.metadata !== undefined) {
    if (!isPlainObject(plan.metadata)) {
      fail("metadata", "must be a plain object");
    }
    const keys = Object.keys(plan.metadata);
    if (keys.length > MAX_METADATA_KEYS) {
      fail("metadata", `must have at most ${MAX_METADATA_KEYS} keys`);
    }
    for (const key of keys) {
      if (key.length > MAX_METADATA_KEY_LENGTH) {
        fail(`metadata.${key}`, `key length must be at most ${MAX_METADATA_KEY_LENGTH}`);
      }
    }
    validated.metadata = { ...plan.metadata };
  }

  return validated;
}

export function validatePlanArray(plans: unknown): Plan[] {
  if (!Array.isArray(plans)) {
    fail("plans", "must be an array");
  }
  return plans.map((plan, index) => {
    try {
      return validatePlan(plan);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(error.details.map((detail) => `plans[${index}].${detail}`));
      }
      throw error;
    }
  });
}
