export class DevBillingProvider {
    async requestPlanChange() {
        return { providerRequestId: `dev_${Date.now()}` };
    }
    async cancelSubscription() {
        return;
    }
    async resumeSubscription() {
        return;
    }
}
