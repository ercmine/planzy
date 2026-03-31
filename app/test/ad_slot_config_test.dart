import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/ads/ad_placement.dart';

void main() {
  test('resolveHeight clamps responsive value within bounds', () {
    final config = AdPlacements.of(AdPlacement.resultsInlineBanner);

    expect(config.resolveHeight(200), inInclusiveRange(config.minHeight, config.maxHeight));
    expect(config.resolveHeight(1200), inInclusiveRange(config.minHeight, config.maxHeight));
  });
}
