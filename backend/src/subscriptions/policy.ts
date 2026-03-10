import type { SubscriptionService } from "./service.js";
import { ReasonCode, UsageWindow, type PermissionDecision, type UsageMetric } from "./types.js";

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
    this.subscriptions.getCurrentEntitlements(accountId);

    if (action === "claim_business" || action === "reply_business_review") {
      return {
        allowed: false,
        reasonCode: ReasonCode.NOT_AVAILABLE,
        message: "Business tooling has been retired from the active product"
      };
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
