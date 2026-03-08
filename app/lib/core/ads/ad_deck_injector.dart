import '../../features/deck/deck_state.dart';
import '../../models/plan.dart';
import 'ad_placement.dart';
import 'ads_visibility.dart';
import 'feed_ad_inserter.dart';

class AdDeckInjector {
  const AdDeckInjector({
    required AdsVisibility visibility,
    FeedAdInserter feedAdInserter = const FeedAdInserter(),
  })  : _visibility = visibility,
        _feedAdInserter = feedAdInserter;

  final AdsVisibility _visibility;
  final FeedAdInserter _feedAdInserter;

  List<DeckItem> inject({
    required List<Plan> plans,
  }) {
    return _feedAdInserter.inject<Plan, DeckItem>(
      items: plans,
      placement: AdPlacement.deckInlineNative,
      adsEnabled: _visibility.decisionForPlacement(AdPlacement.deckInlineNative).shouldShowAd,
      insertionPolicy: _visibility.insertionPolicyFor(AdPlacement.deckInlineNative),
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
