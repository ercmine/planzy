import 'ad_placement.dart';
import 'ad_policy.dart';

class FeedAdInserter {
  const FeedAdInserter();

  List<TOut> inject<TIn, TOut>({
    required List<TIn> items,
    required AdPlacement placement,
    required TOut Function(TIn) contentBuilder,
    required TOut Function(int contentIndex, int mixedIndex) adBuilder,
    required bool adsEnabled,
    AdInsertionPolicy? insertionPolicy,
  }) {
    if (!adsEnabled || items.isEmpty) {
      return items.map(contentBuilder).toList(growable: false);
    }

    final config = AdPlacements.of(placement);
    final effectivePolicy = insertionPolicy ??
        (config.firstAdAfterItem != null &&
                config.frequency != null &&
                config.maxAdsPerWindow != null &&
                config.adsWindowSize != null
            ? AdInsertionPolicy(
                firstAdAfterItem: config.firstAdAfterItem!,
                frequency: config.frequency!,
                maxAdsPerWindow: config.maxAdsPerWindow!,
                adsWindowSize: config.adsWindowSize!,
              )
            : null);

    if (effectivePolicy == null || effectivePolicy.frequency <= 0) {
      return items.map(contentBuilder).toList(growable: false);
    }

    final result = <TOut>[];
    var adsInserted = 0;
    for (var i = 0; i < items.length; i++) {
      final shouldInsert = i >= effectivePolicy.firstAdAfterItem &&
          (i - effectivePolicy.firstAdAfterItem) % effectivePolicy.frequency == 0;
      if (shouldInsert && _canInsert(effectivePolicy, i, adsInserted)) {
        result.add(adBuilder(i, result.length));
        adsInserted += 1;
      }
      result.add(contentBuilder(items[i]));
    }

    return result;
  }

  bool _canInsert(AdInsertionPolicy policy, int index, int adsInserted) {
    if (policy.adsWindowSize <= 0) {
      return true;
    }
    final windowPosition = index ~/ policy.adsWindowSize;
    final maxAllowed = (windowPosition + 1) * policy.maxAdsPerWindow;
    return adsInserted < maxAllowed;
  }
}
