import { getPlan } from "./catalog.js";
import { resolveAccessWindow } from "./state.js";
import type { SubscriptionService } from "./service.js";
import { PlanTier, ReasonCode, UsageWindow, type PermissionDecision, type UsageMetric } from "./types.js";

export type ProtectedAction =
  | "create_review"
  | "upload_media"
  | "create_creator_guide"
  | "claim_business"
  | "reply_business_review"
  | "generate_ai_itinerary"
  | "create_premium_saved_list";

export class EntitlementPolicyService {
  constructor(private readonly subscriptions: SubscriptionService) {}

  async can(accountId: string, action: ProtectedAction): Promise<PermissionDecision> {
    const resolvedBundle = this.subscriptions.getCurrentEntitlements(accountId);
    const entitlements = resolvedBundle.values;
    const subscription = this.subscriptions.getSubscription(accountId);
    const plan = getPlan(subscription.planId);
    if (!plan) {
      return { allowed: false, reasonCode: ReasonCode.NOT_AVAILABLE, message: "Plan not found" };
    }

    const window = resolveAccessWindow(subscription);
    if (!window.hasAccessNow && resolvedBundle.status !== "FREE") {
      return {
        allowed: false,
        reasonCode: window.reason ?? ReasonCode.SUBSCRIPTION_INACTIVE,
        message: "Subscription access window has ended",
        denialDetails: `status=${subscription.status}`
      };
    }

    if (action === "generate_ai_itinerary" && !Boolean(entitlements.ai_itinerary_generation)) {
      return { allowed: false, reasonCode: ReasonCode.FEATURE_NOT_IN_PLAN, message: "Upgrade required for AI itinerary generation", requiredPlan: plan.targetType === "USER" ? PlanTier.PRO : PlanTier.PLUS };
    }

    if (action === "reply_business_review" && !Boolean(entitlements.business_reply_to_reviews)) {
      return { allowed: false, reasonCode: ReasonCode.FEATURE_NOT_IN_PLAN, message: "Business review replies require Business Plus" };
    }

    if (action === "create_creator_guide" && !Boolean(entitlements.creator_profile_enabled)) {
      return { allowed: false, reasonCode: ReasonCode.WRONG_TARGET_TYPE, message: "Creator profile required" };
    }

    if (action === "claim_business" && !Boolean(entitlements.business_claiming_enabled)) {
      return { allowed: false, reasonCode: ReasonCode.WRONG_TARGET_TYPE, message: "Business account required" };
    }

    return { allowed: true, reasonCode: ReasonCode.ALLOWED, message: "Allowed" };
  }

  async checkQuota(accountId: string, metric: UsageMetric, limit: number): Promise<PermissionDecision> {
    const usage = await this.subscriptions.getUsage(accountId, metric, UsageWindow.MONTHLY);
    if (usage >= limit) {
      return {
        allowed: false,
        reasonCode: ReasonCode.USAGE_LIMIT_REACHED,
        message: `Quota exceeded for ${metric}`,
        usage,
        limit
      };
    }

    return { allowed: true, reasonCode: ReasonCode.ALLOWED, message: "Allowed", usage, limit };
  }
}
