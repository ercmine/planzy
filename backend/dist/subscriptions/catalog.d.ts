import { SubscriptionTargetType, type PlanDefinition } from "./types.js";
export declare const PLAN_CATALOG: PlanDefinition[];
export declare function getPlan(planId: string): PlanDefinition | undefined;
export declare function getAvailablePlans(targetType: SubscriptionTargetType): PlanDefinition[];
export declare function getFreePlan(targetType: SubscriptionTargetType): PlanDefinition;
