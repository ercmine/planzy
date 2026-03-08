export enum SubscriptionTargetType {
  USER = "USER",
  CREATOR = "CREATOR",
  BUSINESS = "BUSINESS",
  MULTI = "MULTI"
}

// Backward-compatible alias used by account-service integration.
export const AccountType = SubscriptionTargetType;
export type AccountType = SubscriptionTargetType;

export enum PlanTier {
  FREE = "FREE",
  PLUS = "PLUS",
  PRO = "PRO",
  ELITE = "ELITE"
}

export enum PlanInterval {
  NONE = "NONE",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
  LIFETIME = "LIFETIME"
}

// Backward-compatible alias used by existing tests/scaffolding.
export const BillingInterval = PlanInterval;
export type BillingInterval = PlanInterval;

export enum BillingProviderName {
  INTERNAL = "INTERNAL",
  STRIPE = "STRIPE",
  APP_STORE = "APP_STORE",
  PLAY_STORE = "PLAY_STORE",
  UNKNOWN = "UNKNOWN"
}

export enum SubscriptionStatus {
  FREE = "FREE",
  TRIALING = "TRIALING",
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  GRACE_PERIOD = "GRACE_PERIOD",
  CANCELED = "CANCELED",
  EXPIRED = "EXPIRED",
  INCOMPLETE = "INCOMPLETE"
}

export enum RenewalStatus {
  AUTO_RENEW_ON = "AUTO_RENEW_ON",
  AUTO_RENEW_OFF = "AUTO_RENEW_OFF",
  NON_RENEWING = "NON_RENEWING",
  UNKNOWN = "UNKNOWN"
}

export enum CancellationMode {
  NONE = "NONE",
  CANCEL_AT_PERIOD_END = "CANCEL_AT_PERIOD_END",
  IMMEDIATE = "IMMEDIATE",
  PROVIDER_FORCED = "PROVIDER_FORCED"
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
  | "max_places_per_list"
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

export interface PlanDefinition {
  id: string;
  code: string;
  targetType: SubscriptionTargetType;
  tier: PlanTier;
  displayName: string;
  interval: PlanInterval;
  priceAmount: number;
  priceCurrency: string;
  isActive: boolean;
  billable: boolean;
  visible: boolean;
  saleable: boolean;
  trialDays?: number;
  metadata?: Record<string, unknown>;
  entitlements: Record<EntitlementKey, EntitlementValue>;
  upgradePlanIds: string[];
  downgradePlanIds: string[];
}

// Backward-compatible alias.
export type SubscriptionPlan = PlanDefinition;

export interface SubscriptionTargetRef {
  type: SubscriptionTargetType;
  id: string;
}

export interface Subscription {
  id: string;
  targetType: SubscriptionTargetType;
  targetId: string;
  planId: string;
  provider: BillingProviderName;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  status: SubscriptionStatus;
  renewalStatus: RenewalStatus;
  cancellationMode: CancellationMode;
  startedAt: string;
  currentPeriodStartAt?: string;
  currentPeriodEndAt?: string;
  renewsAt?: string;
  canceledAt?: string;
  cancelEffectiveAt?: string;
  expiresAt?: string;
  trialStartAt?: string;
  trialEndAt?: string;
  graceStartAt?: string;
  graceEndAt?: string;
  pastDueAt?: string;
  lastPaymentAt?: string;
  billingAnchorAt?: string;
  autoRenews: boolean;
  comped?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  accountType: SubscriptionTargetType;
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
  targetType: SubscriptionTargetType;
  targetId: string;
  accountId: string;
  accountType: SubscriptionTargetType;
  planId: string;
  status: SubscriptionStatus;
  hasAccessNow: boolean;
  values: Record<EntitlementKey, EntitlementValue>;
  sources: Record<EntitlementKey, "default" | "plan" | "flag" | "override" | "grace" | "fallback_free">;
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
  NOT_AVAILABLE = "NOT_AVAILABLE",
  NO_SUBSCRIPTION = "NO_SUBSCRIPTION",
  WRONG_TARGET_TYPE = "WRONG_TARGET_TYPE",
  TRIAL_EXPIRED = "TRIAL_EXPIRED",
  SUBSCRIPTION_PAST_DUE = "SUBSCRIPTION_PAST_DUE",
  GRACE_PERIOD_EXPIRED = "GRACE_PERIOD_EXPIRED",
  CANCELED_EFFECTIVE = "CANCELED_EFFECTIVE",
  FEATURE_NOT_IN_PLAN = "FEATURE_NOT_IN_PLAN",
  USAGE_LIMIT_REACHED = "USAGE_LIMIT_REACHED"
}

export interface PermissionDecision {
  allowed: boolean;
  reasonCode: ReasonCode;
  message: string;
  requiredPlan?: PlanTier;
  limit?: number;
  usage?: number;
  denialDetails?: string;
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
  subscriptionId: string;
  targetId: string;
  targetType: SubscriptionTargetType;
  type:
    | "created"
    | "trial_started"
    | "activated"
    | "renewed"
    | "payment_failed"
    | "grace_started"
    | "canceled"
    | "expired"
    | "reactivated"
    | "plan_changed"
    | "entitlement_override";
  previousState?: SubscriptionStatus;
  nextState?: SubscriptionStatus;
  occurredAt: string;
  actor: "system" | "admin" | "provider" | "user";
  payload: Record<string, unknown>;
}

export interface SubscriptionPlanDto {
  id: string;
  code: string;
  targetType: SubscriptionTargetType;
  tier: PlanTier;
  displayName: string;
  priceAmount: number;
  priceCurrency: string;
  interval: PlanInterval;
  billable: boolean;
  trialAvailable: boolean;
  includedEntitlements: Record<EntitlementKey, EntitlementValue>;
}

export interface SubscriptionSummary {
  targetType: SubscriptionTargetType;
  targetId: string;
  planCode: string;
  status: SubscriptionStatus;
  renewalStatus: RenewalStatus;
  isTrial: boolean;
  willCancelAtPeriodEnd: boolean;
  hasAccessNow: boolean;
  accessEndsAt?: string;
  currentPeriodEndAt?: string;
  graceEndAt?: string;
  trialEndAt?: string;
  nextRenewalAt?: string;
  priceAmount: number;
  priceCurrency: string;
  interval: PlanInterval;
  upgradeEligible: boolean;
  downgradeEligible: boolean;
}

export interface EntitlementSummary {
  targetType: SubscriptionTargetType;
  targetId: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export interface TrialEligibilityResult {
  eligible: boolean;
  reasonCodes: Array<"already_used_trial" | "target_ineligible" | "wrong_plan_type" | "active_subscription_exists" | "role_missing">;
}

export interface AccessWindowResolution {
  hasAccessNow: boolean;
  softActive: boolean;
  inGrace: boolean;
  expiresAt?: string;
  shouldDowngradeNow: boolean;
  reason?: ReasonCode;
}
