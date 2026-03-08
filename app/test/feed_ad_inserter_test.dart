import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/ads/ad_placement.dart';
import 'package:perbug/core/ads/feed_ad_inserter.dart';

void main() {
  const inserter = FeedAdInserter();

  test('inserts ads at stable indexes and keeps content order', () {
    final source = List.generate(20, (i) => i);
    final mixed = inserter.inject<int, String>(
      items: source,
      placement: AdPlacement.resultsInlineBanner,
      adsEnabled: true,
      adBuilder: (contentIndex, mixedIndex) => 'ad-$contentIndex-$mixedIndex',
      contentBuilder: (item) => 'content-$item',
    );

    expect(mixed.where((e) => e.startsWith('ad-')), isNotEmpty);
    expect(mixed.where((e) => e.startsWith('content-')).length, source.length);
    expect(
      mixed.where((e) => e.startsWith('content-')).toList(growable: false),
      source.map((e) => 'content-$e').toList(growable: false),
    );
  });

  test('skips ads when disabled', () {
    final mixed = inserter.inject<int, int>(
      items: const [1, 2, 3],
      placement: AdPlacement.resultsInlineBanner,
      adsEnabled: false,
      adBuilder: (_, __) => -1,
      contentBuilder: (item) => item,
    );

    expect(mixed, const [1, 2, 3]);
  });
}
