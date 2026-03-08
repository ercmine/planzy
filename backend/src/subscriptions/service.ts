import { randomUUID } from "node:crypto";

import { getAvailablePlans, getPlan } from "./catalog.js";
import type { BillingProvider } from "./billing/provider.js";
import { resolveEntitlements } from "./resolver.js";
import { currentPeriodKey, type UsageStore } from "./usage.js";
import { AccountType, BillingInterval, PlanTier, ReasonCode, SubscriptionStatus, UsageWindow, type Account, type EntitlementOverride, type PlanChangePreview, type SubscriptionPlanDto, type Subscription, type SubscriptionEvent, type UsageMetric } from "./types.js";

export class SubscriptionService {
  private readonly accounts = new Map<string, Account>();
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly overrides = new Map<string, EntitlementOverride[]>();
  private readonly events = new Map<string, SubscriptionEvent[]>();

  constructor(private readonly usageStore: UsageStore, private readonly billingProvider: BillingProvider) {}

  ensureAccount(accountId: string, accountType: AccountType): Account {
    const current = this.accounts.get(accountId);
    if (current) return current;
    const account: Account = { id: accountId, accountType, featureFlags: [], billingStatus: SubscriptionStatus.ACTIVE };
    this.accounts.set(accountId, account);

    const fallbackPlan = getAvailablePlans(accountType).find((plan) => plan.tier === PlanTier.FREE);
    if (!fallbackPlan) throw new Error(`No free plan for ${accountType}`);

    this.subscriptions.set(accountId, {
      accountId,
      planId: fallbackPlan.id,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: BillingInterval.MONTHLY
    });
    return account;
  }

  getSubscription(accountId: string): Subscription {
    const sub = this.subscriptions.get(accountId);
    if (!sub) throw new Error(`Subscription not found: ${accountId}`);
    return sub;
  }

