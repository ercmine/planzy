import type { AnalyticsEventCategory, AnalyticsEventName } from "./events.js";

export type ActorProfileType = "user" | "creator" | "business" | "admin" | "system";

export interface AnalyticsEventContext {
  actorUserId?: string;
  actorProfileType?: ActorProfileType;
  actorProfileId?: string;
  sessionId?: string;
  anonymousId?: string;
  requestId?: string;
  correlationId?: string;
  sourceScreen?: string;
  sourceRoute?: string;
  targetRoute?: string;
  cityId?: string;
  cityName?: string;
  categoryId?: string;
  categoryName?: string;
  entitlementTier?: string;
  appVersion?: string;
  platform?: "ios" | "android" | "web" | "backend";
  environment?: string;
  locale?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  providerSource?: string;
  experimentId?: string;
  experimentVariant?: string;
}

export interface AnalyticsEventInput {
  eventName: AnalyticsEventName;
  occurredAt?: string;
  dedupeKey?: string;
  placeId?: string;
  reviewId?: string;
  mediaId?: string;
  creatorId?: string;
  businessId?: string;
  adPlacementId?: string;
  subscriptionId?: string;
  collaborationId?: string;
  value?: number;
  currency?: string;
  success?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsEventRecord extends AnalyticsEventInput, AnalyticsEventContext {
  id: string;
  eventCategory: AnalyticsEventCategory;
  receivedAt: string;
  occurredAt: string;
}

export interface AnalyticsStore {
  insert(events: AnalyticsEventRecord[]): Promise<void>;
  list(): Promise<AnalyticsEventRecord[]>;
  hasDedupeKey(dedupeKey: string): Promise<boolean>;
}

export interface AnalyticsIngestResult {
  accepted: number;
  rejected: number;
  deduped: number;
  errors: Array<{ index: number; reason: string }>;
}

export interface TimeRange {
  from: Date;
  to: Date;
}
