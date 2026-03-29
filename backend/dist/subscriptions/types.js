export var SubscriptionTargetType;
(function (SubscriptionTargetType) {
    SubscriptionTargetType["USER"] = "USER";
    SubscriptionTargetType["CREATOR"] = "CREATOR";
    SubscriptionTargetType["BUSINESS"] = "BUSINESS";
    SubscriptionTargetType["MULTI"] = "MULTI";
})(SubscriptionTargetType || (SubscriptionTargetType = {}));
// Backward-compatible alias used by account-service integration.
export const AccountType = SubscriptionTargetType;
export var PlanTier;
(function (PlanTier) {
    PlanTier["FREE"] = "FREE";
    PlanTier["PLUS"] = "PLUS";
    PlanTier["PRO"] = "PRO";
    PlanTier["ELITE"] = "ELITE";
})(PlanTier || (PlanTier = {}));
export var PlanInterval;
(function (PlanInterval) {
    PlanInterval["NONE"] = "NONE";
    PlanInterval["MONTHLY"] = "MONTHLY";
    PlanInterval["YEARLY"] = "YEARLY";
    PlanInterval["LIFETIME"] = "LIFETIME";
})(PlanInterval || (PlanInterval = {}));
// Backward-compatible alias used by existing tests/scaffolding.
export const BillingInterval = PlanInterval;
export var BillingProviderName;
(function (BillingProviderName) {
    BillingProviderName["INTERNAL"] = "INTERNAL";
    BillingProviderName["STRIPE"] = "STRIPE";
    BillingProviderName["APP_STORE"] = "APP_STORE";
    BillingProviderName["PLAY_STORE"] = "PLAY_STORE";
    BillingProviderName["UNKNOWN"] = "UNKNOWN";
})(BillingProviderName || (BillingProviderName = {}));
export var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["FREE"] = "FREE";
    SubscriptionStatus["TRIALING"] = "TRIALING";
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["GRACE_PERIOD"] = "GRACE_PERIOD";
    SubscriptionStatus["CANCELED"] = "CANCELED";
    SubscriptionStatus["EXPIRED"] = "EXPIRED";
    SubscriptionStatus["INCOMPLETE"] = "INCOMPLETE";
})(SubscriptionStatus || (SubscriptionStatus = {}));
export var RenewalStatus;
(function (RenewalStatus) {
    RenewalStatus["AUTO_RENEW_ON"] = "AUTO_RENEW_ON";
    RenewalStatus["AUTO_RENEW_OFF"] = "AUTO_RENEW_OFF";
    RenewalStatus["NON_RENEWING"] = "NON_RENEWING";
    RenewalStatus["UNKNOWN"] = "UNKNOWN";
})(RenewalStatus || (RenewalStatus = {}));
export var CancellationMode;
(function (CancellationMode) {
    CancellationMode["NONE"] = "NONE";
    CancellationMode["CANCEL_AT_PERIOD_END"] = "CANCEL_AT_PERIOD_END";
    CancellationMode["IMMEDIATE"] = "IMMEDIATE";
    CancellationMode["PROVIDER_FORCED"] = "PROVIDER_FORCED";
})(CancellationMode || (CancellationMode = {}));
export var EntitlementValueType;
(function (EntitlementValueType) {
    EntitlementValueType["BOOLEAN"] = "BOOLEAN";
    EntitlementValueType["INTEGER"] = "INTEGER";
    EntitlementValueType["STRING"] = "STRING";
})(EntitlementValueType || (EntitlementValueType = {}));
export var UsageWindow;
(function (UsageWindow) {
    UsageWindow["MONTHLY"] = "MONTHLY";
    UsageWindow["LIFETIME"] = "LIFETIME";
    UsageWindow["ACTIVE"] = "ACTIVE";
})(UsageWindow || (UsageWindow = {}));
export var ReasonCode;
(function (ReasonCode) {
    ReasonCode["ALLOWED"] = "ALLOWED";
    ReasonCode["PLAN_REQUIRED"] = "PLAN_REQUIRED";
    ReasonCode["PLAN_LIMIT_EXCEEDED"] = "PLAN_LIMIT_EXCEEDED";
    ReasonCode["ACCOUNT_TYPE_MISMATCH"] = "ACCOUNT_TYPE_MISMATCH";
    ReasonCode["SUBSCRIPTION_INACTIVE"] = "SUBSCRIPTION_INACTIVE";
    ReasonCode["NOT_AVAILABLE"] = "NOT_AVAILABLE";
    ReasonCode["NO_SUBSCRIPTION"] = "NO_SUBSCRIPTION";
    ReasonCode["WRONG_TARGET_TYPE"] = "WRONG_TARGET_TYPE";
    ReasonCode["TRIAL_EXPIRED"] = "TRIAL_EXPIRED";
    ReasonCode["SUBSCRIPTION_PAST_DUE"] = "SUBSCRIPTION_PAST_DUE";
    ReasonCode["GRACE_PERIOD_EXPIRED"] = "GRACE_PERIOD_EXPIRED";
    ReasonCode["CANCELED_EFFECTIVE"] = "CANCELED_EFFECTIVE";
    ReasonCode["FEATURE_NOT_IN_PLAN"] = "FEATURE_NOT_IN_PLAN";
    ReasonCode["USAGE_LIMIT_REACHED"] = "USAGE_LIMIT_REACHED";
})(ReasonCode || (ReasonCode = {}));
