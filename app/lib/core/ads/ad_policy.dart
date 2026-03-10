import 'package:flutter/foundation.dart';

import 'ad_placement.dart';

/// Normalized ad tier used by the ad subsystem.
enum AdEntitlementTier { free, plus, elite, unknown }

/// Kept for compatibility with existing call sites. Product is now universally
/// free and ad-supported, so all resolved users map to the same ad tier.
@immutable
class AdEntitlementSnapshot {
  const AdEntitlementSnapshot({
    this.planCode,
    this.serverTierOverride,
    this.featureFlagTierOverride,
    this.isAnonymous = true,
    this.isSubscriptionActive = false,
    this.isInGracePeriod = false,
    this.isBillingRetry = false,
    this.isCanceledButActive = false,
    this.isLegacyAdFree = false,
    this.isResolved = true,
  });

  final String? planCode;
  final AdEntitlementTier? serverTierOverride;
  final AdEntitlementTier? featureFlagTierOverride;
  final bool isAnonymous;
  final bool isSubscriptionActive;
  final bool isInGracePeriod;
  final bool isBillingRetry;
  final bool isCanceledButActive;
  final bool isLegacyAdFree;
  final bool isResolved;
}

class AdEntitlementResolver {
  const AdEntitlementResolver();

  AdEntitlementTier resolve(AdEntitlementSnapshot snapshot) {
    if (snapshot.serverTierOverride != null) {
      return snapshot.serverTierOverride!;
    }
    if (!snapshot.isResolved) {
      return AdEntitlementTier.unknown;
    }
    return AdEntitlementTier.free;
  }
}

@immutable
class AdInsertionPolicy {
  const AdInsertionPolicy({
    required this.firstAdAfterItem,
    required this.frequency,
    required this.maxAdsPerWindow,
    required this.adsWindowSize,
  });

  final int firstAdAfterItem;
  final int frequency;
  final int maxAdsPerWindow;
  final int adsWindowSize;
}

@immutable
class AdInventoryFailurePolicy {
  const AdInventoryFailurePolicy({
    required this.collapseOnNoFill,
    required this.reserveMinimalPlaceholder,
    required this.allowRetry,
    required this.maxRetryAttempts,
  });

  final bool collapseOnNoFill;
  final bool reserveMinimalPlaceholder;
  final bool allowRetry;
  final int maxRetryAttempts;
}

enum AdRenderAction {
  show,
  skipDueToPlan,
  skipDueToFrequency,
  skipDueToMissingInventory,
  skipDueToUnknownEntitlement,
  collapseSlot,
  reserveMinimalPlaceholder,
  allowRetryLater,
}

@immutable
class AdRenderDecision {
  const AdRenderDecision({
    required this.action,
    required this.reason,
    required this.failurePolicy,
  });

  final AdRenderAction action;
  final String reason;
  final AdInventoryFailurePolicy failurePolicy;

  bool get shouldShowAd => action == AdRenderAction.show;
  bool get shouldCollapse => action == AdRenderAction.collapseSlot || action == AdRenderAction.skipDueToPlan;
}

@immutable
class AdPlacementRule {
  const AdPlacementRule({
    required this.allowedTiers,
    required this.insertionByTier,
    required this.failurePolicy,
  });

  final Set<AdEntitlementTier> allowedTiers;
  final Map<AdEntitlementTier, AdInsertionPolicy> insertionByTier;
  final AdInventoryFailurePolicy failurePolicy;
}

class AdPlacementPolicy {
  const AdPlacementPolicy({Map<AdPlacement, AdPlacementRule>? placementRules})
      : _placementRules = placementRules ?? _defaultRules;

  final Map<AdPlacement, AdPlacementRule> _placementRules;

  AdRenderDecision evaluatePlacement({
    required AdPlacement placement,
    required AdEntitlementTier tier,
  }) {
    final rule = _placementRules[placement];
    if (rule == null) {
      return _hiddenDecision('placement_not_configured');
    }
    if (tier == AdEntitlementTier.unknown) {
      return AdRenderDecision(
        action: AdRenderAction.skipDueToUnknownEntitlement,
        reason: 'entitlement_unknown',
        failurePolicy: rule.failurePolicy,
      );
    }
    return AdRenderDecision(
      action: AdRenderAction.show,
      reason: 'eligible',
      failurePolicy: rule.failurePolicy,
    );
  }

  AdInsertionPolicy? insertionPolicyFor({
    required AdPlacement placement,
    required AdEntitlementTier tier,
  }) {
    final rule = _placementRules[placement];
    if (rule == null) {
      return null;
    }
    return rule.insertionByTier[tier] ?? rule.insertionByTier[AdEntitlementTier.free];
  }

  AdRenderDecision onInventoryFailure({
    required AdPlacement placement,
    required int attempt,
  }) {
    final rule = _placementRules[placement];
    if (rule == null) {
      return _hiddenDecision('placement_not_configured');
    }
    if (rule.failurePolicy.allowRetry && attempt < rule.failurePolicy.maxRetryAttempts) {
      return AdRenderDecision(
        action: AdRenderAction.allowRetryLater,
        reason: 'retry_allowed',
        failurePolicy: rule.failurePolicy,
      );
    }
    if (rule.failurePolicy.collapseOnNoFill) {
      return AdRenderDecision(
        action: AdRenderAction.collapseSlot,
        reason: 'no_fill_collapse',
        failurePolicy: rule.failurePolicy,
      );
    }
    return AdRenderDecision(
      action: AdRenderAction.reserveMinimalPlaceholder,
      reason: 'no_fill_placeholder',
      failurePolicy: rule.failurePolicy,
    );
  }

  AdRenderDecision _hiddenDecision(String reason) {
    return AdRenderDecision(
      action: AdRenderAction.skipDueToPlan,
      reason: reason,
      failurePolicy: const AdInventoryFailurePolicy(
        collapseOnNoFill: true,
        reserveMinimalPlaceholder: false,
        allowRetry: false,
        maxRetryAttempts: 0,
      ),
    );
  }
}

const _singleRetryThenCollapse = AdInventoryFailurePolicy(
  collapseOnNoFill: true,
  reserveMinimalPlaceholder: false,
  allowRetry: true,
  maxRetryAttempts: 1,
);

const _universalInlinePolicy = AdInsertionPolicy(
  firstAdAfterItem: 10,
  frequency: 10,
  maxAdsPerWindow: 20,
  adsWindowSize: 200,
);

const Map<AdPlacement, AdPlacementRule> _defaultRules = <AdPlacement, AdPlacementRule>{
  AdPlacement.resultsInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.deckInlineNative: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.homeFeedInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.creatorFeedInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.bookmarksInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.guidePageInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.cityPageInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.trendingInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: <AdEntitlementTier, AdInsertionPolicy>{AdEntitlementTier.free: _universalInlinePolicy},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.placeDetailInlineBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: const {},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.placeDetailFooterBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: const {},
    failurePolicy: _singleRetryThenCollapse,
  ),
  AdPlacement.resultsFooterBanner: AdPlacementRule(
    allowedTiers: <AdEntitlementTier>{AdEntitlementTier.free, AdEntitlementTier.plus, AdEntitlementTier.elite},
    insertionByTier: const {},
    failurePolicy: _singleRetryThenCollapse,
  ),
};
