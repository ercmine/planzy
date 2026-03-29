export class MemoryCreatorPremiumStore {
    branding = new Map();
    monetization = new Map();
    events = new Map();
    quotaUsage = new Map();
    getBranding(creatorProfileId) {
        return this.branding.get(creatorProfileId);
    }
    saveBranding(settings) {
        this.branding.set(settings.creatorProfileId, settings);
    }
    getMonetizationControls(creatorProfileId) {
        return this.monetization.get(creatorProfileId);
    }
    saveMonetizationControls(settings) {
        this.monetization.set(settings.creatorProfileId, settings);
    }
    addAnalyticsEvent(event) {
        const current = this.events.get(event.creatorProfileId) ?? [];
        current.push(event);
        this.events.set(event.creatorProfileId, current);
    }
    listAnalyticsEvents(creatorProfileId) {
        return this.events.get(creatorProfileId) ?? [];
    }
    incrementQuotaUsage(creatorProfileId, key, amount) {
        const id = `${creatorProfileId}:${key}`;
        const next = (this.quotaUsage.get(id) ?? 0) + amount;
        this.quotaUsage.set(id, next);
        return next;
    }
    getQuotaUsage(creatorProfileId, key) {
        return this.quotaUsage.get(`${creatorProfileId}:${key}`) ?? 0;
    }
}
