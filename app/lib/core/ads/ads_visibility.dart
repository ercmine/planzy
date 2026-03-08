import 'ad_placement.dart';
import 'ad_policy.dart';
import 'ads_config.dart';

class AdsVisibility {
  const AdsVisibility({
    required AdsConfig config,
    required AdEntitlementSnapshot entitlement,
    AdEntitlementResolver entitlementResolver = const AdEntitlementResolver(),
    AdPlacementPolicy placementPolicy = const AdPlacementPolicy(),
  })  : _config = config,
        _entitlement = entitlement,
        _entitlementResolver = entitlementResolver,
        _placementPolicy = placementPolicy;

  final AdsConfig _config;
  final AdEntitlementSnapshot _entitlement;
  final AdEntitlementResolver _entitlementResolver;
  final AdPlacementPolicy _placementPolicy;

  AdEntitlementTier get tier => _entitlementResolver.resolve(_entitlement);

  AdRenderDecision decisionForPlacement(AdPlacement placement) {
    if (!_config.isUsable) {
      return AdRenderDecision(
        action: AdRenderAction.skipDueToPlan,
        reason: 'ads_config_disabled',
        failurePolicy: const AdInventoryFailurePolicy(
          collapseOnNoFill: true,
          reserveMinimalPlaceholder: false,
          allowRetry: false,
          maxRetryAttempts: 0,
        ),
      );
    }
    return _placementPolicy.evaluatePlacement(placement: placement, tier: tier);
  }

  bool canShow(String placementName) {
    final placement = AdPlacement.values.cast<AdPlacement?>().firstWhere(
      (p) => p?.name == placementName,
      orElse: () => null,
    );
    if (placement == null) {
      return false;
    }
    return decisionForPlacement(placement).shouldShowAd;
  }

  AdInsertionPolicy? insertionPolicyFor(AdPlacement placement) {
    return _placementPolicy.insertionPolicyFor(placement: placement, tier: tier);
  }

  AdRenderDecision inventoryFailureDecision({required AdPlacement placement, required int attempt}) {
    return _placementPolicy.onInventoryFailure(placement: placement, attempt: attempt);
  }
}
