import 'package:flutter/material.dart';

import 'map_discovery_models.dart';

enum PlaceProximityState { unknown, nearby, here }

class PlacePreviewCard extends StatelessWidget {
  const PlacePreviewCard({
    super.key,
    required this.place,
    required this.proximityState,
    this.distanceMeters,
    this.onOpenDetails,
    this.onSave,
    this.onShare,
    this.onOpenMaps,
  });

  final MapPin place;
  final PlaceProximityState proximityState;
  final double? distanceMeters;
  final VoidCallback? onOpenDetails;
  final VoidCallback? onSave;
  final VoidCallback? onShare;
  final VoidCallback? onOpenMaps;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final proximityLabel = switch (proximityState) {
      PlaceProximityState.here => 'You’re here',
      PlaceProximityState.nearby => 'Near this place',
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
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.shadow.withOpacity(0.12),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
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
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFF1E2E66), Color(0xFF0D1228)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                          ),
                        ),
                ),
                Positioned(
                  left: 12,
                  bottom: 10,
                  child: Wrap(spacing: 8, children: [
                    if (proximityLabel != null)
                      Chip(
                        avatar: const Icon(Icons.my_location, size: 16),
                        label: Text(proximityLabel),
                        visualDensity: VisualDensity.compact,
                      ),
                    if (place.hasCreatorMedia)
                      const Chip(
                        avatar: Icon(Icons.play_circle_outline, size: 16),
                        label: Text('Creator videos'),
                        visualDensity: VisualDensity.compact,
                      ),
                  ]),
                )
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(place.name, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(
                  '${place.categoryLabel} • ${place.neighborhoodLabel}',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    Chip(label: Text('★ ${place.rating.toStringAsFixed(1)} trust')),
                    if (distanceLabel != null) Chip(label: Text(distanceLabel)),
                    if (place.hasReviews) const Chip(label: Text('New reviews')),
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
                IconButton.filledTonal(onPressed: onSave, icon: const Icon(Icons.bookmark_border)),
                IconButton.filledTonal(onPressed: onShare, icon: const Icon(Icons.share_outlined)),
                IconButton.filledTonal(onPressed: onOpenMaps, icon: const Icon(Icons.map_outlined)),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(onPressed: onOpenDetails, icon: const Icon(Icons.rate_review_outlined), label: const Text('Open place & review')),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
