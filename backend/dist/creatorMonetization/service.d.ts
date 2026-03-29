import type { AccountsService } from "../accounts/service.js";
import { type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import type { CreatorStore } from "../creator/store.js";
import type { CreatorMonetizationStore } from "./store.js";
import type { CreatorMembershipPlan, CreatorMonetizationCapabilitiesResponse, CreatorMonetizationProfile, MonetizationEligibilityResult, MonetizationReasonCode, MonetizationStatus, PremiumAccessDecision, TipIntent } from "./types.js";
export interface TipPaymentAdapter {
    name: string;
    createIntent(input: TipIntent): Promise<{
        externalPaymentRef: string;
    }>;
}
export declare class CreatorMonetizationService {
    private readonly store;
    private readonly accounts;
    private readonly subscriptions;
    private readonly creatorStore;
    private readonly accessEngine?;
    private readonly tipAdapter?;
    constructor(store: CreatorMonetizationStore, accounts: AccountsService, subscriptions: SubscriptionService, creatorStore: CreatorStore, accessEngine?: FeatureQuotaEngine | undefined, tipAdapter?: TipPaymentAdapter | undefined);
    private ensureProfileForCreator;
    getProfile(creatorProfileId: string): CreatorMonetizationProfile;
    evaluateEligibility(creatorProfileId: string): MonetizationEligibilityResult;
    getCapabilities(creatorProfileId: string): CreatorMonetizationCapabilitiesResponse;
    updateSettings(actorUserId: string, creatorProfileId: string, patch: Partial<Pick<CreatorMonetizationProfile, "tippingEnabled" | "premiumContentEnabled" | "featuredPlacementOptIn" | "monetizationVisibility">>): CreatorMonetizationProfile;
    adminUpdateStatus(adminUserId: string, creatorProfileId: string, input: {
        status: MonetizationStatus;
        reasonCode?: MonetizationReasonCode;
        restrictions?: string[];
        featuredOverride?: boolean;
    }): CreatorMonetizationProfile;
    createTipIntent(senderUserId: string, input: {
        creatorProfileId: string;
        amountMinor: number;
        currency?: string;
        note?: string;
        relatedContentId?: string;
        relatedContentType?: "guide" | "review" | "video";
    }): Promise<TipIntent>;
    listTipSummary(creatorProfileId: string): {
        totalCount: number;
        grossAmountMinor: number;
    };
    setGuidePremiumMode(actorUserId: string, creatorProfileId: string, guideId: string, input: {
        mode: "free" | "premium" | "elite" | "membership";
        previewSummary?: string;
    }): void;
    evaluateGuideAccess(viewerUserId: string | undefined, creatorProfileId: string, guideId: string): PremiumAccessDecision;
    createMembershipPlan(actorUserId: string, creatorProfileId: string, input: {
        code: string;
        tierName: string;
        monthlyPriceMinor: number;
        currency?: string;
        perks?: string[];
    }): CreatorMembershipPlan;
    listAuditLogs(creatorProfileId: string): import("./types.js").MonetizationAuditLog[];
}
