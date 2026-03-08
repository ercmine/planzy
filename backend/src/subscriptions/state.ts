import { CancellationMode, ReasonCode, RenewalStatus, SubscriptionStatus, type AccessWindowResolution, type Subscription } from "./types.js";

const ACTIVE_STATES = new Set<SubscriptionStatus>([SubscriptionStatus.FREE, SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.CANCELED, SubscriptionStatus.PAST_DUE, SubscriptionStatus.GRACE_PERIOD]);

export function isScheduledForCancellation(subscription: Subscription): boolean {
  return subscription.cancellationMode === CancellationMode.CANCEL_AT_PERIOD_END && Boolean(subscription.cancelEffectiveAt ?? subscription.currentPeriodEndAt);
}

export function accessEndsAt(subscription: Subscription): string | undefined {
  if (subscription.status === SubscriptionStatus.CANCELED) return subscription.cancelEffectiveAt ?? subscription.currentPeriodEndAt;
  if (subscription.status === SubscriptionStatus.TRIALING) return subscription.trialEndAt;
  if (subscription.status === SubscriptionStatus.GRACE_PERIOD) return subscription.graceEndAt;
  if (subscription.status === SubscriptionStatus.PAST_DUE) return subscription.currentPeriodEndAt;
  if (subscription.status === SubscriptionStatus.ACTIVE) return subscription.currentPeriodEndAt;
  if (subscription.status === SubscriptionStatus.EXPIRED) return subscription.expiresAt;
  return undefined;
}

export function resolveAccessWindow(subscription: Subscription, now = new Date()): AccessWindowResolution {
  const nowMs = now.getTime();
  const parse = (iso?: string) => (iso ? new Date(iso).getTime() : undefined);

  if (!ACTIVE_STATES.has(subscription.status)) {
    return {
      hasAccessNow: false,
      softActive: false,
      inGrace: false,
      expiresAt: accessEndsAt(subscription),
      shouldDowngradeNow: subscription.status === SubscriptionStatus.EXPIRED,
      reason: subscription.status === SubscriptionStatus.EXPIRED ? ReasonCode.GRACE_PERIOD_EXPIRED : ReasonCode.SUBSCRIPTION_INACTIVE
    };
  }

  if (subscription.status === SubscriptionStatus.FREE) {
    return {
      hasAccessNow: true,
      softActive: false,
      inGrace: false,
      expiresAt: undefined,
      shouldDowngradeNow: false
    };
  }

  if (subscription.status === SubscriptionStatus.TRIALING) {
    const trialEnd = parse(subscription.trialEndAt);
    const hasAccessNow = !trialEnd || trialEnd >= nowMs;
    return {
      hasAccessNow,
      softActive: hasAccessNow,
      inGrace: false,
      expiresAt: subscription.trialEndAt,
      shouldDowngradeNow: !hasAccessNow,
      reason: hasAccessNow ? undefined : ReasonCode.TRIAL_EXPIRED
    };
  }

  if (subscription.status === SubscriptionStatus.PAST_DUE) {
    return {
      hasAccessNow: true,
      softActive: true,
      inGrace: false,
      expiresAt: subscription.currentPeriodEndAt,
      shouldDowngradeNow: false,
      reason: ReasonCode.SUBSCRIPTION_PAST_DUE
    };
  }

  if (subscription.status === SubscriptionStatus.GRACE_PERIOD) {
    const graceEnd = parse(subscription.graceEndAt);
    const inGrace = !graceEnd || graceEnd >= nowMs;
    return {
      hasAccessNow: inGrace,
      softActive: inGrace,
      inGrace,
      expiresAt: subscription.graceEndAt,
      shouldDowngradeNow: !inGrace,
      reason: inGrace ? ReasonCode.SUBSCRIPTION_PAST_DUE : ReasonCode.GRACE_PERIOD_EXPIRED
    };
  }

  if (subscription.status === SubscriptionStatus.CANCELED) {
    const cancelEffective = parse(subscription.cancelEffectiveAt ?? subscription.currentPeriodEndAt);
    const hasAccessNow = !cancelEffective || cancelEffective >= nowMs;
    return {
      hasAccessNow,
      softActive: hasAccessNow,
      inGrace: false,
      expiresAt: subscription.cancelEffectiveAt ?? subscription.currentPeriodEndAt,
      shouldDowngradeNow: !hasAccessNow,
      reason: hasAccessNow ? undefined : ReasonCode.CANCELED_EFFECTIVE
    };
  }

  return {
    hasAccessNow: true,
    softActive: true,
    inGrace: false,
    expiresAt: subscription.currentPeriodEndAt,
    shouldDowngradeNow: false
  };
}

export function renewalBehaviorLabel(subscription: Subscription): RenewalStatus {
  if (subscription.renewalStatus !== RenewalStatus.UNKNOWN) return subscription.renewalStatus;
  if (isScheduledForCancellation(subscription) || !subscription.autoRenews) return RenewalStatus.AUTO_RENEW_OFF;
  return RenewalStatus.AUTO_RENEW_ON;
}

export function assertTransitionAllowed(previous: SubscriptionStatus, next: SubscriptionStatus): void {
  const allowed = new Set<string>([
    `${SubscriptionStatus.FREE}->${SubscriptionStatus.TRIALING}`,
    `${SubscriptionStatus.FREE}->${SubscriptionStatus.ACTIVE}`,
    `${SubscriptionStatus.TRIALING}->${SubscriptionStatus.ACTIVE}`,
    `${SubscriptionStatus.TRIALING}->${SubscriptionStatus.EXPIRED}`,
    `${SubscriptionStatus.ACTIVE}->${SubscriptionStatus.PAST_DUE}`,
    `${SubscriptionStatus.PAST_DUE}->${SubscriptionStatus.GRACE_PERIOD}`,
    `${SubscriptionStatus.PAST_DUE}->${SubscriptionStatus.ACTIVE}`,
    `${SubscriptionStatus.GRACE_PERIOD}->${SubscriptionStatus.ACTIVE}`,
    `${SubscriptionStatus.GRACE_PERIOD}->${SubscriptionStatus.EXPIRED}`,
    `${SubscriptionStatus.ACTIVE}->${SubscriptionStatus.CANCELED}`,
    `${SubscriptionStatus.CANCELED}->${SubscriptionStatus.EXPIRED}`,
    `${SubscriptionStatus.ACTIVE}->${SubscriptionStatus.EXPIRED}`,
    `${SubscriptionStatus.INCOMPLETE}->${SubscriptionStatus.ACTIVE}`,
    `${SubscriptionStatus.INCOMPLETE}->${SubscriptionStatus.EXPIRED}`
  ]);

  if (previous === next) return;
  if (!allowed.has(`${previous}->${next}`)) {
    throw new Error(`Invalid subscription transition ${previous} -> ${next}`);
  }
}
