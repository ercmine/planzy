import '../../api/api_client.dart';
import 'video_models.dart';


class _TimedCacheEntry<T> {
  const _TimedCacheEntry({required this.value, required this.expiresAt});

  final T value;
  final DateTime expiresAt;

  bool isExpired(DateTime Function() now) => now().isAfter(expiresAt);
}

class VideoRepository {
  VideoRepository({required this.apiClient, DateTime Function()? now}) : _now = now ?? DateTime.now;

  final ApiClient apiClient;
  final DateTime Function() _now;

  static const Duration _feedCacheTtl = Duration(seconds: 45);
  static const Duration _searchCacheTtl = Duration(seconds: 20);
  static const Duration _mapCacheTtl = Duration(seconds: 30);
  static const Duration _studioCacheTtl = Duration(seconds: 30);

  final Map<String, _TimedCacheEntry<List<PlaceVideoFeedItem>>> _feedCache = {};
  final Map<String, Future<List<PlaceVideoFeedItem>>> _feedInFlight = {};
  final Map<String, _TimedCacheEntry<List<PlaceSearchResult>>> _searchCache = {};
  final Map<String, Future<List<PlaceSearchResult>>> _searchInFlight = {};
  final Map<String, _TimedCacheEntry<List<MapDiscoveryPlace>>> _mapCache = {};
  final Map<String, Future<List<MapDiscoveryPlace>>> _mapInFlight = {};
  final Map<String, _TimedCacheEntry<List<StudioVideo>>> _studioCache = {};
  final Map<String, Future<List<StudioVideo>>> _studioInFlight = {};
  _TimedCacheEntry<StudioAnalyticsOverview>? _studioAnalyticsCache;
  Future<StudioAnalyticsOverview>? _studioAnalyticsInFlight;

  Future<List<PlaceVideoFeedItem>> fetchFeed({required FeedScope scope}) async {
    final cacheKey = scope.name;
    return _loadCachedList(
      cache: _feedCache,
      inFlight: _feedInFlight,
      key: cacheKey,
      ttl: _feedCacheTtl,
      loader: () async {
        final response = await apiClient.getJson('/v1/feed/videos', queryParameters: {'scope': scope.name});
        final items = response['items'];
        if (items is! List) return const [];
        return items.whereType<Map<String, dynamic>>().map((item) => PlaceVideoFeedItem.fromJson(item, scope)).toList(growable: false);
      },
    );
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
    final normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.isEmpty) {
      return const [];
    }
    final cacheKey = [
      normalizedQuery,
      scope.name,
      category ?? '',
      lat?.toStringAsFixed(4) ?? '',
      lng?.toStringAsFixed(4) ?? '',
      city ?? '',
      region ?? '',
      limit,
    ].join('|');
    return _loadCachedList(
      cache: _searchCache,
      inFlight: _searchInFlight,
      key: cacheKey,
      ttl: _searchCacheTtl,
      loader: () async {
        final response = await apiClient.getJson(
          '/v1/places/autocomplete',
          queryParameters: {
            'q': normalizedQuery,
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
      },
    );
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
    final cacheKey = [
      north.toStringAsFixed(3),
      south.toStringAsFixed(3),
      east.toStringAsFixed(3),
      west.toStringAsFixed(3),
      centerLat.toStringAsFixed(4),
      centerLng.toStringAsFixed(4),
      zoom.toStringAsFixed(2),
      categories.join(','),
      mode,
      limit,
    ].join('|');
    return _loadCachedList(
      cache: _mapCache,
      inFlight: _mapInFlight,
      key: cacheKey,
      ttl: _mapCacheTtl,
      loader: () async {
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
      },
    );
  }

  Future<List<StudioVideo>> fetchStudioVideos({StudioSection? section}) async {
    final cacheKey = section?.name ?? 'all';
    return _loadCachedList(
      cache: _studioCache,
      inFlight: _studioInFlight,
      key: cacheKey,
      ttl: _studioCacheTtl,
      loader: () async {
        final response = await apiClient.getJson('/v1/studio/videos', queryParameters: {if (section != null) 'section': _sectionParam(section)});
        final items = response['items'];
        if (items is! List) return const [];
        return items.whereType<Map<String, dynamic>>().map(StudioVideo.fromJson).toList(growable: false);
      },
    );
  }


  Future<StudioAnalyticsOverview> fetchStudioAnalytics() async {
    final cached = _studioAnalyticsCache;
    if (cached != null && !cached.isExpired(_now)) {
      return cached.value;
    }
    final activeRequest = _studioAnalyticsInFlight;
    if (activeRequest != null) {
      return activeRequest;
    }
    final request = () async {
      final response = await apiClient.getJson('/v1/studio/analytics');
      final payload = response['analytics'];
      final overview = StudioAnalyticsOverview.fromJson(payload is Map<String, dynamic> ? payload : const {});
      _studioAnalyticsCache = _TimedCacheEntry(value: overview, expiresAt: _now().add(_studioCacheTtl));
      return overview;
    }();
    _studioAnalyticsInFlight = request;
    try {
      return await request;
    } finally {
      _studioAnalyticsInFlight = null;
    }
  }

  Future<List<T>> _loadCachedList<T>({
    required Map<String, _TimedCacheEntry<List<T>>> cache,
    required Map<String, Future<List<T>>> inFlight,
    required String key,
    required Duration ttl,
    required Future<List<T>> Function() loader,
  }) async {
    final cached = cache[key];
    if (cached != null && !cached.isExpired(_now)) {
      return cached.value;
    }
    final activeRequest = inFlight[key];
    if (activeRequest != null) {
      return activeRequest;
    }

    final request = loader();
    inFlight[key] = request;

    try {
      final loaded = await request;
      cache[key] = _TimedCacheEntry(value: loaded, expiresAt: _now().add(ttl));
      return loaded;
    } finally {
      inFlight.remove(key);
    }
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
