import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/ads/ad_deck_injector.dart';
import 'package:perbug/core/ads/ad_policy.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/ads/ads_visibility.dart';
import 'package:perbug/features/deck/deck_state.dart';
import 'package:perbug/models/plan.dart';

void main() {
  const config = AdsConfig(
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

  const visibility = AdsVisibility(
    config: config,
    entitlement: AdEntitlementSnapshot(planCode: 'free', isResolved: true),
  );

  test('injects no ad if deck is empty', () {
    final injector = AdDeckInjector(visibility: visibility);
    final result = injector.inject(plans: const []);
    expect(result, isEmpty);
  });

  test('injects deterministic ad slots every 10 organic cards', () {
    final injector = AdDeckInjector(visibility: visibility);
    final plans = [for (var i = 0; i < 25; i++) _plan('p$i')];
    final result = injector.inject(plans: plans);
    final adIndexes = <int>[];
    for (var i = 0; i < result.length; i++) {
      if (result[i] is DeckAdItem) {
        adIndexes.add(i);
      }
    }
    expect(adIndexes, isNotEmpty);
    expect(adIndexes.first, 10);
    for (var i = 1; i < adIndexes.length; i++) {
      expect(adIndexes[i] - adIndexes[i - 1], 11);
    }
  });
}

Plan _plan(String id) => Plan(
      id: id,
      source: 'google',
      sourceId: id,
      title: id,
      category: 'food',
      location: const PlanLocation(lat: 0, lng: 0),
    );
