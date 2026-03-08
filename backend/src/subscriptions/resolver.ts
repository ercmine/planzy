import { ENTITLEMENT_DEFINITIONS } from "./entitlementDefinitions.js";
import { getFreePlan, getPlan } from "./catalog.js";
import { resolveAccessWindow } from "./state.js";
import { SubscriptionStatus, type EntitlementKey, type EntitlementOverride, type EntitlementValue, type ResolvedEntitlements, type Subscription, type Account } from "./types.js";

const FLAG_OVERRIDES: Record<string, Partial<Record<EntitlementKey, EntitlementValue>>> = {
  "beta-ai-itinerary": { ai_itinerary_generation: true },
  "beta-creator-analytics": { creator_analytics: true }
};

export function resolveEntitlements(input: {
  account: Account;
  subscription: Subscription;
  overrides?: EntitlementOverride[];
  now?: Date;
}): ResolvedEntitlements {
  const now = input.now ?? new Date();
  const window = resolveAccessWindow(input.subscription, now);
  const status = window.shouldDowngradeNow ? SubscriptionStatus.EXPIRED : input.subscription.status;

  const paidPlan = getPlan(input.subscription.planId);
  if (!paidPlan) {
    throw new Error(`Unknown plan: ${input.subscription.planId}`);
  }

  const effectivePlan = status === SubscriptionStatus.EXPIRED || status === SubscriptionStatus.FREE
    ? getFreePlan(input.subscription.targetType)
    : paidPlan;

  const values = Object.fromEntries(ENTITLEMENT_DEFINITIONS.map((d) => [d.key, d.defaultValue])) as Record<EntitlementKey, EntitlementValue>;
  const sources = Object.fromEntries(ENTITLEMENT_DEFINITIONS.map((d) => [d.key, d.defaultValue])) as unknown as ResolvedEntitlements["sources"];

  for (const key of Object.keys(sources) as EntitlementKey[]) {
    sources[key] = "default";
  }

  for (const [key, value] of Object.entries(effectivePlan.entitlements) as Array<[EntitlementKey, EntitlementValue]>) {
    values[key] = value;
    sources[key] = effectivePlan.id === paidPlan.id ? "plan" : "fallback_free";
  }

  for (const flag of input.account.featureFlags) {
    const map = FLAG_OVERRIDES[flag];
    if (!map) continue;
    for (const [key, value] of Object.entries(map) as Array<[EntitlementKey, EntitlementValue]>) {
      values[key] = value;
      sources[key] = "flag";
    }
  }

  for (const override of input.overrides ?? []) {
    if (override.expiresAt && new Date(override.expiresAt).getTime() < now.getTime()) continue;
    values[override.key] = override.value;
    sources[override.key] = "override";
  }

  if (input.subscription.status === SubscriptionStatus.GRACE_PERIOD && window.inGrace) {
    values.priority_support = false;
    sources.priority_support = "grace";
  }

  return {
    targetType: input.subscription.targetType,
    targetId: input.subscription.targetId,
    accountId: input.account.id,
    accountType: input.account.accountType,
    planId: effectivePlan.id,
    status,
    hasAccessNow: window.hasAccessNow,
    values,
    sources,
    evaluatedAt: now.toISOString()
  };
}
