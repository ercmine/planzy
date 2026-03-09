import type { AnalyticsEventContext, AnalyticsEventInput } from "./types.js";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from "./events.js";
import { ValidationError } from "../plans/errors.js";

const BLOCKED_METADATA_KEYS = ["email", "phone", "address", "fullName", "reviewBody", "searchQueryRaw"];

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

function sanitizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (BLOCKED_METADATA_KEYS.includes(k)) continue;
    if (typeof v === "string") {
      output[k] = v.slice(0, 256);
    } else if (typeof v === "number" || typeof v === "boolean" || v == null) {
      output[k] = v;
    }
  }
  return output;
}

export function validateAnalyticsEventName(name: unknown): AnalyticsEventName {
  const normalized = asString(name);
  if (!normalized || !(normalized in ANALYTICS_EVENT_NAMES)) {
    throw new ValidationError(["eventName is invalid"]);
  }
  return normalized as AnalyticsEventName;
}

export function validateAnalyticsEvent(input: unknown): AnalyticsEventInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError(["analytics event must be an object"]);
  }
  const x = input as Record<string, unknown>;
  const eventName = validateAnalyticsEventName(x.eventName);
  const occurredAt = asString(x.occurredAt);
  const value = x.value == null ? undefined : Number(x.value);
  if (value !== undefined && !Number.isFinite(value)) {
    throw new ValidationError(["value must be a finite number"]);
  }

  return {
    eventName,
    occurredAt,
    dedupeKey: asString(x.dedupeKey),
    placeId: asString(x.placeId),
    reviewId: asString(x.reviewId),
    mediaId: asString(x.mediaId),
    creatorId: asString(x.creatorId),
    businessId: asString(x.businessId),
    adPlacementId: asString(x.adPlacementId),
    subscriptionId: asString(x.subscriptionId),
    collaborationId: asString(x.collaborationId),
    value,
    currency: asString(x.currency),
    success: typeof x.success === "boolean" ? x.success : undefined,
    metadata: sanitizeMetadata(x.metadata)
  };
}

export function sanitizeAnalyticsContext(input: AnalyticsEventContext): AnalyticsEventContext {
  return {
    ...input,
    actorUserId: asString(input.actorUserId),
    actorProfileType: input.actorProfileType,
    actorProfileId: asString(input.actorProfileId),
    sessionId: asString(input.sessionId),
    anonymousId: asString(input.anonymousId),
    requestId: asString(input.requestId),
    correlationId: asString(input.correlationId),
    sourceScreen: asString(input.sourceScreen),
    sourceRoute: asString(input.sourceRoute),
    targetRoute: asString(input.targetRoute),
    cityId: asString(input.cityId),
    cityName: asString(input.cityName),
    categoryId: asString(input.categoryId),
    categoryName: asString(input.categoryName),
    entitlementTier: asString(input.entitlementTier),
    appVersion: asString(input.appVersion),
    platform: input.platform,
    environment: asString(input.environment),
    locale: asString(input.locale),
    referrer: asString(input.referrer),
    utmSource: asString(input.utmSource),
    utmMedium: asString(input.utmMedium),
    utmCampaign: asString(input.utmCampaign),
    providerSource: asString(input.providerSource),
    experimentId: asString(input.experimentId),
    experimentVariant: asString(input.experimentVariant)
  };
}
