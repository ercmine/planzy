import { ENTITLEMENT_DEFINITIONS } from "./entitlementDefinitions.js";
import { getFreePlan, getPlan } from "./catalog.js";
import { resolveAccessWindow } from "./state.js";
import { SubscriptionStatus } from "./types.js";
const FLAG_OVERRIDES = {
    "beta-ai-itinerary": { ai_itinerary_generation: true },
    "beta-creator-analytics": { creator_analytics: true }
};
export function resolveEntitlements(input) {
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
    const values = Object.fromEntries(ENTITLEMENT_DEFINITIONS.map((d) => [d.key, d.defaultValue]));
    const sources = Object.fromEntries(ENTITLEMENT_DEFINITIONS.map((d) => [d.key, d.defaultValue]));
    for (const key of Object.keys(sources)) {
        sources[key] = "default";
    }
    for (const [key, value] of Object.entries(effectivePlan.entitlements)) {
        values[key] = value;
        sources[key] = effectivePlan.id === paidPlan.id ? "plan" : "fallback_free";
    }
    for (const flag of input.account.featureFlags) {
        const map = FLAG_OVERRIDES[flag];
        if (!map)
            continue;
        for (const [key, value] of Object.entries(map)) {
            values[key] = value;
            sources[key] = "flag";
        }
    }
    for (const override of input.overrides ?? []) {
        if (override.expiresAt && new Date(override.expiresAt).getTime() < now.getTime())
            continue;
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
