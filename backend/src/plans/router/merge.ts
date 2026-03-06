import { type Plan, type PlanDeepLinks, planId } from "../plan.js";
import { validatePlan } from "../planValidation.js";
import { haversineMeters } from "./geo.js";
import { normalizeAddress, normalizeName } from "./similarity.js";

export interface MergeResult {
  plan: Plan;
  mergedFrom: string[];
}

function cleanString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function roundedCoord(value: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0.0000";
  }
  return value.toFixed(4);
}

function pickTitle(candidates: Plan[]): string {
  const valid = candidates
    .map((candidate) => cleanString(candidate.title))
    .filter((value): value is string => Boolean(value));

  if (valid.length === 0) {
    return "Untitled";
  }

  const withinLimit = valid.filter((value) => value.length <= 140);
  if (withinLimit.length === 0) {
    return valid[0] ?? "Untitled";
  }

  return withinLimit.sort((a, b) => b.length - a.length || a.localeCompare(b))[0] ?? "Untitled";
}

function pickDescription(candidates: Plan[]): string | undefined {
  const valid = candidates
    .map((candidate) => cleanString(candidate.description))
    .filter((value): value is string => typeof value === "string" && value.length > 0 && value.length <= 400);

  if (valid.length === 0) {
    return undefined;
  }

  return valid.sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}

function pickAddress(candidates: Plan[]): string | undefined {
  const addresses = candidates
    .map((candidate) => cleanString(candidate.location.address))
    .filter((value): value is string => Boolean(value));

  if (addresses.length === 0) {
    return undefined;
  }

  return addresses.sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
}

function shouldAverageCoordinates(candidates: Plan[]): boolean {
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      if (!a || !b) {
        continue;
      }
      if (haversineMeters(a.location, b.location) > 50) {
        return false;
      }
    }
  }
  return true;
}

function pickLocation(candidates: Plan[]): Plan["location"] {
  const address = pickAddress(candidates);

  if (shouldAverageCoordinates(candidates)) {
    const lat = candidates.reduce((sum, candidate) => sum + candidate.location.lat, 0) / candidates.length;
    const lng = candidates.reduce((sum, candidate) => sum + candidate.location.lng, 0) / candidates.length;
    return { lat, lng, address };
  }

  const preferred = candidates.find((candidate) => cleanString(candidate.location.address)) ?? candidates[0];
  return {
    lat: preferred?.location.lat ?? 0,
    lng: preferred?.location.lng ?? 0,
    address
  };
}

function pickDistanceMeters(candidates: Plan[]): number | undefined {
  const values = candidates
    .map((candidate) => candidate.distanceMeters)
    .filter((distance): distance is number => typeof distance === "number" && Number.isFinite(distance));

  if (values.length === 0) {
    return undefined;
  }

  return Math.min(...values);
}

function pickPriceLevel(candidates: Plan[]): Plan["priceLevel"] {
  const values = candidates
    .map((candidate) => candidate.priceLevel)
    .filter((price): price is Exclude<Plan["priceLevel"], undefined> => typeof price === "number" && price > 0);
  if (values.length === 0) {
    return undefined;
  }
  return values.sort((a, b) => a - b)[0];
}

function pickRating(candidates: Plan[]): number | undefined {
  const weighted = candidates
    .map((candidate) => ({ rating: candidate.rating, reviewCount: candidate.reviewCount }))
    .filter(
      (item): item is { rating: number; reviewCount: number } =>
        typeof item.rating === "number" && Number.isFinite(item.rating) && typeof item.reviewCount === "number" && item.reviewCount > 0
    );

  if (weighted.length > 0) {
    const totalWeight = weighted.reduce((sum, item) => sum + item.reviewCount, 0);
    const weightedTotal = weighted.reduce((sum, item) => sum + item.rating * item.reviewCount, 0);
    if (totalWeight > 0) {
      return Number((weightedTotal / totalWeight).toFixed(3));
    }
  }

  const ratings = candidates
    .map((candidate) => candidate.rating)
    .filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));

  if (ratings.length === 0) {
    return undefined;
  }

  return Math.max(...ratings);
}

function pickReviewCount(candidates: Plan[]): number | undefined {
  const reviewCounts = candidates
    .map((candidate) => candidate.reviewCount)
    .filter((count): count is number => typeof count === "number" && Number.isInteger(count) && count >= 0);

  if (reviewCounts.length === 0) {
    return undefined;
  }

  return Math.max(...reviewCounts);
}

