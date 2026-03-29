import type { SubscriptionService } from "./service.js";
import { type PermissionDecision, type UsageMetric } from "./types.js";
export type ProtectedAction = "create_review" | "upload_media" | "create_creator_guide" | "claim_business" | "reply_business_review" | "generate_ai_itinerary" | "create_premium_saved_list";
export declare class EntitlementPolicyService {
    private readonly subscriptions;
    constructor(subscriptions: SubscriptionService);
    can(accountId: string, action: ProtectedAction): Promise<PermissionDecision>;
    checkQuota(accountId: string, metric: UsageMetric, limit: number): Promise<PermissionDecision>;
}
