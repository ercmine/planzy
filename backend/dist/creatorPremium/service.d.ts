import type { SubscriptionService } from "../subscriptions/service.js";
import type { CreatorPremiumDeps, CreatorAnalyticsEvent, CreatorAnalyticsOverview, CreatorAudienceBreakdown, CreatorBrandingSettings, CreatorDiscoverabilityDecision, CreatorEntitlementKey, CreatorMonetizationControls, CreatorPremiumState, CreatorPremiumStore, CreatorQuotaKey, CreatorQuotaStateItem, CreatorTier, CreatorUpgradeContext } from "./types.js";
export declare class CreatorPremiumService {
    private readonly store;
    private readonly subscriptions;
    private readonly deps;
    private ensureCreatorAccount;
    constructor(store: CreatorPremiumStore, subscriptions: SubscriptionService, deps: CreatorPremiumDeps);
    getCreatorTier(creatorProfileId: string): CreatorTier;
    getCreatorPremiumState(creatorProfileId: string): CreatorPremiumState;
    hasCreatorEntitlement(creatorProfileId: string, entitlement: CreatorEntitlementKey): boolean;
    getCreatorQuota(creatorProfileId: string, key: CreatorQuotaKey): CreatorQuotaStateItem;
    consumeQuota(creatorProfileId: string, key: CreatorQuotaKey, amount?: number): CreatorQuotaStateItem;
    canAccessAdvancedCreatorAnalytics(creatorProfileId: string): boolean;
    recordAnalyticsEvent(event: CreatorAnalyticsEvent): void;
    getCreatorAnalyticsOverview(creatorProfileId: string): CreatorAnalyticsOverview;
    getCreatorAudienceBreakdown(creatorProfileId: string): CreatorAudienceBreakdown;
    getCreatorDiscoverabilityEligibility(creatorProfileId: string, input: {
        trustScore: number;
        moderationHealthy: boolean;
        profileCompleteness: number;
        relevanceScore: number;
    }): CreatorDiscoverabilityDecision;
    updateCreatorBranding(actorUserId: string, creatorProfileId: string, patch: Partial<Omit<CreatorBrandingSettings, "creatorProfileId" | "updatedAt">>): CreatorBrandingSettings;
    updateCreatorMonetizationSettings(actorUserId: string, creatorProfileId: string, patch: Partial<Omit<CreatorMonetizationControls, "creatorProfileId" | "updatedAt">>): CreatorMonetizationControls;
    getCreatorUpgradeContext(creatorProfileId: string): CreatorUpgradeContext;
}