function mergePhotos(candidates: Plan[]): Plan["photos"] {
  const seen = new Set<string>();
  const merged = candidates
    .flatMap((candidate) => candidate.photos ?? [])
    .filter((photo) => {
      if (!photo?.url || seen.has(photo.url)) {
        return false;
      }
      seen.add(photo.url);
      return true;
    })
    .slice(0, 20)
    .map((photo) => ({ ...photo }));

  return merged.length > 0 ? merged : undefined;
}

function mergeOpenNow(candidates: Plan[]): boolean | undefined {
  const values = candidates
    .map((candidate) => candidate.hours?.openNow)
    .filter((value): value is boolean => typeof value === "boolean");

  if (values.includes(true)) {
    return true;
  }
  if (values.length === candidates.length && values.every((value) => value === false)) {
    return false;
  }
  return undefined;
}

function pickFirstDefined(values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0);
}

function pickWebsite(values: Array<string | undefined>): string | undefined {
  const valid = values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (valid.length === 0) {
    return undefined;
  }
  const https = valid.find((value) => value.startsWith("https://"));
  return https ?? valid[0];
}

function mergeDeepLinks(candidates: Plan[]): PlanDeepLinks | undefined {
  const mapsLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.mapsLink));
  const websiteLink = pickWebsite(candidates.map((candidate) => candidate.deepLinks?.websiteLink));
  const bookingLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.bookingLink));
  const ticketLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.ticketLink));
  const callLink = pickFirstDefined(candidates.map((candidate) => candidate.deepLinks?.callLink));

  const deepLinks: PlanDeepLinks = { mapsLink, websiteLink, bookingLink, ticketLink, callLink };
  if (!mapsLink && !websiteLink && !bookingLink && !ticketLink && !callLink) {
    return undefined;
  }
  return deepLinks;
}

function mergeMetadata(candidates: Plan[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const candidate of candidates) {
    const sourcePrefix = candidate.source;
    const metadata = candidate.metadata;
    if (!metadata || typeof metadata !== "object") {
      continue;
    }

    for (const [key, value] of Object.entries(metadata)) {
      const canOverride = key.startsWith(sourcePrefix);
      if (!(key in merged) || canOverride) {
        merged[key] = value;
      }
    }
  }

  const sources = Array.from(new Set(candidates.map((candidate) => candidate.source)));
  merged._dedupe = { sources, mergedCount: candidates.length };

  const sortedKeys = Object.keys(merged).sort((a, b) => a.localeCompare(b));
  if (sortedKeys.length <= 50) {
    return merged;
  }

  const trimmed: Record<string, unknown> = {};
  if ("_dedupe" in merged) {
    trimmed._dedupe = merged._dedupe;
  }

  for (const key of sortedKeys) {
    if (key === "_dedupe") {
      continue;
    }
    if (Object.keys(trimmed).length >= 50) {
      break;
    }
    trimmed[key] = merged[key];
  }

  return trimmed;
}

function buildStableKey(title: string, location: Plan["location"]): string {
  const normalizedTitle = normalizeName(title) || "untitled";
  const rounded = `${roundedCoord(location.lat)},${roundedCoord(location.lng)}`;
  const normalizedAddress = normalizeAddress(location.address);
  if (normalizedAddress) {
    return `${normalizedTitle}|${normalizedAddress}|${rounded}`;
  }
  return `${normalizedTitle}|${rounded}`;
}

export function mergePlans(candidates: Plan[]): MergeResult {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("mergePlans requires at least one candidate");
  }

  const mergedFrom = candidates.map((candidate) => candidate.id);
  const title = pickTitle(candidates);
  const location = pickLocation(candidates);
  const stableKey = buildStableKey(title, location);

  const merged: Plan = {
    id: planId("deduped", stableKey),
    source: "deduped",
    sourceId: stableKey,
    title,
    category: candidates[0]?.category ?? "other",
    description: pickDescription(candidates),
    location,
    distanceMeters: pickDistanceMeters(candidates),
    priceLevel: pickPriceLevel(candidates),
    rating: pickRating(candidates),
    reviewCount: pickReviewCount(candidates),
    photos: mergePhotos(candidates),
    hours: { openNow: mergeOpenNow(candidates) },
    deepLinks: mergeDeepLinks(candidates),
    metadata: mergeMetadata(candidates)
  };

  if (merged.hours?.openNow === undefined) {
    delete merged.hours;
  }

  const plan = validatePlan(merged);
  return { plan, mergedFrom };
}
