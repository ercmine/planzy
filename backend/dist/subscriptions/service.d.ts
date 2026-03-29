import type { BillingProvider } from "./billing/provider.js";
import { type UsageStore } from "./usage.js";
import { CancellationMode, PlanTier, ReasonCode, RenewalStatus, SubscriptionStatus, UsageWindow, type Account, type AccountType, type EntitlementOverride, type PlanChangePreview, type Subscription, type SubscriptionEvent, type SubscriptionPlanDto, type SubscriptionSummary, type SubscriptionTargetRef, type TrialEligibilityResult, type UsageMetric } from "./types.js";
export interface SubscriptionServiceHooks {
    onEvent?: (event: SubscriptionEvent, subscription: Subscription) => Promise<void> | void;
}
export declare class SubscriptionService {
    private readonly usageStore;
    private readonly billingProvider;
    private readonly hooks;
    private readonly accounts;
    private readonly subscriptions;
    private readonly overrides;
    private readonly events;
    private readonly usedTrialByTargetPlan;
    constructor(usageStore: UsageStore, billingProvider: BillingProvider, hooks?: SubscriptionServiceHooks);
    ensureAccount(accountId: string, accountType: AccountType): Account;
    listSubscriptions(): Subscription[];
    listAccounts(): Account[];
    listEvents(accountId: string): SubscriptionEvent[];
    getSubscription(accountId: string): Subscription;
    getCurrentEntitlements(accountId: string): import("./types.js").ResolvedEntitlements;
    getCurrentSubscriptionSummary(accountId: string): SubscriptionSummary;
    getBillingState(accountId: string): {
        target: {
            type: import("./types.js").SubscriptionTargetType;
            id: string;
        };
        status: SubscriptionStatus;
        renewalStatus: RenewalStatus;
        cancellationMode: CancellationMode;
        window: import("./types.js").AccessWindowResolution;
    };
    getAvailablePlansForAccount(accountId: string): SubscriptionPlanDto[];
    canStartTrial(target: SubscriptionTargetRef, planId: string): TrialEligibilityResult;
    startTrial(accountId: string, planId: string): Subscription;
    previewPlanChange(accountId: string, targetPlanId: string): Promise<PlanChangePreview>;
    startSubscriptionChange(accountId: string, targetPlanId: string): Promise<{
        ok: boolean;
        providerRequestId: string;
    }>;
    markSubscriptionActive(accountId: string): Promise<void>;
    markPastDue(accountId: string): void;
    enterGracePeriod(accountId: string, graceDays?: number): void;
    cancelSubscription(accountId: string): Promise<void>;
    cancelImmediately(accountId: string): Promise<void>;
    resumeSubscription(accountId: string): Promise<void>;
    expireSubscription(accountId: string): void;
    getUsageSummary(accountId: string): Promise<import("./types.js").UsageCounter[]>;
    getUsage(accountId: string, metric: UsageMetric, window: UsageWindow): Promise<number>;
    recordUsage(accountId: string, metric: UsageMetric, window: UsageWindow, amount?: number): Promise<void>;
    applyEntitlementOverride(accountId: string, override: EntitlementOverride): void;
    grantTrial(accountId: string, trialDays: number): void;
    compPlan(accountId: string, planId: string): void;
    getEventHistory(accountId: string): SubscriptionEvent[];
    private reconcileTimeDrivenState;
    private appendEvent;
}
export declare function getRequiredTierForFeature(feature: string): PlanTier | undefined;
export declare function inactiveSubscriptionReason(status: SubscriptionStatus): ReasonCode | null;
