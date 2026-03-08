import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/ads/ad_placement.dart';
import 'package:perbug/core/ads/ad_policy.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/ads/ads_visibility.dart';

void main() {
  const enabledConfig = AdsConfig(
    enabled: true,
    admobAppIdIos: 'ios',
    admobAppIdAndroid: 'android',
    nativeUnitIdIos: 'ios-native',
    nativeUnitIdAndroid: 'android-native',
    frequencyN: 8,
    placeFirstAfter: 3,
    maxAdsPerWindow: 3,
    adsWindowSize: 50,
  );

  test('elite users never see ads', () {
    final visibility = AdsVisibility(
      config: enabledConfig,
      entitlement: const AdEntitlementSnapshot(planCode: 'elite', isAnonymous: false),
    );

    expect(visibility.decisionForPlacement(AdPlacement.resultsInlineBanner).shouldShowAd, isFalse);
  });

  test('plus users get reduced insertion policy', () {
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
    expect(insertion!.frequency, greaterThan(8));
    expect(insertion.maxAdsPerWindow, 1);
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
