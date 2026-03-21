import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'map_discovery_models.dart';

enum PlaceProximityState { unknown, nearby, here }

class PlacePreviewCard extends StatelessWidget {
  const PlacePreviewCard({
    super.key,
    required this.place,
    required this.proximityState,
    this.distanceMeters,
    this.saved = false,
    this.onOpenDetails,
    this.onSave,
    this.onShare,
    this.onOpenMaps,
  });

  final MapPin place;
  final PlaceProximityState proximityState;
  final double? distanceMeters;
  final bool saved;
  final VoidCallback? onOpenDetails;
  final VoidCallback? onSave;
  final VoidCallback? onShare;
  final VoidCallback? onOpenMaps;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final proximityLabel = switch (proximityState) {
      PlaceProximityState.here => 'You’re here',
      PlaceProximityState.nearby => 'Nearby now',
      PlaceProximityState.unknown => null,
    };

    final distanceLabel = distanceMeters == null
        ? null
        : distanceMeters! < 120
            ? 'Looks like you’re here'
            : '${(distanceMeters! / 1000).toStringAsFixed(1)} km away';

    return AnimatedContainer(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      child: AppCard(
        padding: EdgeInsets.zero,
        glow: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: Stack(
                children: [
                  AspectRatio(
                    aspectRatio: 16 / 8,
                    child: place.thumbnailUrl?.isNotEmpty == true
                        ? Image.network(place.thumbnailUrl!, fit: BoxFit.cover)
                        : Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  theme.colorScheme.surfaceContainerHigh,
                                  theme.colorScheme.primary.withOpacity(0.18),
                                  theme.colorScheme.secondary.withOpacity(0.12),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                            child: Center(
                              child: Icon(
                                Icons.place_outlined,
                                color: theme.colorScheme.onSurface.withOpacity(0.7),
                                size: 34,
                              ),
                            ),
                          ),
                  ),
                  Positioned(
                    left: 12,
                    right: 12,
                    top: 12,
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          if (proximityLabel != null) AppPill(label: proximityLabel, icon: Icons.my_location),
                          if (saved) ...[
                            if (proximityLabel != null) const SizedBox(width: 8),
                            AppPill(
                              label: 'Saved',
                              icon: Icons.bookmark_rounded,
                              backgroundColor: theme.colorScheme.secondary.withOpacity(0.18),
                            ),
                          ],
                          if (place.hasCreatorMedia) ...[
                            if (proximityLabel != null || saved) const SizedBox(width: 8),
                            const AppPill(label: 'Creator videos', icon: Icons.play_circle_outline),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(place.name, style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(
                    '${place.categoryLabel} • ${place.neighborhoodLabel}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      AppPill(label: '★ ${place.rating.toStringAsFixed(1)} trust', icon: Icons.star_rounded),
                      if (distanceLabel != null) AppPill(label: distanceLabel, icon: Icons.route_rounded, outlined: true),
                      if (place.openNow == true)
                        AppPill(
                          label: 'Open now',
                          icon: Icons.schedule_rounded,
                          backgroundColor: theme.colorScheme.tertiary.withOpacity(0.14),
                        ),
                      if (place.hasReviews)
                        AppPill(
                          label: '${place.reviewCount} reviews',
                          icon: Icons.flash_on_rounded,
                          backgroundColor: theme.colorScheme.secondary.withOpacity(0.14),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(place.descriptionSnippet ?? 'Open full place details for reviews, creator clips, and trust signals.', maxLines: 2, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 12),
              child: Row(
                children: [
                  AppIconButton(onPressed: onSave, icon: saved ? Icons.bookmark : Icons.bookmark_border),
                  const SizedBox(width: AppSpacing.s),
                  AppIconButton(onPressed: onShare, icon: Icons.share_outlined),
                  const SizedBox(width: AppSpacing.s),
                  AppIconButton(onPressed: onOpenMaps, icon: Icons.map_outlined),
                  const SizedBox(width: 8),
                  Expanded(
                    child: PrimaryButton(onPressed: onOpenDetails, icon: const Icon(Icons.rate_review_outlined), label: 'Open place & review'),
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
