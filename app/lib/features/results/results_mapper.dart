import '../../models/plan.dart';
import 'results_models.dart';
import 'results_state.dart';

PlaceCardViewModel mapPlanToCardViewModel(PlanScoreView item) {
  final plan = item.plan;
  final cleanDescription = plan.description?.trim();
  final description =
      (cleanDescription != null && cleanDescription.isNotEmpty) ? cleanDescription : _buildFallbackDescription(plan);

  return PlaceCardViewModel(
    id: plan.id,
    plan: plan,
    title: plan.title.trim().isEmpty ? 'Untitled place' : plan.title,
    categoryLabel: plan.category.trim().isEmpty ? 'Local spot' : plan.category,
    description: description,
    sourceLabel: _sourceLabel(plan.source),
    swipeSignal: 'Score ${item.score.toStringAsFixed(1)} • Yes ${item.yesCount} • Maybe ${item.maybeCount}',
    ratingText: plan.rating == null ? null : plan.rating!.toStringAsFixed(1),
    reviewCountText: _reviewText(plan.reviewCount),
    distanceText: _distanceText(plan.distanceMeters),
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

String? _distanceText(double? distanceMeters) {
  if (distanceMeters == null) return null;
  if (distanceMeters < 1000) {
    return '${distanceMeters.round()} m';
  }
  return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
}

String _sourceLabel(String source) {
  if (source.trim().isEmpty) return 'Perbug';
  return source[0].toUpperCase() + source.substring(1);
}

String? _reviewText(int? reviewCount) {
  if (reviewCount == null) return null;
  if (reviewCount == 1) return '1 review';
  return '$reviewCount reviews';
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
