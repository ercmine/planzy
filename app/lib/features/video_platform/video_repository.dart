import '../../api/api_client.dart';
import 'video_models.dart';

class VideoRepository {
  VideoRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<PlaceVideoFeedItem>> fetchFeed({required FeedScope scope}) async {
    final response = await apiClient.getJson('/v1/feed/videos', queryParameters: {'scope': scope.name});
    final items = response['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map((item) => PlaceVideoFeedItem.fromJson(item, scope)).toList(growable: false);
  }

  Future<List<PlaceSearchResult>> searchPlaces({required String query, FeedScope scope = FeedScope.local, String? category}) async {
    final response = await apiClient.getJson(
      '/v1/places/search',
      queryParameters: {'q': query, 'scope': scope.name, 'category': category},
    );
    final items = response['places'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(PlaceSearchResult.fromJson).toList(growable: false);
  }

  Future<List<StudioVideo>> fetchStudioVideos() async {
    final response = await apiClient.getJson('/v1/studio/videos');
    final items = response['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(StudioVideo.fromJson).toList(growable: false);
  }

  Future<void> submitDraft({
    required String source,
    required String placeId,
    required String title,
    required String caption,
    required int rating,
  }) async {
    await apiClient.postJson('/v1/studio/videos', body: {
      'source': source,
      'placeId': placeId,
      'title': title,
      'caption': caption,
      'rating': rating,
      'status': 'draft',
    });
  }
}
