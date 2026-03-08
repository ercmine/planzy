import type { CreatorAnalyticsEvent, CreatorBrandingSettings, CreatorMonetizationControls, CreatorPremiumStore, CreatorQuotaKey } from "./types.js";

export class MemoryCreatorPremiumStore implements CreatorPremiumStore {
  private readonly branding = new Map<string, CreatorBrandingSettings>();
  private readonly monetization = new Map<string, CreatorMonetizationControls>();
  private readonly events = new Map<string, CreatorAnalyticsEvent[]>();
  private readonly quotaUsage = new Map<string, number>();

  getBranding(creatorProfileId: string): CreatorBrandingSettings | undefined {
    return this.branding.get(creatorProfileId);
  }

  saveBranding(settings: CreatorBrandingSettings): void {
    this.branding.set(settings.creatorProfileId, settings);
  }

  getMonetizationControls(creatorProfileId: string): CreatorMonetizationControls | undefined {
    return this.monetization.get(creatorProfileId);
  }

  saveMonetizationControls(settings: CreatorMonetizationControls): void {
    this.monetization.set(settings.creatorProfileId, settings);
  }

  addAnalyticsEvent(event: CreatorAnalyticsEvent): void {
    const current = this.events.get(event.creatorProfileId) ?? [];
    current.push(event);
    this.events.set(event.creatorProfileId, current);
  }

  listAnalyticsEvents(creatorProfileId: string): CreatorAnalyticsEvent[] {
    return this.events.get(creatorProfileId) ?? [];
  }

  incrementQuotaUsage(creatorProfileId: string, key: CreatorQuotaKey, amount: number): number {
    const id = `${creatorProfileId}:${key}`;
    const next = (this.quotaUsage.get(id) ?? 0) + amount;
    this.quotaUsage.set(id, next);
    return next;
  }

  getQuotaUsage(creatorProfileId: string, key: CreatorQuotaKey): number {
    return this.quotaUsage.get(`${creatorProfileId}:${key}`) ?? 0;
  }
}
