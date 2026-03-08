import '../../models/plan.dart';

class PlaceCardViewModel {
  const PlaceCardViewModel({
    required this.id,
    required this.plan,
    required this.title,
    required this.categoryLabel,
    required this.description,
    required this.sourceLabel,
    required this.photoCount,
    required this.swipeSignal,
    this.ratingText,
    this.reviewCountText,
    this.distanceText,
    this.locationLine,
    this.primaryPhotoUrl,
    this.badges = const <String>[],
  });

  final String id;
  final Plan plan;
  final String title;
  final String categoryLabel;
  final String description;
  final String sourceLabel;
  final String swipeSignal;
  final String? ratingText;
  final String? reviewCountText;
  final String? distanceText;
  final String? locationLine;
  final String? primaryPhotoUrl;
  final int photoCount;
  final List<String> badges;
}

sealed class ResultFeedItem {
  const ResultFeedItem();
}

class PlaceResultFeedItem extends ResultFeedItem {
  const PlaceResultFeedItem({
    required this.card,
    required this.isLocked,
  });

  final PlaceCardViewModel card;
  final bool isLocked;
}

class AdResultFeedItem extends ResultFeedItem {
  const AdResultFeedItem({required this.slotId});

  final String slotId;
}
