import type { ProfileType, UserRole } from "../accounts/types.js";
import type { SubscriptionTargetType } from "../subscriptions/types.js";

export type RolloutEnvironment = "local" | "development" | "staging" | "production" | "preview";
export type AccountTypeRollout = "user" | "creator" | "business";

export interface RolloutContext {
  environment: RolloutEnvironment;
  featureKey: string;
  userId?: string;
  targetType?: SubscriptionTargetType;
  targetId?: string;
  market?: string;
  cohorts: string[];
  accountType?: AccountTypeRollout;
  planFamily?: string;
  roles: UserRole[];
  activeProfileType?: ProfileType;
}

export interface RolloutDefinition {
  featureKey: string;
  status: "off" | "on" | "conditional";
  environments?: RolloutEnvironment[];
  allowCohorts?: string[];
  denyCohorts?: string[];
  allowMarkets?: string[];
  denyMarkets?: string[];
  allowAccountTypes?: AccountTypeRollout[];
  allowPlanFamilies?: string[];
  allowRoles?: UserRole[];
  allowUserIds?: string[];
  denyUserIds?: string[];
  percentage?: number;
  salt?: string;
  internalOverride?: { allowRoles?: UserRole[]; allowCohorts?: string[] };
  updatedAt: string;
  updatedBy: string;
}

export type RolloutReasonCode =
  | "enabled"
  | "unknown_feature"
  | "global_off"
  | "environment_not_allowed"
  | "denied_user"
  | "denied_cohort"
  | "denied_market"
  | "user_not_allowlisted"
  | "cohort_not_allowed"
  | "market_not_allowed"
  | "account_type_not_allowed"
  | "plan_family_not_allowed"
  | "role_not_allowed"
  | "not_in_percentage_sample"
  | "evaluation_error";

export interface RolloutDecision {
  featureKey: string;
  enabled: boolean;
  reason: RolloutReasonCode;
  environment: RolloutEnvironment;
  percentageIncluded?: boolean;
  matchedCohorts?: string[];
  matchedMarket?: string;
}

export interface RolloutAuditRecord {
  id: string;
  featureKey: string;
  changedBy: string;
  changedAt: string;
  previous?: RolloutDefinition;
  next: RolloutDefinition;
}
