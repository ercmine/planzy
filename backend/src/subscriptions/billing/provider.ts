import type { Subscription } from "../types.js";

export interface BillingProvider {
  requestPlanChange(input: { accountId: string; current: Subscription; targetPlanId: string }): Promise<{ providerRequestId: string }>;
  cancelSubscription(input: { accountId: string; subscription: Subscription }): Promise<void>;
  resumeSubscription(input: { accountId: string; subscription: Subscription }): Promise<void>;
}

export class DevBillingProvider implements BillingProvider {
  async requestPlanChange(): Promise<{ providerRequestId: string }> {
    return { providerRequestId: `dev_${Date.now()}` };
  }

  async cancelSubscription(): Promise<void> {
    return;
  }

  async resumeSubscription(): Promise<void> {
    return;
  }
}
