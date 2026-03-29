import { type EntitlementOverride, type ResolvedEntitlements, type Subscription, type Account } from "./types.js";
export declare function resolveEntitlements(input: {
    account: Account;
    subscription: Subscription;
    overrides?: EntitlementOverride[];
    now?: Date;
}): ResolvedEntitlements;
