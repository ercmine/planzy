import '../../features/deck/deck_state.dart';
import '../../models/plan.dart';
import 'ads_config.dart';

class AdDeckInjector {
  const AdDeckInjector({required AdsConfig config}) : _config = config;

  final AdsConfig _config;

  List<DeckItem> inject({
    required List<Plan> plans,
  }) {
    if (!_config.isUsable || plans.isEmpty) {
      return plans.map(DeckPlanItem.new).toList(growable: false);
    }

    final items = <DeckItem>[];
    var organicCount = 0;
    var adsInWindow = 0;
    var plansSinceAd = _config.frequencyN;

    for (final plan in plans) {
      final withinFirstWindow = organicCount < _config.adsWindowSize;
      final canInsertAd =
          organicCount >= _config.placeFirstAfter &&
          plansSinceAd >= _config.frequencyN &&
          (!withinFirstWindow || adsInWindow < _config.maxAdsPerWindow);

      if (canInsertAd) {
        final position = items.length;
        items.add(
          DeckAdItem(
            AdSlot(
              slotId: 'slot-$position',
              positionKey: position,
            ),
          ),
        );
        plansSinceAd = 0;
        if (withinFirstWindow) {
          adsInWindow += 1;
        }
      }

      items.add(DeckPlanItem(plan));
      organicCount += 1;
      plansSinceAd += 1;
    }

    return items;
  }
}
