import 'package:flutter_test/flutter_test.dart';
import 'package:ourplanplan/core/ads/ad_deck_injector.dart';
import 'package:ourplanplan/core/ads/ads_config.dart';
import 'package:ourplanplan/features/deck/deck_state.dart';
import 'package:ourplanplan/models/plan.dart';

void main() {
  const config = AdsConfig(
    enabled: true,
    admobAppIdIos: 'ios',
    admobAppIdAndroid: 'android',
    nativeUnitIdIos: 'ios-native',
    nativeUnitIdAndroid: 'android-native',
    frequencyN: 10,
    placeFirstAfter: 3,
    maxAdsPerWindow: 3,
    adsWindowSize: 50,
  );

  test('injects no ad if deck is empty', () {
    final injector = AdDeckInjector(config: config);
    final result = injector.inject(plans: const []);
    expect(result, isEmpty);
  });

  test('injects deterministic ad slots with gap constraints', () {
    final injector = AdDeckInjector(config: config);
    final plans = [for (var i = 0; i < 25; i++) _plan('p$i')];
    final result = injector.inject(plans: plans);
    final adIndexes = <int>[];
    for (var i = 0; i < result.length; i++) {
      if (result[i] is DeckAdItem) {
        adIndexes.add(i);
      }
    }
    expect(adIndexes, isNotEmpty);
    expect(adIndexes.first, greaterThanOrEqualTo(3));
    for (var i = 1; i < adIndexes.length; i++) {
      expect(adIndexes[i] - adIndexes[i - 1], greaterThanOrEqualTo(10));
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
