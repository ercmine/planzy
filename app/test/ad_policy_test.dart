import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/ads/ad_placement.dart';
import 'package:perbug/core/ads/ad_policy.dart';

void main() {
  const resolver = AdEntitlementResolver();
  const policy = AdPlacementPolicy();

  test('resolved users map to free ad-supported tier', () {
    expect(
      resolver.resolve(const AdEntitlementSnapshot(planCode: 'elite', isAnonymous: false, isResolved: true)),
      AdEntitlementTier.free,
    );
  });

  test('unknown entitlement still suppresses until resolved', () {
    expect(
      resolver.resolve(const AdEntitlementSnapshot(isResolved: false)),
      AdEntitlementTier.unknown,
    );
  });

  test('all resolved tiers show results ads in free model', () {
    final free = policy.evaluatePlacement(
      placement: AdPlacement.resultsInlineBanner,
      tier: AdEntitlementTier.free,
    );
    final plus = policy.evaluatePlacement(
      placement: AdPlacement.resultsInlineBanner,
      tier: AdEntitlementTier.plus,
    );
    final elite = policy.evaluatePlacement(
      placement: AdPlacement.resultsInlineBanner,
      tier: AdEntitlementTier.elite,
    );
    expect(free.shouldShowAd, isTrue);
    expect(plus.shouldShowAd, isTrue);
    expect(elite.shouldShowAd, isTrue);
  });

  test('inline insertion policy is every 10 cards', () {
    final insertion = policy.insertionPolicyFor(
      placement: AdPlacement.deckInlineNative,
      tier: AdEntitlementTier.free,
    );
    expect(insertion, isNotNull);
    expect(insertion!.firstAdAfterItem, 10);
    expect(insertion.frequency, 10);
  });
}
