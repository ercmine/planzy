import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../../../core/format/formatters.dart';
import '../../../models/plan.dart';
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

  @override
  Widget build(BuildContext context) {
    final hasSpecials = (plan.metadata?['specials'] as List<dynamic>?)?.isNotEmpty ?? false;
    final isSponsored =
        plan.metadata?['sponsored'] == true || plan.source.toLowerCase() == 'promoted';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _PhotoHeader(plan: plan),
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
                    spacing: AppSpacing.xs,
                    runSpacing: AppSpacing.xs,
                    children: [
                      CategoryPill(category: plan.category),
                      PricePill(priceLevel: plan.priceLevel),
                      Chip(label: Text(formatDistance(plan.distanceMeters))),
                      if (isSponsored) const SponsoredBadge(),
                      if (hasSpecials) const SpecialsBadge(),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.s),
                  RatingRow(rating: plan.rating, reviewCount: plan.reviewCount),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    plan.hours?.openNow == null
                        ? 'Hours unavailable'
                        : plan.hours!.openNow!
                            ? 'Open now'
                            : 'Closed',
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

class _PhotoHeader extends StatelessWidget {
  const _PhotoHeader({required this.plan});

  final Plan plan;

  @override
  Widget build(BuildContext context) {
    final photoUrl = plan.photos?.isNotEmpty == true ? plan.photos!.first.url : null;
    if (photoUrl == null) {
      return Container(
        color: Colors.grey.shade300,
        alignment: Alignment.center,
        child: const Icon(Icons.image_not_supported_outlined),
      );
    }

    return CachedNetworkImage(
      imageUrl: photoUrl,
      fit: BoxFit.cover,
      width: double.infinity,
      placeholder: (context, _) => Container(
        color: Colors.grey.shade300,
      ),
      errorWidget: (context, _, __) => Container(
        color: Colors.grey.shade300,
        alignment: Alignment.center,
        child: const Icon(Icons.broken_image_outlined),
      ),
    );
  }
}
