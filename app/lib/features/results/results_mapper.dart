import '../../core/format/formatters.dart';
import '../../models/plan.dart';
import 'results_models.dart';
import 'results_state.dart';

PlaceCardViewModel mapPlanToCardViewModel(PlanScoreView item) {
  final plan = item.plan;
  final cleanDescription = plan.description?.trim();
  final description =
      (cleanDescription != null && cleanDescription.isNotEmpty) ? cleanDescription : _buildFallbackDescription(plan);
  final distanceText = formatDistanceMeters(plan.distanceMeters);

  return PlaceCardViewModel(
    id: plan.id,
    plan: plan,
    title: plan.title.trim().isEmpty ? 'Untitled place' : plan.title,
    categoryLabel: plan.category.trim().isEmpty ? 'Local spot' : plan.category,
    description: description,
    sourceLabel: formatSourceLabel(plan.source),
    swipeSignal: 'Score ${item.score.toStringAsFixed(1)} • Yes ${item.yesCount} • Maybe ${item.maybeCount}',
    ratingText: plan.rating == null ? null : plan.rating!.toStringAsFixed(1),
    reviewCountText: formatReviewCount(plan.reviewCount),
    distanceText: distanceText.isEmpty ? null : distanceText,
    locationLine: plan.location.address,
    primaryPhotoUrl: plan.photos?.isNotEmpty == true ? plan.photos!.first.url : null,
    photoCount: plan.photos?.length ?? 0,
    badges: _badgesForPlan(plan),
  );
}

String _buildFallbackDescription(Plan plan) {
  final tags = (plan.metadata?['tags'] as List?)?.whereType<String>().toList(growable: false) ?? const <String>[];
  final area = plan.location.address?.split(',').first.trim();
  if (tags.isNotEmpty && area != null && area.isNotEmpty) {
    return '${_capitalize(plan.category)} in $area known for ${tags.take(2).join(' and ')}.';
  }
  if (area != null && area.isNotEmpty) {
    return '${_capitalize(plan.category)} in $area.';
  }
  if (tags.isNotEmpty) {
    return '${_capitalize(plan.category)} known for ${tags.take(2).join(' and ')}.';
  }
  return '${_capitalize(plan.category)} worth checking out.';
}

String _capitalize(String input) {
  if (input.isEmpty) return 'Place';
  return input[0].toUpperCase() + input.substring(1);
}

List<String> _badgesForPlan(Plan plan) {
  final badges = <String>[];
  if (plan.metadata?['sponsored'] == true) {
    badges.add('Sponsored');
  }
  if (plan.metadata?['saved'] == true) {
    badges.add('Saved');
  }
  return badges;
}
