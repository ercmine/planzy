import { randomUUID } from "node:crypto";

import { getAvailablePlans, getFreePlan, getPlan } from "./catalog.js";
import type { BillingProvider } from "./billing/provider.js";
import { resolveEntitlements } from "./resolver.js";
import { accessEndsAt, assertTransitionAllowed, isScheduledForCancellation, renewalBehaviorLabel, resolveAccessWindow } from "./state.js";
import { currentPeriodKey, type UsageStore } from "./usage.js";
import {
  BillingProviderName,
  CancellationMode,
  PlanTier,
  ReasonCode,
  RenewalStatus,
  SubscriptionStatus,
  UsageWindow,
  type Account,
  type AccountType,
  type EntitlementOverride,
  type PlanChangePreview,
  type Subscription,
  type SubscriptionEvent,
  type SubscriptionPlanDto,
  type SubscriptionSummary,
  type SubscriptionTargetRef,
  type TrialEligibilityResult,
  type UsageMetric
} from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export class SubscriptionService {
  private readonly accounts = new Map<string, Account>();
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly overrides = new Map<string, EntitlementOverride[]>();
  private readonly events = new Map<string, SubscriptionEvent[]>();
  private readonly usedTrialByTargetPlan = new Set<string>();

  constructor(private readonly usageStore: UsageStore, private readonly billingProvider: BillingProvider) {}

  ensureAccount(accountId: string, accountType: AccountType): Account {
    const current = this.accounts.get(accountId);
    if (current) return current;

    const account: Account = { id: accountId, accountType, featureFlags: [], billingStatus: SubscriptionStatus.FREE };
    this.accounts.set(accountId, account);

    const freePlan = getFreePlan(accountType);
    const now = new Date().toISOString();
    const subscription: Subscription = {
      id: `sub_${randomUUID()}`,
      targetType: accountType,
      targetId: accountId,
      planId: freePlan.id,
      provider: BillingProviderName.INTERNAL,
      status: SubscriptionStatus.FREE,
      renewalStatus: RenewalStatus.NON_RENEWING,
      cancellationMode: CancellationMode.NONE,
      startedAt: now,
      autoRenews: false,
      createdAt: now,
      updatedAt: now,
      metadata: { fallback: true }
    };
    this.subscriptions.set(accountId, subscription);
    this.appendEvent(subscription, "created", "system", { planId: freePlan.id });
    return account;
  }

  getSubscription(accountId: string): Subscription {
    const sub = this.subscriptions.get(accountId);
    if (!sub) {
      const account = this.accounts.get(accountId);
      if (!account) throw new Error(`Subscription not found: ${accountId}`);
      this.ensureAccount(accountId, account.accountType);
      return this.subscriptions.get(accountId)!;
    }
    return this.reconcileTimeDrivenState(sub);
  }

  getCurrentEntitlements(accountId: string) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return resolveEntitlements({ account, subscription: this.getSubscription(accountId), overrides: this.overrides.get(accountId) });
  }

  getCurrentSubscriptionSummary(accountId: string): SubscriptionSummary {
    const sub = this.getSubscription(accountId);
    const plan = getPlan(sub.planId);
    if (!plan) throw new Error(`Plan not found: ${sub.planId}`);
    const window = resolveAccessWindow(sub);

    return {
      targetType: sub.targetType,
      targetId: sub.targetId,
      planCode: plan.code,
      status: sub.status,
      renewalStatus: renewalBehaviorLabel(sub),
      isTrial: sub.status === SubscriptionStatus.TRIALING,
      willCancelAtPeriodEnd: isScheduledForCancellation(sub),
      hasAccessNow: window.hasAccessNow,
      accessEndsAt: accessEndsAt(sub),
      currentPeriodEndAt: sub.currentPeriodEndAt,
      graceEndAt: sub.graceEndAt,
      trialEndAt: sub.trialEndAt,
      nextRenewalAt: sub.renewsAt,
      priceAmount: plan.priceAmount,
      priceCurrency: plan.priceCurrency,
      interval: plan.interval,
      upgradeEligible: plan.upgradePlanIds.length > 0,
      downgradeEligible: plan.downgradePlanIds.length > 0
    };
  }

  getBillingState(accountId: string) {
    const sub = this.getSubscription(accountId);
    const window = resolveAccessWindow(sub);
    return {
      target: { type: sub.targetType, id: sub.targetId },
      status: sub.status,
      renewalStatus: sub.renewalStatus,
      cancellationMode: sub.cancellationMode,
      window
    };
  }

  getAvailablePlansForAccount(accountId: string): SubscriptionPlanDto[] {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);
    return getAvailablePlans(account.accountType).map((plan) => ({
      id: plan.id,
      code: plan.code,
      targetType: plan.targetType,
      tier: plan.tier,
      displayName: plan.displayName,
      priceAmount: plan.priceAmount,
      priceCurrency: plan.priceCurrency,
      interval: plan.interval,
      billable: plan.billable,
      trialAvailable: Boolean(plan.trialDays),
      includedEntitlements: plan.entitlements
    }));
  }

  canStartTrial(target: SubscriptionTargetRef, planId: string): TrialEligibilityResult {
    const plan = getPlan(planId);
    const reasons: TrialEligibilityResult["reasonCodes"] = [];
    if (!plan?.trialDays) reasons.push("wrong_plan_type");
    if (!plan || plan.targetType !== target.type) reasons.push("target_ineligible");

    const trialKey = `${target.type}:${target.id}:${planId}`;
    if (this.usedTrialByTargetPlan.has(trialKey)) reasons.push("already_used_trial");

    const existing = this.subscriptions.get(target.id);
    if (existing && [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE, SubscriptionStatus.GRACE_PERIOD].includes(existing.status)) {
      reasons.push("active_subscription_exists");
    }

    return { eligible: reasons.length === 0, reasonCodes: reasons };
  }

  startTrial(accountId: string, planId: string): Subscription {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error("Account not found");
    const plan = getPlan(planId);
    if (!plan || !plan.trialDays) throw new Error("PLAN_NOT_TRIALABLE");

    const eligibility = this.canStartTrial({ type: account.accountType, id: accountId }, planId);
    if (!eligibility.eligible) throw new Error(`TRIAL_INELIGIBLE:${eligibility.reasonCodes.join(",")}`);

    const now = new Date();
    const sub = this.getSubscription(accountId);
    assertTransitionAllowed(sub.status, SubscriptionStatus.TRIALING);

    const next: Subscription = {
      ...sub,
      planId,
      status: SubscriptionStatus.TRIALING,
      renewalStatus: RenewalStatus.AUTO_RENEW_ON,
      cancellationMode: CancellationMode.NONE,
      trialStartAt: now.toISOString(),
      trialEndAt: new Date(now.getTime() + plan.trialDays * DAY_MS).toISOString(),
      currentPeriodStartAt: now.toISOString(),
      currentPeriodEndAt: new Date(now.getTime() + plan.trialDays * DAY_MS).toISOString(),
      autoRenews: true,
      updatedAt: now.toISOString()
    };
    this.subscriptions.set(accountId, next);
    this.usedTrialByTargetPlan.add(`${next.targetType}:${next.targetId}:${planId}`);
    this.appendEvent(next, "trial_started", "user", { planId, trialEndAt: next.trialEndAt }, sub.status, next.status);
    return next;
  }

  async previewPlanChange(accountId: string, targetPlanId: string): Promise<PlanChangePreview> {
    const account = this.accounts.get(accountId);
    const current = this.getSubscription(accountId);
    const target = getPlan(targetPlanId);
    if (!account || !target) throw new Error("invalid account or plan");
    if (target.targetType !== account.accountType) {
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
    const targetPlan = getPlan(targetPlanId);
    if (!targetPlan) throw new Error("TARGET_PLAN_NOT_FOUND");

    const response = await this.billingProvider.requestPlanChange({ accountId, current, targetPlanId });
    const now = new Date();
    const nextStatus = targetPlan.billable ? SubscriptionStatus.ACTIVE : SubscriptionStatus.FREE;
    const next: Subscription = {
      ...current,
      planId: targetPlanId,
      status: nextStatus,
      renewalStatus: targetPlan.billable ? RenewalStatus.AUTO_RENEW_ON : RenewalStatus.NON_RENEWING,
      cancellationMode: CancellationMode.NONE,
      currentPeriodStartAt: now.toISOString(),
      currentPeriodEndAt: targetPlan.billable ? new Date(now.getTime() + 30 * DAY_MS).toISOString() : undefined,
      renewsAt: targetPlan.billable ? new Date(now.getTime() + 30 * DAY_MS).toISOString() : undefined,
      autoRenews: targetPlan.billable,
      updatedAt: now.toISOString()
    };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "plan_changed", "user", { fromPlanId: current.planId, toPlanId: targetPlanId }, current.status, next.status);
    return { ok: true, providerRequestId: response.providerRequestId };
  }

  async markSubscriptionActive(accountId: string): Promise<void> {
    const sub = this.getSubscription(accountId);
    const now = new Date().toISOString();
    const next: Subscription = {
      ...sub,
      status: SubscriptionStatus.ACTIVE,
      renewalStatus: RenewalStatus.AUTO_RENEW_ON,
      cancellationMode: CancellationMode.NONE,
      pastDueAt: undefined,
      graceStartAt: undefined,
      graceEndAt: undefined,
      lastPaymentAt: now,
      autoRenews: true,
      updatedAt: now
    };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "activated", "system", {}, sub.status, next.status);
  }

  markPastDue(accountId: string): void {
    const sub = this.getSubscription(accountId);
    assertTransitionAllowed(sub.status, SubscriptionStatus.PAST_DUE);
    const now = new Date().toISOString();
    const next: Subscription = { ...sub, status: SubscriptionStatus.PAST_DUE, pastDueAt: now, renewalStatus: RenewalStatus.AUTO_RENEW_ON, updatedAt: now };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "payment_failed", "provider", {}, sub.status, next.status);
  }

  enterGracePeriod(accountId: string, graceDays = 3): void {
    const sub = this.getSubscription(accountId);
    assertTransitionAllowed(sub.status, SubscriptionStatus.GRACE_PERIOD);
    const now = new Date();
    const next: Subscription = {
      ...sub,
      status: SubscriptionStatus.GRACE_PERIOD,
      graceStartAt: now.toISOString(),
      graceEndAt: new Date(now.getTime() + graceDays * DAY_MS).toISOString(),
      updatedAt: now.toISOString()
    };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "grace_started", "system", { graceEndAt: next.graceEndAt }, sub.status, next.status);
  }

  async cancelSubscription(accountId: string): Promise<void> {
    const sub = this.getSubscription(accountId);
    await this.billingProvider.cancelSubscription({ accountId, subscription: sub });
    const now = new Date().toISOString();
    const next: Subscription = {
      ...sub,
      status: SubscriptionStatus.CANCELED,
      cancellationMode: CancellationMode.CANCEL_AT_PERIOD_END,
      canceledAt: now,
      cancelEffectiveAt: sub.currentPeriodEndAt ?? now,
      renewalStatus: RenewalStatus.AUTO_RENEW_OFF,
      autoRenews: false,
      updatedAt: now
    };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "canceled", "user", { mode: CancellationMode.CANCEL_AT_PERIOD_END }, sub.status, next.status);
  }

  async cancelImmediately(accountId: string): Promise<void> {
    const sub = this.getSubscription(accountId);
    await this.billingProvider.cancelSubscription({ accountId, subscription: sub });
    const now = new Date().toISOString();
    const next: Subscription = {
      ...sub,
      status: SubscriptionStatus.EXPIRED,
      cancellationMode: CancellationMode.IMMEDIATE,
      canceledAt: now,
      cancelEffectiveAt: now,
      expiresAt: now,
      renewalStatus: RenewalStatus.NON_RENEWING,
      autoRenews: false,
      updatedAt: now
    };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "canceled", "user", { mode: CancellationMode.IMMEDIATE }, sub.status, SubscriptionStatus.CANCELED);
    this.appendEvent(next, "expired", "system", {}, SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED);
  }

  async resumeSubscription(accountId: string): Promise<void> {
    const sub = this.getSubscription(accountId);
    await this.billingProvider.resumeSubscription({ accountId, subscription: sub });
    const next: Subscription = {
      ...sub,
      status: SubscriptionStatus.ACTIVE,
      cancellationMode: CancellationMode.NONE,
      canceledAt: undefined,
      cancelEffectiveAt: undefined,
      renewalStatus: RenewalStatus.AUTO_RENEW_ON,
      autoRenews: true,
      updatedAt: new Date().toISOString()
    };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "reactivated", "user", {}, sub.status, next.status);
  }

  expireSubscription(accountId: string): void {
    const sub = this.getSubscription(accountId);
    const now = new Date().toISOString();
    const next: Subscription = {
      ...sub,
      status: SubscriptionStatus.EXPIRED,
      expiresAt: now,
      renewalStatus: RenewalStatus.NON_RENEWING,
      autoRenews: false,
      updatedAt: now
    };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "expired", "system", {}, sub.status, next.status);
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
    const sub = this.getSubscription(accountId);
    this.appendEvent(sub, "entitlement_override", "admin", override as unknown as Record<string, unknown>);
  }

  grantTrial(accountId: string, trialDays: number): void {
    const sub = this.getSubscription(accountId);
    const trialEndsAt = new Date(Date.now() + trialDays * DAY_MS).toISOString();
    const next: Subscription = { ...sub, status: SubscriptionStatus.TRIALING, trialStartAt: new Date().toISOString(), trialEndAt: trialEndsAt, updatedAt: new Date().toISOString() };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "trial_started", "admin", { trialEndsAt }, sub.status, next.status);
  }

  compPlan(accountId: string, planId: string): void {
    const sub = this.getSubscription(accountId);
    const next: Subscription = { ...sub, planId, comped: true, status: SubscriptionStatus.ACTIVE, updatedAt: new Date().toISOString() };
    this.subscriptions.set(accountId, next);
    this.appendEvent(next, "plan_changed", "admin", { planId, comped: true }, sub.status, next.status);
  }

  getEventHistory(accountId: string): SubscriptionEvent[] {
    return this.events.get(accountId) ?? [];
  }

  private reconcileTimeDrivenState(sub: Subscription): Subscription {
    const window = resolveAccessWindow(sub);
    if (!window.shouldDowngradeNow) return sub;
    if (sub.status === SubscriptionStatus.TRIALING || sub.status === SubscriptionStatus.CANCELED || sub.status === SubscriptionStatus.GRACE_PERIOD) {
      const next: Subscription = { ...sub, status: SubscriptionStatus.EXPIRED, expiresAt: new Date().toISOString(), renewalStatus: RenewalStatus.NON_RENEWING, autoRenews: false, updatedAt: new Date().toISOString() };
      this.subscriptions.set(sub.targetId, next);
      this.appendEvent(next, "expired", "system", { reason: window.reason }, sub.status, next.status);
      return next;
    }
    return sub;
  }

  private appendEvent(subscription: Subscription, type: SubscriptionEvent["type"], actor: SubscriptionEvent["actor"], payload: Record<string, unknown>, previousState?: SubscriptionStatus, nextState?: SubscriptionStatus): void {
    const rows = this.events.get(subscription.targetId) ?? [];
    rows.unshift({ id: randomUUID(), subscriptionId: subscription.id, targetId: subscription.targetId, targetType: subscription.targetType, type, previousState, nextState, occurredAt: new Date().toISOString(), actor, payload });
    this.events.set(subscription.targetId, rows);
  }
}

export function getRequiredTierForFeature(feature: string): PlanTier | undefined {
  if (feature === "ai_itinerary_generation") return PlanTier.PRO;
  if (feature === "business_reply_to_reviews") return PlanTier.PLUS;
  return undefined;
}

export function inactiveSubscriptionReason(status: SubscriptionStatus): ReasonCode | null {
  if ([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.CANCELED, SubscriptionStatus.PAST_DUE, SubscriptionStatus.GRACE_PERIOD].includes(status)) return null;
  if (status === SubscriptionStatus.EXPIRED) return ReasonCode.GRACE_PERIOD_EXPIRED;
  return ReasonCode.SUBSCRIPTION_INACTIVE;
}
