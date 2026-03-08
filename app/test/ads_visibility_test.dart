import 'package:flutter_test/flutter_test.dart';
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

  test('hides for ad-free users', () {
    final visibility = AdsVisibility(config: enabledConfig, isAdFreeUser: true);
    expect(visibility.canShow('resultsInlineBanner'), isFalse);
  });

  test('supports placement allow list', () {
    final visibility = AdsVisibility(
      config: enabledConfig,
      placementsEnabled: const {'resultsInlineBanner'},
    );

    expect(visibility.canShow('resultsInlineBanner'), isTrue);
    expect(visibility.canShow('deckInlineNative'), isFalse);
  });
}
