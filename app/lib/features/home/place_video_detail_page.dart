import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';

class PlaceVideoDetailPage extends ConsumerWidget {
  const PlaceVideoDetailPage({required this.placeId, required this.placeName, super.key});

  final String placeId;
  final String placeName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(videoFeedProvider(FeedScope.local));
    return Scaffold(
      appBar: AppBar(title: Text(placeName)),
      body: feed.when(
        data: (items) {
          final placeVideos = items.where((item) => item.placeId == placeId).toList(growable: false);
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Text(placeName, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 6),
              const Text('Place review video coverage'),
              const SizedBox(height: 12),
              if (placeVideos.isEmpty)
                const Card(
                  child: ListTile(
                    title: Text('No place videos available yet'),
                    subtitle: Text('Be the first to add a review or creator video for this place.'),
                  ),
                ),
              ...placeVideos.map(
                (video) => Card(
                  child: ListTile(
                    title: Text(video.caption.isEmpty ? video.placeName : video.caption),
                    subtitle: Text(video.creatorHandle),
                  ),
                ),
              ),
            ],
          );
        },
        error: (_, __) => const Center(child: Text('No place videos available')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
