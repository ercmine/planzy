import 'package:flutter_test/flutter_test.dart';
import 'package:dryad/core/ads/ad_placement.dart';
import 'package:dryad/core/ads/ad_policy.dart';
import 'package:dryad/core/ads/ads_config.dart';
import 'package:dryad/core/ads/ads_visibility.dart';

void main() {
  const enabledConfig = AdsConfig(
    enabled: true,
    admobAppIdIos: 'ios',
    admobAppIdAndroid: 'android',
    nativeUnitIdIos: 'ios-native',
    nativeUnitIdAndroid: 'android-native',
    frequencyN: 10,
    placeFirstAfter: 10,
    maxAdsPerWindow: 20,
    adsWindowSize: 200,
  );

  test('resolved users can see ads regardless of historical plan code', () {
    final visibility = AdsVisibility(
      config: enabledConfig,
      entitlement: const AdEntitlementSnapshot(planCode: 'elite', isAnonymous: false),
    );

    expect(visibility.decisionForPlacement(AdPlacement.resultsInlineBanner).shouldShowAd, isTrue);
  });

  test('insertion policy is the same for all resolved tiers', () {
    final visibility = AdsVisibility(
      config: enabledConfig,
      entitlement: const AdEntitlementSnapshot(
        planCode: 'plus',
        isAnonymous: false,
        isSubscriptionActive: true,
      ),
    );

    final insertion = visibility.insertionPolicyFor(AdPlacement.resultsInlineBanner);
    expect(insertion, isNotNull);
    expect(insertion!.frequency, 10);
    expect(insertion.firstAdAfterItem, 10);
  });

  test('unknown entitlement suppresses ads to avoid flicker', () {
    final visibility = AdsVisibility(
      config: enabledConfig,
      entitlement: const AdEntitlementSnapshot(isResolved: false),
    );

    final decision = visibility.decisionForPlacement(AdPlacement.resultsInlineBanner);
    expect(decision.action, AdRenderAction.skipDueToUnknownEntitlement);
  });
}
