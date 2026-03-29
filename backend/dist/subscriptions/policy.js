import { ReasonCode, UsageWindow } from "./types.js";
export class EntitlementPolicyService {
    subscriptions;
    constructor(subscriptions) {
        this.subscriptions = subscriptions;
    }
    async can(accountId, action) {
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
    async checkQuota(accountId, metric, limit) {
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
