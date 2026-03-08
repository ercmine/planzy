import { ENTITLEMENT_DEFINITIONS } from "./entitlementDefinitions.js";
import { getPlan } from "./catalog.js";
import { SubscriptionStatus, type EntitlementKey, type EntitlementOverride, type EntitlementValue, type ResolvedEntitlements, type Subscription, type Account } from "./types.js";

const FLAG_OVERRIDES: Record<string, Partial<Record<EntitlementKey, EntitlementValue>>> = {
  "beta-ai-itinerary": { ai_itinerary_generation: true },
  "beta-creator-analytics": { creator_analytics: true }
};

export function resolveEntitlements(input: {
  account: Account;
  subscription: Subscription;
  overrides?: EntitlementOverride[];
}): ResolvedEntitlements {
  const plan = getPlan(input.subscription.planId);
  if (!plan) {
    throw new Error(`Unknown plan: ${input.subscription.planId}`);
  }

  const now = Date.now();
  const values = Object.fromEntries(ENTITLEMENT_DEFINITIONS.map((d) => [d.key, d.defaultValue])) as Record<EntitlementKey, EntitlementValue>;
  const sources = Object.fromEntries(ENTITLEMENT_DEFINITIONS.map((d) => [d.key, "default"])) as ResolvedEntitlements["sources"];

  for (const [key, value] of Object.entries(plan.entitlements) as Array<[EntitlementKey, EntitlementValue]>) {
    values[key] = value;
    sources[key] = "plan";
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
    if (override.expiresAt && new Date(override.expiresAt).getTime() < now) continue;
    values[override.key] = override.value;
    sources[override.key] = "override";
  }

  if (input.subscription.status === SubscriptionStatus.EXPIRED && input.subscription.graceEndsAt && new Date(input.subscription.graceEndsAt).getTime() > now) {
    values.priority_support = false;
    sources.priority_support = "grace";
  }

  return {
    accountId: input.account.id,
    accountType: input.account.accountType,
    planId: input.subscription.planId,
    values,
    sources,
    evaluatedAt: new Date().toISOString()
  };
}
