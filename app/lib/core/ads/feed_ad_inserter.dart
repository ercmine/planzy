import 'ad_placement.dart';

class FeedAdInserter {
  const FeedAdInserter();

  List<TOut> inject<TIn, TOut>({
    required List<TIn> items,
    required AdPlacement placement,
    required TOut Function(TIn) contentBuilder,
    required TOut Function(int contentIndex, int mixedIndex) adBuilder,
    required bool adsEnabled,
  }) {
    if (!adsEnabled || items.isEmpty) {
      return items.map(contentBuilder).toList(growable: false);
    }

    final config = AdPlacements.of(placement);
    final first = config.firstAdAfterItem;
    final frequency = config.frequency;
    if (first == null || frequency == null || first < 0 || frequency <= 0) {
      return items.map(contentBuilder).toList(growable: false);
    }

    final result = <TOut>[];
    var adsInserted = 0;
    for (var i = 0; i < items.length; i++) {
      final shouldInsert = i >= first && (i - first) % frequency == 0;
      if (shouldInsert && _canInsert(config, i, adsInserted)) {
        result.add(adBuilder(i, result.length));
        adsInserted += 1;
      }
      result.add(contentBuilder(items[i]));
    }

    return result;
  }

  bool _canInsert(AdSlotConfig config, int index, int adsInserted) {
    final maxAdsPerWindow = config.maxAdsPerWindow;
    final windowSize = config.adsWindowSize;
    if (maxAdsPerWindow == null || windowSize == null || windowSize <= 0) {
      return true;
    }
    final windowPosition = index ~/ windowSize;
    final maxAllowed = (windowPosition + 1) * maxAdsPerWindow;
    return adsInserted < maxAllowed;
  }
}
