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

  Future<List<PlaceSearchResult>> searchPlaces({
    required String query,
    FeedScope scope = FeedScope.local,
    String? category,
    double? lat,
    double? lng,
    String? city,
    String? region,
    int limit = 8,
  }) async {
    final response = await apiClient.getJson(
      '/v1/places/autocomplete',
      queryParameters: {
        'q': query,
        'scope': scope.name,
        'category': category,
        'lat': lat,
        'lng': lng,
        'city': city,
        'region': region,
        'limit': limit,
      },
    );
    final items = response['suggestions'] ?? response['places'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(PlaceSearchResult.fromJson).toList(growable: false);
  }


  Future<List<MapDiscoveryPlace>> fetchMapDiscovery({
    required double north,
    required double south,
    required double east,
    required double west,
    required double centerLat,
    required double centerLng,
    required double zoom,
    List<String> categories = const [],
    String mode = 'search_this_area',
    int limit = 80,
  }) async {
    final response = await apiClient.getJson(
      '/v1/places/map-discovery',
      queryParameters: {
        'north': north,
        'south': south,
        'east': east,
        'west': west,
        'centerLat': centerLat,
        'centerLng': centerLng,
        'zoom': zoom,
        'categories': categories.join(','),
        'mode': mode,
        'limit': limit,
      },
    );
    final items = response['places'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(MapDiscoveryPlace.fromJson).toList(growable: false);
  }

  Future<List<StudioVideo>> fetchStudioVideos({StudioSection? section}) async {
    final response = await apiClient.getJson('/v1/studio/videos', queryParameters: {if (section != null) 'section': _sectionParam(section)});
    final items = response['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(StudioVideo.fromJson).toList(growable: false);
  }


  Future<StudioAnalyticsOverview> fetchStudioAnalytics() async {
    final response = await apiClient.getJson('/v1/studio/analytics');
    final payload = response['analytics'];
    return StudioAnalyticsOverview.fromJson(payload is Map<String, dynamic> ? payload : const {});
  }

  String _sectionParam(StudioSection section) {
    switch (section) {
      case StudioSection.processing:
        return 'processing';
      case StudioSection.published:
        return 'published';
      case StudioSection.needsAttention:
        return 'needs_attention';
      case StudioSection.archived:
        return 'archived';
      case StudioSection.drafts:
        return 'drafts';
    }
  }

  Future<String> createDraft({
    required String placeId,
    required String title,
    required String caption,
    required int rating,
  }) async {
    final response = await apiClient.postJson('/v1/videos', body: {
      'canonicalPlaceId': placeId,
      'title': title,
      'caption': caption,
      'rating': rating,
    });
    final video = response['video'];
    if (video is! Map<String, dynamic>) return '';
    return (video['id'] ?? '').toString();
  }

  Future<VideoUploadSession> requestUploadSession({
    required String videoId,
    required String fileName,
    required String contentType,
    required int sizeBytes,
  }) async {
    final response = await apiClient.postJson('/v1/videos/$videoId/upload-session', body: {
      'fileName': fileName,
      'contentType': contentType,
      'sizeBytes': sizeBytes,
    });
    final payload = response['uploadSession'];
    return VideoUploadSession.fromJson(payload is Map<String, dynamic> ? payload : const {});
  }

  Future<void> finalizeUpload({
    required String videoId,
    required String uploadSessionId,
    int? durationMs,
    int? width,
    int? height,
  }) async {
    await apiClient.postJson('/v1/videos/$videoId/finalize-upload', body: {
      'uploadSessionId': uploadSessionId,
      'durationMs': durationMs,
      'width': width,
      'height': height,
    });
  }

  Future<void> publish({required String videoId}) async {
    await apiClient.postJson('/v1/videos/$videoId/publish', body: const {});
  }

  Future<void> submitDraft({
    required String source,
    required String placeId,
    required String title,
    required String caption,
    required int rating,
  }) async {
    final videoId = await createDraft(placeId: placeId, title: title, caption: caption, rating: rating);
    if (videoId.isEmpty) return;
    final upload = await requestUploadSession(
      videoId: videoId,
      fileName: source == 'record' ? 'recorded.mp4' : 'device-upload.mp4',
      contentType: 'video/mp4',
      sizeBytes: 20 * 1024 * 1024,
    );
    await finalizeUpload(videoId: videoId, uploadSessionId: upload.id);
    await publish(videoId: videoId);
  }

  Future<void> reportVideo({
    required String videoId,
    required String placeId,
    required String reasonCode,
    String? note,
  }) async {
    await apiClient.postJson('/v1/moderation/reports', body: {
      'targetType': 'place_review_video',
      'targetId': videoId,
      'placeId': placeId,
      'reasonCode': reasonCode,
      if (note != null && note.isNotEmpty) 'note': note,
    });
  }
}
