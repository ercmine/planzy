import 'package:collection/collection.dart';
import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../../../core/format/formatters.dart';
import '../../../models/plan.dart';
import '../../ideas/widgets/friend_idea_badge.dart';
import 'category_pill.dart';
import 'price_pill.dart';
import 'rating_row.dart';
import 'specials_badge.dart';
import 'sponsored_badge.dart';

class DeckCard extends StatelessWidget {
  const DeckCard({
    required this.plan,
    required this.onTap,
    super.key,
  });

  final Plan plan;
  final VoidCallback onTap;

  bool get _isSponsored =>
      plan.metadata?['sponsored'] == true || plan.source.toLowerCase() == 'promoted';

  @override
  Widget build(BuildContext context) {
    final distance = formatDistanceMeters(plan.distanceMeters);
    final rating = formatRating(plan.rating, plan.reviewCount);
    final price = formatPriceLevel(plan.priceLevel);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: plan.photos?.firstOrNull != null
                  ? Image.network(
                      plan.photos!.first.url,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                    )
                  : Container(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      child: const Icon(Icons.photo, size: 56),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.m),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppSpacing.s),
                  Wrap(
                    spacing: AppSpacing.s,
                    runSpacing: AppSpacing.s,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      CategoryPill(category: plan.category),
                      if (distance.isNotEmpty) Text(distance),
                      PricePill(label: price),
                      RatingRow(text: rating),
                      if (plan.hours?.openNow == true)
                        const Text('Open now')
                      else if (plan.hours?.openNow == false)
                        const Text('Closed'),
                      if (isFriendIdea(plan)) const FriendIdeaBadge(),
                      if (_isSponsored) const SponsoredBadge(),
                      if (plan.hasSpecials) const SpecialsBadge(),
                      if (plan.isVenueLike) const _ClaimBadge(),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClaimBadge extends StatelessWidget {
  const _ClaimBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.secondaryContainer,
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text('Claim'),
    );
  }
}