  getCurrentEntitlements(accountId: string) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return resolveEntitlements({ account, subscription: this.getSubscription(accountId), overrides: this.overrides.get(accountId) });
  }

  getAvailablePlansForAccount(accountId: string): SubscriptionPlanDto[] {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return getAvailablePlans(account.accountType).map((plan) => ({
      id: plan.id,
      accountType: plan.accountType,
      tier: plan.tier,
      displayName: plan.displayName,
      monthlyPriceCents: plan.monthlyPriceCents,
      billable: plan.billable,
      includedEntitlements: plan.entitlements
    }));
  }

  async previewPlanChange(accountId: string, targetPlanId: string): Promise<PlanChangePreview> {
    const account = this.accounts.get(accountId);
    const current = this.getSubscription(accountId);
    const target = getPlan(targetPlanId);
    if (!account || !target) throw new Error("invalid account or plan");
    if (target.accountType !== account.accountType) {
      return { accountId, fromPlanId: current.planId, toPlanId: targetPlanId, allowed: false, blockers: [], suggestedActions: ["Select a plan for your account type"], entitlementDiff: [] };
    }

    const currentResolved = this.getCurrentEntitlements(accountId).values;
    const blockers: PlanChangePreview["blockers"] = [];

    const quotaMap: Array<{ metric: UsageMetric; key: keyof typeof currentResolved; message: string }> = [
      { metric: "saved_places", key: "max_saved_places", message: "Reduce saved places before downgrade" },
      { metric: "creator_guides", key: "max_creator_guides", message: "Archive creator guides before downgrade" },
      { metric: "business_locations", key: "max_business_locations", message: "Remove business locations before downgrade" },
      { metric: "places_claimed", key: "max_places_claimed", message: "Unclaim locations before downgrade" }
    ];

    for (const quota of quotaMap) {
      const targetLimit = Number(target.entitlements[quota.key]);
      const usage = await this.usageStore.get(accountId, quota.metric, UsageWindow.ACTIVE, currentPeriodKey());
      if (Number.isFinite(targetLimit) && usage > targetLimit) {
        blockers.push({ metric: quota.metric, currentUsage: usage, targetLimit, message: quota.message });
      }
    }

    const entitlementDiff = Object.entries(target.entitlements)
      .filter(([key, value]) => currentResolved[key as keyof typeof currentResolved] !== value)
      .map(([key, to]) => ({ key: key as keyof typeof currentResolved, from: currentResolved[key as keyof typeof currentResolved], to }));

    return {
      accountId,
      fromPlanId: current.planId,
      toPlanId: targetPlanId,
      allowed: blockers.length === 0,
      blockers,
      suggestedActions: blockers.length ? blockers.map((b) => b.message) : [],
      entitlementDiff
    };
  }

  async startSubscriptionChange(accountId: string, targetPlanId: string): Promise<{ ok: boolean; providerRequestId: string }> {
    const preview = await this.previewPlanChange(accountId, targetPlanId);
    if (!preview.allowed) throw new Error("Plan change blocked");
    const current = this.getSubscription(accountId);
    const response = await this.billingProvider.requestPlanChange({ accountId, current, targetPlanId });
    this.subscriptions.set(accountId, { ...current, planId: targetPlanId, status: SubscriptionStatus.ACTIVE });
    this.appendEvent(accountId, "subscription.changed", { fromPlanId: current.planId, toPlanId: targetPlanId });
    return { ok: true, providerRequestId: response.providerRequestId };
  }

  async cancelSubscription(accountId: string): Promise<void> {
    const sub = this.getSubscription(accountId);
    await this.billingProvider.cancelSubscription({ accountId, subscription: sub });
    this.subscriptions.set(accountId, { ...sub, cancelAtPeriodEnd: true });
    this.appendEvent(accountId, "subscription.cancel_requested", {});
  }

  async resumeSubscription(accountId: string): Promise<void> {
    const sub = this.getSubscription(accountId);
    await this.billingProvider.resumeSubscription({ accountId, subscription: sub });
    this.subscriptions.set(accountId, { ...sub, cancelAtPeriodEnd: false });
    this.appendEvent(accountId, "subscription.resumed", {});
  }

  async getUsageSummary(accountId: string) {
    return this.usageStore.listByAccount(accountId);
  }

  async getUsage(accountId: string, metric: UsageMetric, window: UsageWindow): Promise<number> {
    return this.usageStore.get(accountId, metric, window, currentPeriodKey());
  }

  async recordUsage(accountId: string, metric: UsageMetric, window: UsageWindow, amount = 1): Promise<void> {
    await this.usageStore.increment(accountId, metric, window, amount, currentPeriodKey());
  }

  applyEntitlementOverride(accountId: string, override: EntitlementOverride): void {
    const rows = this.overrides.get(accountId) ?? [];
    rows.push(override);
    this.overrides.set(accountId, rows);
    this.appendEvent(accountId, "entitlement.override", override as unknown as Record<string, unknown>);
  }

  grantTrial(accountId: string, trialDays: number): void {
    const sub = this.getSubscription(accountId);
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    this.subscriptions.set(accountId, { ...sub, status: SubscriptionStatus.TRIALING, trialEndsAt });
    this.appendEvent(accountId, "subscription.trial_granted", { trialEndsAt });
  }

  compPlan(accountId: string, planId: string): void {
    const sub = this.getSubscription(accountId);
    this.subscriptions.set(accountId, { ...sub, planId, comped: true });
    this.appendEvent(accountId, "subscription.comped", { planId });
  }

  getEventHistory(accountId: string): SubscriptionEvent[] {
    return this.events.get(accountId) ?? [];
  }

  private appendEvent(accountId: string, type: string, payload: Record<string, unknown>): void {
    const rows = this.events.get(accountId) ?? [];
    rows.unshift({ id: randomUUID(), accountId, type, occurredAt: new Date().toISOString(), payload });
    this.events.set(accountId, rows);
  }
}

export function getRequiredTierForFeature(feature: string): PlanTier | undefined {
  if (feature === "ai_itinerary_generation") return PlanTier.PRO;
  if (feature === "business_reply_to_reviews") return PlanTier.PLUS;
  return undefined;
}

export function inactiveSubscriptionReason(status: SubscriptionStatus): ReasonCode | null {
  if (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING) return null;
  return ReasonCode.SUBSCRIPTION_INACTIVE;
}
