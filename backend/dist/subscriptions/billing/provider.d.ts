import type { Subscription } from "../types.js";
export interface BillingProvider {
    requestPlanChange(input: {
        accountId: string;
        current: Subscription;
        targetPlanId: string;
    }): Promise<{
        providerRequestId: string;
    }>;
    cancelSubscription(input: {
        accountId: string;
        subscription: Subscription;
    }): Promise<void>;
    resumeSubscription(input: {
        accountId: string;
        subscription: Subscription;
    }): Promise<void>;
}
export declare class DevBillingProvider implements BillingProvider {
    requestPlanChange(): Promise<{
        providerRequestId: string;
    }>;
    cancelSubscription(): Promise<void>;
    resumeSubscription(): Promise<void>;
}
