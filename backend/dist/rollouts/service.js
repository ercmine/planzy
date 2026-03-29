import { createHash } from "node:crypto";
import { ProfileType, UserRole } from "../accounts/types.js";
import { ALL_ROLLOUT_FEATURE_KEYS, ROLLOUT_FEATURE_KEYS } from "./featureKeys.js";
import { MemoryRolloutStore } from "./store.js";
const nowIso = () => new Date().toISOString();
function normalizeEnv(value) {
    if (!value)
        return "development";
    if (value === "prod" || value === "production")
        return "production";
    if (value === "stage" || value === "staging")
        return "staging";
    if (value === "preview")
        return "preview";
    if (value === "local")
        return "local";
    return "development";
}
function defaultDefinitions() {
    const at = nowIso();
    return ALL_ROLLOUT_FEATURE_KEYS.map((featureKey) => ({
        featureKey,
        status: "off",
        environments: ["local", "development", "staging"],
        updatedAt: at,
        updatedBy: "seed"
    }));
}
export class RolloutAccessError extends Error {
    decision;
    constructor(decision) {
        super(`Feature ${decision.featureKey} not rolled out: ${decision.reason}`);
        this.decision = decision;
    }
}
export class RolloutService {
    store;
    accounts;
    subscriptions;
    environment;
    constructor(store = new MemoryRolloutStore(defaultDefinitions()), accounts, subscriptions, environment = normalizeEnv(process.env.NODE_ENV)) {
        this.store = store;
        this.accounts = accounts;
        this.subscriptions = subscriptions;
        this.environment = environment;
    }
    resolveContext(input) {
        const identity = input.userId && this.accounts ? this.accounts.getIdentitySummary(input.userId) : undefined;
        const roles = identity?.roles ?? [];
        const inferredAccountType = input.accountType ?? this.deriveAccountType(identity?.user, input.activeProfileType);
        const planFamily = input.targetId && this.subscriptions
            ? this.subscriptions.getSubscription(input.targetId)?.planId
            : undefined;
        const inferredCohorts = new Set([...(input.cohorts ?? [])]);
        if (roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MODERATOR))
            inferredCohorts.add("internal");
        return {
            environment: this.environment,
            featureKey: input.featureKey,
            userId: input.userId,
            targetType: input.targetType,
            targetId: input.targetId,
            market: input.market?.toLowerCase(),
            cohorts: [...inferredCohorts],
            accountType: inferredAccountType,
            planFamily,
            roles,
            activeProfileType: input.activeProfileType
        };
    }
    evaluate(featureKey, context) {
        if (!ALL_ROLLOUT_FEATURE_KEYS.includes(featureKey)) {
            return { featureKey, enabled: false, reason: "unknown_feature", environment: context.environment };
        }
        const rule = this.store.get(featureKey);
        if (!rule)
            return { featureKey, enabled: false, reason: "global_off", environment: context.environment };
        if (rule.internalOverride && ((rule.internalOverride.allowRoles?.some((role) => context.roles.includes(role)))
            || (rule.internalOverride.allowCohorts?.some((cohort) => context.cohorts.includes(cohort))))) {
            return { featureKey, enabled: true, reason: "enabled", environment: context.environment };
        }
        if (rule.status === "off")
            return { featureKey, enabled: false, reason: "global_off", environment: context.environment };
        if (rule.environments?.length && !rule.environments.includes(context.environment)) {
            return { featureKey, enabled: false, reason: "environment_not_allowed", environment: context.environment };
        }
        if (rule.denyUserIds?.includes(context.userId ?? ""))
            return { featureKey, enabled: false, reason: "denied_user", environment: context.environment };
        if (rule.denyCohorts?.some((c) => context.cohorts.includes(c)))
            return { featureKey, enabled: false, reason: "denied_cohort", environment: context.environment };
        if (rule.denyMarkets?.includes(context.market ?? ""))
            return { featureKey, enabled: false, reason: "denied_market", environment: context.environment };
        if (rule.allowUserIds?.length && !rule.allowUserIds.includes(context.userId ?? "")) {
            return { featureKey, enabled: false, reason: "user_not_allowlisted", environment: context.environment };
        }
        if (rule.allowCohorts?.length && !rule.allowCohorts.some((c) => context.cohorts.includes(c))) {
            return { featureKey, enabled: false, reason: "cohort_not_allowed", environment: context.environment };
        }
        if (rule.allowMarkets?.length && !rule.allowMarkets.includes(context.market ?? "")) {
            return { featureKey, enabled: false, reason: "market_not_allowed", environment: context.environment };
        }
        if (rule.allowAccountTypes?.length && !rule.allowAccountTypes.includes(context.accountType ?? "user")) {
            return { featureKey, enabled: false, reason: "account_type_not_allowed", environment: context.environment };
        }
        if (rule.allowPlanFamilies?.length && !rule.allowPlanFamilies.includes(context.planFamily ?? "")) {
            return { featureKey, enabled: false, reason: "plan_family_not_allowed", environment: context.environment };
        }
        if (rule.allowRoles?.length && !rule.allowRoles.some((r) => context.roles.includes(r))) {
            return { featureKey, enabled: false, reason: "role_not_allowed", environment: context.environment };
        }
        if (rule.percentage !== undefined && rule.percentage < 100) {
            const bucket = this.percentageBucket(featureKey, context.userId ?? context.targetId ?? "anonymous", rule.salt ?? "default");
            const included = bucket < Math.max(0, rule.percentage);
            if (!included) {
                return { featureKey, enabled: false, reason: "not_in_percentage_sample", environment: context.environment, percentageIncluded: false };
            }
            return { featureKey, enabled: true, reason: "enabled", environment: context.environment, percentageIncluded: true };
        }
        return { featureKey, enabled: true, reason: "enabled", environment: context.environment };
    }
    assertFeatureRolledOut(featureKey, context) {
        const decision = this.evaluate(featureKey, context);
        if (!decision.enabled)
            throw new RolloutAccessError(decision);
    }
    getRolloutSummaryForPrincipal(context) {
        return Object.fromEntries(ALL_ROLLOUT_FEATURE_KEYS.map((key) => [key, this.evaluate(key, context)]));
    }
    listDefinitions() { return this.store.list(); }
    updateDefinition(definition) {
        const next = { ...definition, updatedAt: definition.updatedAt ?? nowIso() };
        this.store.save(next);
        return next;
    }
    listAudit(limit) { return this.store.listAudit(limit); }
    percentageBucket(featureKey, id, salt) {
        const digest = createHash("sha256").update(`${featureKey}:${salt}:${id}`).digest("hex").slice(0, 8);
        return Number.parseInt(digest, 16) % 100;
    }
    deriveAccountType(user, activeProfileType) {
        if (activeProfileType === ProfileType.BUSINESS)
            return "business";
        if (activeProfileType === ProfileType.CREATOR)
            return "creator";
        if (user?.activeProfileType === ProfileType.BUSINESS)
            return "business";
        if (user?.activeProfileType === ProfileType.CREATOR)
            return "creator";
        return "user";
    }
}
export const ROLLOUT_ERROR_CODE = "FEATURE_NOT_ROLLED_OUT";
export function rolloutErrorPayload(error) {
    return {
        error: ROLLOUT_ERROR_CODE,
        featureKey: error.decision.featureKey,
        denialReason: error.decision.reason,
        rolloutCategory: "rollout",
        message: "This feature is not available for the current rollout context",
        decision: error.decision
    };
}
export function rolloutSeedForLocalDev() {
    const now = nowIso();
    return [
        {
            featureKey: ROLLOUT_FEATURE_KEYS.AI_ITINERARY,
            status: "conditional",
            environments: ["local", "development", "staging"],
            allowCohorts: ["internal", "beta"],
            percentage: 100,
            updatedAt: now,
            updatedBy: "seed"
        }
    ];
}
