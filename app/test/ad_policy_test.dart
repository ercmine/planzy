import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/ads/ad_placement.dart';
import 'package:perbug/core/ads/ad_policy.dart';

void main() {
  const resolver = AdEntitlementResolver();
  const policy = AdPlacementPolicy();

  test('resolver maps grace and canceled-but-active plus users correctly', () {
    expect(
      resolver.resolve(const AdEntitlementSnapshot(planCode: 'plus', isInGracePeriod: true, isAnonymous: false)),
      AdEntitlementTier.plus,
    );
    expect(
      resolver.resolve(const AdEntitlementSnapshot(planCode: 'plus', isCanceledButActive: true, isAnonymous: false)),
      AdEntitlementTier.plus,
    );
  });

  test('resolver maps expired plus user to free', () {
    expect(
      resolver.resolve(const AdEntitlementSnapshot(planCode: 'plus', isAnonymous: false)),
      AdEntitlementTier.free,
    );
  });

  test('elite suppresses all placements', () {
    final decision = policy.evaluatePlacement(
      placement: AdPlacement.resultsInlineBanner,
      tier: AdEntitlementTier.elite,
    );
    expect(decision.action, AdRenderAction.skipDueToPlan);
  });

  test('plus has reduced placement compared to free for detail inline', () {
    final free = policy.evaluatePlacement(
      placement: AdPlacement.placeDetailInlineBanner,
      tier: AdEntitlementTier.free,
    );
    final plus = policy.evaluatePlacement(
      placement: AdPlacement.placeDetailInlineBanner,
      tier: AdEntitlementTier.plus,
    );
    expect(free.shouldShowAd, isTrue);
    expect(plus.shouldShowAd, isFalse);
  });

  test('no-fill allows one retry then collapses', () {
    final retry = policy.onInventoryFailure(
      placement: AdPlacement.resultsInlineBanner,
      attempt: 0,
    );
    final collapse = policy.onInventoryFailure(
      placement: AdPlacement.resultsInlineBanner,
      attempt: 1,
    );
    expect(retry.action, AdRenderAction.allowRetryLater);
    expect(collapse.action, AdRenderAction.collapseSlot);
  });
}
