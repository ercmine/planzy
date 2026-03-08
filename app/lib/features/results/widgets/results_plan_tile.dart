import 'package:flutter/material.dart';

import '../../../app/theme/spacing.dart';
import '../results_models.dart';

class ResultsPlanTile extends StatelessWidget {
  const ResultsPlanTile({
    required this.item,
    required this.onTap,
    required this.onLockIn,
    super.key,
  });

  final PlaceResultFeedItem item;
  final VoidCallback onTap;
  final VoidCallback onLockIn;

  @override
  Widget build(BuildContext context) {
    final card = item.card;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 160,
              width: double.infinity,
              child: card.primaryPhotoUrl == null
                  ? Container(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      alignment: Alignment.center,
                      child: const Icon(Icons.image_not_supported_outlined),
                    )
                  : Image.network(
                      card.primaryPhotoUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: Theme.of(context).colorScheme.surfaceContainerHighest,
                        alignment: Alignment.center,
                        child: const Icon(Icons.broken_image_outlined),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.m),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(card.title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: AppSpacing.xs),
                  Text(card.categoryLabel),
                  const SizedBox(height: AppSpacing.xs),
                  Text(card.description, maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: AppSpacing.xs),
                  Wrap(
                    spacing: AppSpacing.s,
                    runSpacing: AppSpacing.xs,
                    children: [
                      if (card.ratingText != null) Text('★ ${card.ratingText}'),
                      if (card.reviewCountText != null) Text(card.reviewCountText!),
                      if (card.distanceText != null) Text(card.distanceText!),
                      Text(card.sourceLabel),
                      if (card.photoCount > 1) Text('${card.photoCount} photos'),
                    ],
                  ),
                  if (card.locationLine != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(card.locationLine!, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                  const SizedBox(height: AppSpacing.xs),
                  Text(card.swipeSignal),
                  if (card.badges.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Wrap(
                      spacing: AppSpacing.xs,
                      children: card.badges
                          .map(
                            (badge) => Chip(
                              visualDensity: VisualDensity.compact,
                              label: Text(badge),
                            ),
                          )
                          .toList(growable: false),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.s),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: item.isLocked ? null : onLockIn,
                      child: Text(item.isLocked ? 'Locked In' : 'Lock In'),
                    ),
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
