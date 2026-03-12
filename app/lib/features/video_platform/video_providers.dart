import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import 'video_models.dart';
import 'video_repository.dart';

final videoRepositoryProvider = FutureProvider<VideoRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return VideoRepository(apiClient: apiClient);
});

final videoFeedProvider = FutureProvider.family<List<PlaceVideoFeedItem>, FeedScope>((ref, scope) async {
  final repo = await ref.watch(videoRepositoryProvider.future);
  return repo.fetchFeed(scope: scope);
});

final studioVideosProvider = FutureProvider.family<List<StudioVideo>, StudioSection?>((ref, section) async {
  final repo = await ref.watch(videoRepositoryProvider.future);
  return repo.fetchStudioVideos(section: section);
});

final studioAnalyticsProvider = FutureProvider<StudioAnalyticsOverview>((ref) async {
  final repo = await ref.watch(videoRepositoryProvider.future);
  return repo.fetchStudioAnalytics();
});

final placeSearchProvider = FutureProvider.family<List<PlaceSearchResult>, ({String query, FeedScope scope})>((ref, arg) async {
  if (arg.query.trim().isEmpty) {
    return const [];
  }
  final repo = await ref.watch(videoRepositoryProvider.future);
  return repo.searchPlaces(query: arg.query, scope: arg.scope);
});
