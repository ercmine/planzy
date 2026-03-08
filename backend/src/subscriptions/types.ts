export enum AccountType {
  USER = "USER",
  CREATOR = "CREATOR",
  BUSINESS = "BUSINESS"
}

export enum PlanTier {
  FREE = "FREE",
  PLUS = "PLUS",
  PRO = "PRO",
  ELITE = "ELITE"
}

export enum BillingInterval {
  MONTHLY = "MONTHLY"
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  TRIALING = "TRIALING",
  PAST_DUE = "PAST_DUE",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED"
}

export enum EntitlementValueType {
  BOOLEAN = "BOOLEAN",
  INTEGER = "INTEGER",
  STRING = "STRING"
}

export type EntitlementKey =
  | "ads_enabled"
  | "advanced_search"
  | "ai_recommendations"
  | "ai_itinerary_generation"
  | "priority_support"
  | "max_saved_places"
  | "max_custom_lists"
  | "max_text_reviews_per_month"
  | "max_photo_reviews_per_month"
  | "max_video_reviews_per_month"
  | "max_photo_uploads_per_review"
  | "max_video_duration_seconds"
  | "max_places_claimed"
  | "max_business_locations"
  | "max_creator_guides"
  | "max_featured_posts"
  | "max_collaborations_per_month"
  | "creator_profile_enabled"
  | "creator_analytics"
  | "creator_monetization_tools"
  | "creator_verified_eligibility"
  | "premium_creator_badge"
  | "business_claiming_enabled"
  | "business_analytics"
  | "business_reply_to_reviews"
  | "business_promotions"
  | "business_team_members"
  | "can_access_beta_features"
  | "can_purchase_promotions"
  | "can_be_featured"
  | "can_receive_priority_ranking";

export type EntitlementValue = boolean | number | string;

export interface EntitlementDefinition {
  key: EntitlementKey;
  valueType: EntitlementValueType;
  description: string;
  defaultValue: EntitlementValue;
}

export interface SubscriptionPlan {
  id: string;
  accountType: AccountType;
  tier: PlanTier;
  displayName: string;
  monthlyPriceCents: number;
  billable: boolean;
  visible: boolean;
  saleable: boolean;
  entitlements: Record<EntitlementKey, EntitlementValue>;
  upgradePlanIds: string[];
  downgradePlanIds: string[];
}

export interface Subscription {
  accountId: string;
  planId: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  trialEndsAt?: string;
  graceEndsAt?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStartAt?: string;
  currentPeriodEndAt?: string;
  providerSubscriptionId?: string;
  comped?: boolean;
}

export interface Account {
  id: string;
  accountType: AccountType;
  featureFlags: string[];
  billingStatus: SubscriptionStatus;
}

export interface EntitlementOverride {
  key: EntitlementKey;
  value: EntitlementValue;
  reason?: string;
  expiresAt?: string;
}

export interface ResolvedEntitlements {
  accountId: string;
  accountType: AccountType;
  planId: string;
  values: Record<EntitlementKey, EntitlementValue>;
  sources: Record<EntitlementKey, "default" | "plan" | "flag" | "override" | "grace">;
  evaluatedAt: string;
}

export enum UsageWindow {
  MONTHLY = "MONTHLY",
  LIFETIME = "LIFETIME",
  ACTIVE = "ACTIVE"
}

export type UsageMetric =
  | "saved_places"
  | "custom_lists"
  | "text_reviews"
  | "photo_reviews"
  | "video_reviews"
  | "places_claimed"
  | "business_locations"
  | "creator_guides"
  | "featured_posts"
  | "collaborations";

export interface UsageCounter {
  accountId: string;
  metric: UsageMetric;
  window: UsageWindow;
  periodKey: string;
  value: number;
}

export enum ReasonCode {
  ALLOWED = "ALLOWED",
  PLAN_REQUIRED = "PLAN_REQUIRED",
  PLAN_LIMIT_EXCEEDED = "PLAN_LIMIT_EXCEEDED",
  ACCOUNT_TYPE_MISMATCH = "ACCOUNT_TYPE_MISMATCH",
  SUBSCRIPTION_INACTIVE = "SUBSCRIPTION_INACTIVE",
  NOT_AVAILABLE = "NOT_AVAILABLE"
}

export interface PermissionDecision {
  allowed: boolean;
  reasonCode: ReasonCode;
  message: string;
  requiredPlan?: PlanTier;
  limit?: number;
  usage?: number;
}

export interface PlanChangePreview {
  accountId: string;
  fromPlanId: string;
  toPlanId: string;
  allowed: boolean;
  blockers: Array<{ metric: UsageMetric; currentUsage: number; targetLimit: number; message: string }>;
  suggestedActions: string[];
  entitlementDiff: Array<{ key: EntitlementKey; from: EntitlementValue; to: EntitlementValue }>;
}

export interface SubscriptionEvent {
  id: string;
  accountId: string;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface SubscriptionPlanDto {
  id: string;
  accountType: AccountType;
  tier: PlanTier;
  displayName: string;
  monthlyPriceCents: number;
  billable: boolean;
  includedEntitlements: Record<EntitlementKey, EntitlementValue>;
}
