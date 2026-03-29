import { ProfileType } from "../accounts/types.js";
import type { AccountsService } from "../accounts/service.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import { type RolloutStore } from "./store.js";
import type { AccountTypeRollout, RolloutContext, RolloutDecision, RolloutDefinition, RolloutEnvironment } from "./types.js";
export declare class RolloutAccessError extends Error {
    readonly decision: RolloutDecision;
    constructor(decision: RolloutDecision);
}
export declare class RolloutService {
    private readonly store;
    private readonly accounts?;
    private readonly subscriptions?;
    private readonly environment;
    constructor(store?: RolloutStore, accounts?: AccountsService | undefined, subscriptions?: SubscriptionService | undefined, environment?: RolloutEnvironment);
    resolveContext(input: {
        featureKey: string;
        userId?: string;
        market?: string;
        cohorts?: string[];
        accountType?: AccountTypeRollout;
        targetType?: SubscriptionTargetType;
        targetId?: string;
        activeProfileType?: ProfileType;
    }): RolloutContext;
    evaluate(featureKey: string, context: Omit<RolloutContext, "featureKey">): RolloutDecision;
    assertFeatureRolledOut(featureKey: string, context: Omit<RolloutContext, "featureKey">): void;
    getRolloutSummaryForPrincipal(context: Omit<RolloutContext, "featureKey">): Record<string, RolloutDecision>;
    listDefinitions(): RolloutDefinition[];
    updateDefinition(definition: Omit<RolloutDefinition, "updatedAt"> & {
        updatedAt?: string;
    }): RolloutDefinition;
    listAudit(limit?: number): import("./types.js").RolloutAuditRecord[];
    private percentageBucket;
    private deriveAccountType;
}
export declare const ROLLOUT_ERROR_CODE = "FEATURE_NOT_ROLLED_OUT";
export declare function rolloutErrorPayload(error: RolloutAccessError): {
    error: string;
    featureKey: string;
    denialReason: import("./types.js").RolloutReasonCode;
    rolloutCategory: string;
    message: string;
    decision: RolloutDecision;
};
export declare function rolloutSeedForLocalDev(): RolloutDefinition[];
