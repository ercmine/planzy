import type { CreatorAnalyticsEvent, CreatorBrandingSettings, CreatorMonetizationControls, CreatorPremiumStore, CreatorQuotaKey } from "./types.js";
export declare class MemoryCreatorPremiumStore implements CreatorPremiumStore {
    private readonly branding;
    private readonly monetization;
    private readonly events;
    private readonly quotaUsage;
    getBranding(creatorProfileId: string): CreatorBrandingSettings | undefined;
    saveBranding(settings: CreatorBrandingSettings): void;
    getMonetizationControls(creatorProfileId: string): CreatorMonetizationControls | undefined;
    saveMonetizationControls(settings: CreatorMonetizationControls): void;
    addAnalyticsEvent(event: CreatorAnalyticsEvent): void;
    listAnalyticsEvents(creatorProfileId: string): CreatorAnalyticsEvent[];
    incrementQuotaUsage(creatorProfileId: string, key: CreatorQuotaKey, amount: number): number;
    getQuotaUsage(creatorProfileId: string, key: CreatorQuotaKey): number;
}
