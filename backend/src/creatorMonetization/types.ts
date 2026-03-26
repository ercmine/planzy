import type { EntitlementValue } from "../subscriptions/types.js";

export type MonetizationStatus = "not_eligible" | "eligible" | "pending_review" | "active" | "limited" | "suspended" | "rejected";
export type MonetizationReasonCode = "creator_profile_missing" | "creator_not_active" | "moderation_suspended" | "missing_plan_entitlement" | "pending_admin_review" | "trust_threshold_not_met" | "compliance_not_ready" | "admin_override" | "manual_restriction" | "policy_violation";
export type PayoutReadinessStatus = "not_started" | "pending" | "ready" | "blocked";
export type ComplianceReadinessStatus = "not_started" | "pending" | "ready" | "blocked";

export type MonetizationCapability = "canReceiveTips" | "canReceiveDryadTips" | "canClaimDryadRewards" | "canPublishPremiumContent" | "canBeFeatured" | "canAccessHigherUploadLimits" | "canOfferSubscriptionsFuture" | "canAccessCreatorAnalyticsPremium" | "canUploadExtendedVideo" | "canCreatePremiumGuides";

export interface CreatorMonetizationProfile {
  id: string;
  creatorProfileId: string;
  creatorUserId: string;
  monetizationStatus: MonetizationStatus;
  statusReasonCode?: MonetizationReasonCode;
  tippingEnabled: boolean;
  premiumContentEnabled: boolean;
  featuredPlacementEligible: boolean;
  featuredPlacementOptIn: boolean;
  monetizationVisibility: "hidden" | "public_badge";
  futureSubscriptionsEnabledPlaceholder: boolean;
  payoutReadinessStatus: PayoutReadinessStatus;
  complianceReadinessStatus: ComplianceReadinessStatus;
  monetizationCapabilities: Partial<Record<MonetizationCapability, boolean>>;
  restrictions: string[];
  adminFeaturedOverride?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TipStatus = "intent_created" | "pending" | "succeeded" | "failed" | "canceled" | "refunded";
export interface TipIntent {
  chain?: "fiat" | "solana";
  amountAtomic?: string;
  tokenMintAddress?: string;
  senderWalletPublicKey?: string;
  recipientWalletPublicKey?: string;
  transactionSignature?: string;
  id: string;
  senderUserId: string;
  creatorUserId: string;
  creatorProfileId: string;
  relatedContentId?: string;
  relatedContentType?: "guide" | "review" | "video";
  amountMinor: number;
  currency: string;
  platformFeeMinor?: number;
  creatorAmountMinor?: number;
  status: TipStatus;
  note?: string;
  paymentProvider?: string;
  externalPaymentRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorMembershipPlan {
  id: string;
  creatorProfileId: string;
  code: string;
  status: "draft" | "active" | "archived";
  monthlyPriceMinor: number;
  currency: string;
  tierName: string;
  perks: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MonetizationAuditLog {
  id: string;
  creatorProfileId: string;
  actorUserId: string;
  action: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreatorMonetizationCapabilitiesResponse {
  status: MonetizationStatus;
  reasonCode?: MonetizationReasonCode;
  capabilities: Record<MonetizationCapability, boolean>;
  sourceEntitlements: Partial<Record<string, EntitlementValue>>;
}

export interface MonetizationEligibilityResult {
  eligible: boolean;
  status: MonetizationStatus;
  reasonCode?: MonetizationReasonCode;
  adminExplanation: string;
  userExplanation: string;
}

export interface PremiumAccessDecision {
  locked: boolean;
  reasonCode?: "creator_not_eligible" | "viewer_entitlement_missing" | "moderation_restricted";
  previewSummary?: string;
}
