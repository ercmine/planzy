import 'dart:developer' as developer;

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
  final Map<String, _TimedCacheEntry<List<PlaceStreamItem>>> _placeStreamCache = {};
  final Map<String, Future<List<PlaceStreamItem>>> _placeStreamInFlight = {};
  final Map<String, _TimedCacheEntry<List<PlaceSearchResult>>> _searchCache = {};
  final Map<String, Future<List<PlaceSearchResult>>> _searchInFlight = {};
  final Map<String, _TimedCacheEntry<List<MapDiscoveryPlace>>> _mapCache = {};
  final Map<String, Future<List<MapDiscoveryPlace>>> _mapInFlight = {};
  final Map<String, _TimedCacheEntry<List<StudioVideo>>> _studioCache = {};
  final Map<String, Future<List<StudioVideo>>> _studioInFlight = {};
  _TimedCacheEntry<StudioAnalyticsOverview>? _studioAnalyticsCache;
  Future<StudioAnalyticsOverview>? _studioAnalyticsInFlight;

  void invalidateStudioCache() {
    _studioCache.clear();
    _studioInFlight.clear();
    _studioAnalyticsCache = null;
    _studioAnalyticsInFlight = null;
  }

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

  Future<List<PlaceStreamItem>> fetchPlaceStream({required FeedScope scope}) async {
    final cacheKey = scope.name;
    return _loadCachedList(
      cache: _placeStreamCache,
      inFlight: _placeStreamInFlight,
      key: cacheKey,
      ttl: _feedCacheTtl,
      loader: () async {
        final feedItems = await fetchFeed(scope: scope);
        if (feedItems.isEmpty) return const [];

        final grouped = <String, List<PlaceVideoFeedItem>>{};
        for (final item in feedItems) {
          grouped.putIfAbsent(item.placeId, () => <PlaceVideoFeedItem>[]).add(item);
        }

        return grouped.entries
            .map((entry) => PlaceStreamItem.fromFeedItems(placeId: entry.key, scope: scope, items: entry.value))
            .toList(growable: false);
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
            'lat': lat?.toString(),
            'lng': lng?.toString(),
            'city': city,
            'region': region,
            'limit': limit.toString(),
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
            'north': north.toString(),
            'south': south.toString(),
            'east': east.toString(),
            'west': west.toString(),
            'centerLat': centerLat.toString(),
            'centerLng': centerLng.toString(),
            'zoom': zoom.toString(),
            'categories': categories.join(','),
            'mode': mode,
            'limit': limit.toString(),
          },
        );
        final items = response['places'];
        if (items is! List) return const [];
        return items.whereType<Map<String, dynamic>>().map(MapDiscoveryPlace.fromJson).toList(growable: false);
      },
    );
  }

  Future<void> submitVideoReport({required String videoId, required String reasonCode, String? note}) async {
    await apiClient.postJson('/v1/videos/$videoId/report', body: {'reasonCode': reasonCode, if (note != null && note.trim().isNotEmpty) 'note': note.trim()});
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

  Future<StudioVideo?> createDraft({
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
    if (video is! Map<String, dynamic>) return null;
    invalidateStudioCache();
    return StudioVideo.fromJson(video);
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

  Future<void> updateDraft({
    required String videoId,
    required String placeId,
    required String title,
    required String caption,
    required int rating,
  }) async {
    await apiClient.putJson('/v1/videos/$videoId', body: {
      'canonicalPlaceId': placeId,
      'title': title,
      'caption': caption,
      'rating': rating,
    });
    invalidateStudioCache();
  }

  Future<void> publish({required String videoId}) async {
    await apiClient.postJson('/v1/videos/$videoId/publish', body: const {});
    invalidateStudioCache();
  }

  Future<void> retryUpload({required String videoId}) async {
    await apiClient.postJson('/v1/videos/$videoId/retry-upload', body: const {});
    invalidateStudioCache();
  }

  Future<void> retryProcessing({required String videoId}) async {
    await apiClient.postJson('/v1/videos/$videoId/retry-processing', body: const {});
    invalidateStudioCache();
  }

  Future<void> archiveVideo({required String videoId}) async {
    await apiClient.postJson('/v1/videos/$videoId/archive', body: const {});
    invalidateStudioCache();
  }

  Future<void> attachMediaFromFlow({
    required String videoId,
    required String source,
  }) async {
    final upload = await requestUploadSession(
      videoId: videoId,
      fileName: source == 'record' ? 'recorded.mp4' : 'device-upload.mp4',
      contentType: 'video/mp4',
      sizeBytes: 20 * 1024 * 1024,
    );
    developer.log('creator_hub_upload_session_created', name: 'creator_hub', error: {'videoId': videoId, 'sessionId': upload.id, 'source': source});
    await finalizeUpload(videoId: videoId, uploadSessionId: upload.id);
    invalidateStudioCache();
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
