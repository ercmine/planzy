import { RenewalStatus, SubscriptionStatus, type AccessWindowResolution, type Subscription } from "./types.js";
export declare function isScheduledForCancellation(subscription: Subscription): boolean;
export declare function accessEndsAt(subscription: Subscription): string | undefined;
export declare function resolveAccessWindow(subscription: Subscription, now?: Date): AccessWindowResolution;
export declare function renewalBehaviorLabel(subscription: Subscription): RenewalStatus;
export declare function assertTransitionAllowed(previous: SubscriptionStatus, next: SubscriptionStatus): void;
