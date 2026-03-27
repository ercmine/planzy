import 'package:flutter/material.dart';

import '../../app/theme/widgets.dart';
import 'map_discovery_models.dart';

class PlaceDetailPage extends StatelessWidget {
  const PlaceDetailPage({
    super.key,
    required this.place,
    required this.onLeaveReview,
    required this.onOpenMaps,
    required this.onShare,
  });

  final MapPin place;
  final VoidCallback onLeaveReview;
  final VoidCallback onOpenMaps;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(title: Text(place.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(place.name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('${place.categoryLabel} • ${place.neighborhoodLabel}'),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    AppPill(label: '★ ${place.rating.toStringAsFixed(1)}', icon: Icons.star_rounded),
                    if (place.openNow == true) const AppPill(label: 'Open now', icon: Icons.schedule_rounded),
                    if (place.hasReviews) AppPill(label: '${place.reviewCount} reviews', icon: Icons.rate_review_outlined),
                  ],
                ),
                if ((place.descriptionSnippet ?? '').isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(place.descriptionSnippet!),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(onPressed: onLeaveReview, icon: const Icon(Icons.rate_review_outlined), label: const Text('Leave review')),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: onOpenMaps, icon: const Icon(Icons.directions_outlined), label: const Text('Directions')),
          const SizedBox(height: 8),
          OutlinedButton.icon(onPressed: onShare, icon: const Icon(Icons.share_outlined), label: const Text('Share')),
        ],
      ),
    );
  }
}
