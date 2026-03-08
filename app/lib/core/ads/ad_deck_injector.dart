import '../../config/admob_config.dart';
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
    for (var i = 0; i < plans.length; i++) {
      final shouldInsertAd = i >= AdMobConfig.firstAdAfterItem &&
          (i - AdMobConfig.firstAdAfterItem) % AdMobConfig.adInterval == 0;
      if (shouldInsertAd) {
        final position = items.length;
        items.add(
          DeckAdItem(
            AdSlot(
              slotId: 'slot-$position',
              positionKey: position,
            ),
          ),
        );
      }

      items.add(DeckPlanItem(plans[i]));
    }

    return items;
  }
}
