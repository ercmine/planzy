import '../../features/deck/deck_state.dart';
import '../../models/plan.dart';
import 'ad_placement.dart';
import 'ads_config.dart';
import 'feed_ad_inserter.dart';

class AdDeckInjector {
  const AdDeckInjector({
    required AdsConfig config,
    FeedAdInserter feedAdInserter = const FeedAdInserter(),
  })  : _config = config,
        _feedAdInserter = feedAdInserter;

  final AdsConfig _config;
  final FeedAdInserter _feedAdInserter;

  List<DeckItem> inject({
    required List<Plan> plans,
  }) {
    return _feedAdInserter.inject<Plan, DeckItem>(
      items: plans,
      placement: AdPlacement.deckInlineNative,
      adsEnabled: _config.isUsable,
      adBuilder: (_, mixedIndex) => DeckAdItem(
        AdSlot(
          slotId: 'deck-slot-$mixedIndex',
          positionKey: mixedIndex,
        ),
      ),
      contentBuilder: DeckPlanItem.new,
    );
  }
}
