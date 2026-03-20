enum FeedScope { local, regional, global }

enum StudioVideoStatus { draft, awaiting_upload, uploaded, processing, published, failed, hidden, rejected, archived }

enum StudioSection { drafts, processing, published, needsAttention, archived }

enum UploadProgressState { not_started, in_progress, completed, failed }

enum ProcessingProgressState { not_started, queued, in_progress, completed, failed }

class PlaceSearchResult {
  const PlaceSearchResult({
    required this.placeId,
    required this.name,
    required this.category,
    required this.regionLabel,
    this.addressSnippet,
    this.distanceKm,
    this.thumbnailUrl,
  });

  final String placeId;
  final String name;
  final String category;
  final String regionLabel;
  final String? addressSnippet;
  final double? distanceKm;
  final String? thumbnailUrl;

  factory PlaceSearchResult.fromJson(Map<String, dynamic> json) {
    return PlaceSearchResult(
      placeId: (json['canonicalPlaceId'] ?? json['placeId'] ?? '').toString(),
      name: (json['displayName'] ?? json['name'] ?? '').toString(),
      category: (json['category'] ?? 'Place').toString(),
      regionLabel: (json['regionLabel'] ?? [json['city'], json['region']].whereType<String>().where((item) => item.isNotEmpty).join(', ')).toString(),
      addressSnippet: json['addressSnippet']?.toString(),
      distanceKm: json['distanceKm'] is num
          ? (json['distanceKm'] as num).toDouble()
          : (json['distanceMeters'] is num ? ((json['distanceMeters'] as num).toDouble() / 1000) : null),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
    );
  }
}

class VideoUploadSession {
  const VideoUploadSession({required this.id, required this.bucket, required this.key, required this.uploadMode, required this.expiresAt, this.parts = const []});

  final String id;
  final String bucket;
  final String key;
  final String uploadMode;
  final String expiresAt;
  final List<String> parts;

  factory VideoUploadSession.fromJson(Map<String, dynamic> json) {
    final partRows = json['parts'] is List ? (json['parts'] as List).whereType<Map<String, dynamic>>() : const <Map<String, dynamic>>[];
    return VideoUploadSession(
      id: (json['id'] ?? '').toString(),
      bucket: (json['bucket'] ?? '').toString(),
      key: (json['key'] ?? '').toString(),
      uploadMode: (json['uploadMode'] ?? 'single').toString(),
      expiresAt: (json['expiresAt'] ?? '').toString(),
      parts: partRows.map((part) => (part['signedUrl'] ?? '').toString()).toList(growable: false),
    );
  }
}

class PlaceVideoFeedItem {
  const PlaceVideoFeedItem({
    required this.videoId,
    required this.placeId,
    required this.scope,
    required this.caption,
    required this.videoUrl,
    required this.rating,
    required this.status,
    this.placeName = '',
    this.placeCategory = 'Place',
    this.regionLabel = 'Unknown',
    this.creatorName = 'Creator',
    this.creatorHandle = '@creator',
    this.thumbnailUrl,
    this.coverUrl,
    this.trustTier,
    this.trustBadges = const [],
  });

  final String videoId;
  final String placeId;
  final String placeName;
  final String placeCategory;
  final String regionLabel;
  final FeedScope scope;
  final String creatorName;
  final String creatorHandle;
  final String caption;
  final String videoUrl;
  final String? thumbnailUrl;
  final String? coverUrl;
  final String? trustTier;
  final List<String> trustBadges;
  final int rating;
  final String status;

  factory PlaceVideoFeedItem.fromJson(Map<String, dynamic> json, FeedScope scope) {
    return PlaceVideoFeedItem(
      videoId: (json['videoId'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      placeName: ((json['placeSummary'] is Map ? (json['placeSummary'] as Map)['name'] : null) ?? json['placeName'] ?? '').toString(),
      placeCategory: ((json['placeSummary'] is Map ? (json['placeSummary'] as Map)['category'] : null) ?? json['placeCategory'] ?? 'Place').toString(),
      regionLabel: (json['regionLabel'] ?? ([
        (json['placeSummary'] is Map ? (json['placeSummary'] as Map)['city'] : null),
        (json['placeSummary'] is Map ? (json['placeSummary'] as Map)['region'] : null),
      ].where((e) => e != null && e.toString().isNotEmpty).join(', ')) ?? 'Unknown').toString(),
      scope: scope,
      creatorName: ((json['creatorSummary'] is Map ? (json['creatorSummary'] as Map)['displayName'] : null) ?? json['creatorName'] ?? 'Creator').toString(),
      creatorHandle: ((json['creatorSummary'] is Map ? (json['creatorSummary'] as Map)['handle'] : null) ?? json['creatorHandle'] ?? '@creator').toString(),
      caption: (json['caption'] ?? json['title'] ?? '').toString(),
      videoUrl: (json['playbackUrl'] ?? json['videoUrl'] ?? '').toString(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      coverUrl: json['coverUrl']?.toString(),
      trustTier: (json['trust'] is Map ? (json['trust'] as Map)['trustTier'] : null)?.toString(),
      trustBadges: (json['trust'] is Map && (json['trust'] as Map)['badges'] is List)
          ? ((json['trust'] as Map)['badges'] as List).map((e) => e.toString()).toList(growable: false)
          : const [],
      rating: json['rating'] is num ? (json['rating'] as num).toInt() : 0,
      status: (json['status'] ?? 'draft').toString(),
    );
  }
}

enum PlaceHeroMediaType { video, image, fallback }

class PlaceStreamReview {
  const PlaceStreamReview({
    required this.reviewId,
    required this.videoId,
    required this.creatorName,
    required this.creatorHandle,
    required this.caption,
    required this.rating,
    this.videoUrl,
    this.thumbnailUrl,
    this.coverUrl,
    this.trustTier,
    this.trustBadges = const [],
  });

  final String reviewId;
  final String videoId;
  final String creatorName;
  final String creatorHandle;
  final String caption;
  final String? videoUrl;
  final String? thumbnailUrl;
  final String? coverUrl;
  final String? trustTier;
  final List<String> trustBadges;
  final int rating;
}

class PlaceStreamItem {
  const PlaceStreamItem({
    required this.placeId,
    required this.placeName,
    required this.placeCategory,
    required this.regionLabel,
    required this.scope,
    required this.reviewCount,
    required this.selectedHero,
    this.cityName,
    this.neighborhood,
    this.distanceKm,
    this.socialProof,
    this.heroImageUrl,
    this.heroVideoUrl,
    this.isSaved = false,
    this.isPassed = false,
    this.reviews = const [],
  });

  final String placeId;
  final String placeName;
  final String placeCategory;
  final String regionLabel;
  final String? cityName;
  final String? neighborhood;
  final FeedScope scope;
  final double? distanceKm;
  final String? socialProof;
  final String? heroImageUrl;
  final String? heroVideoUrl;
  final int reviewCount;
  final int selectedHero;
  final bool isSaved;
  final bool isPassed;
  final List<PlaceStreamReview> reviews;

  PlaceHeroMediaType get heroType {
    if ((heroVideoUrl ?? '').isNotEmpty) return PlaceHeroMediaType.video;
    if ((heroImageUrl ?? '').isNotEmpty) return PlaceHeroMediaType.image;
    return PlaceHeroMediaType.fallback;
  }

  PlaceStreamReview? get activeReview => reviews.isEmpty ? null : reviews[selectedHero.clamp(0, reviews.length - 1)];

  PlaceStreamItem copyWith({
    int? selectedHero,
    bool? isSaved,
    bool? isPassed,
    String? socialProof,
  }) {
    return PlaceStreamItem(
      placeId: placeId,
      placeName: placeName,
      placeCategory: placeCategory,
      regionLabel: regionLabel,
      cityName: cityName,
      neighborhood: neighborhood,
      scope: scope,
      distanceKm: distanceKm,
      socialProof: socialProof ?? this.socialProof,
      heroImageUrl: heroImageUrl,
      heroVideoUrl: heroVideoUrl,
      reviewCount: reviewCount,
      selectedHero: selectedHero ?? this.selectedHero,
      isSaved: isSaved ?? this.isSaved,
      isPassed: isPassed ?? this.isPassed,
      reviews: reviews,
    );
  }

  factory PlaceStreamItem.fromFeedItems({
    required String placeId,
    required FeedScope scope,
    required List<PlaceVideoFeedItem> items,
    String? fallbackImageUrl,
  }) {
    final lead = items.first;
    final reviews = items
        .map(
          (item) => PlaceStreamReview(
            reviewId: item.videoId,
            videoId: item.videoId,
            creatorName: item.creatorName,
            creatorHandle: item.creatorHandle,
            caption: item.caption,
            videoUrl: item.videoUrl.isEmpty ? null : item.videoUrl,
            thumbnailUrl: item.thumbnailUrl,
            coverUrl: item.coverUrl,
            trustTier: item.trustTier,
            trustBadges: item.trustBadges,
            rating: item.rating,
          ),
        )
        .toList(growable: false);
    final firstReview = reviews.isEmpty ? null : reviews.first;

    return PlaceStreamItem(
      placeId: placeId,
      placeName: lead.placeName,
      placeCategory: lead.placeCategory,
      regionLabel: lead.regionLabel,
      scope: scope,
      reviewCount: reviews.length,
      selectedHero: 0,
      heroImageUrl: firstReview?.thumbnailUrl ?? firstReview?.coverUrl ?? fallbackImageUrl,
      heroVideoUrl: firstReview?.videoUrl,
      socialProof: reviews.length > 1 ? '${reviews.length} reviews here' : 'Creator review',
      reviews: reviews,
    );
  }
}

class StudioVideo {
  const StudioVideo({
    required this.videoId,
    required this.placeId,
    required this.placeName,
    required this.title,
    required this.status,
    required this.section,
    required this.updatedAt,
    this.caption,
    this.statusLabel,
    this.failureReason,
    this.thumbnailUrl,
    this.isRetryable = false,
    this.uploadProgressState = UploadProgressState.not_started,
    this.processingProgressState = ProcessingProgressState.not_started,
    this.publishReady = false,
    this.publishMissing = const [],
    this.publishedAt,
    this.moderationState,
    this.moderationReason,
  });

  final String videoId;
  final String placeId;
  final String placeName;
  final String title;
  final String? caption;
  final StudioVideoStatus status;
  final StudioSection section;
  final String? statusLabel;
  final String? failureReason;
  final String? thumbnailUrl;
  final bool isRetryable;
  final UploadProgressState uploadProgressState;
  final ProcessingProgressState processingProgressState;
  final bool publishReady;
  final List<String> publishMissing;
  final String updatedAt;
  final String? publishedAt;
  final String? moderationState;
  final String? moderationReason;

  factory StudioVideo.fromJson(Map<String, dynamic> json) {
    final raw = (json['status'] ?? 'draft').toString();
    final status = switch (raw) {
      'draft' => StudioVideoStatus.draft,
      'awaiting_upload' => StudioVideoStatus.awaiting_upload,
      'uploading' || 'upload_received' => StudioVideoStatus.uploaded,
      'processing_queued' || 'processing' || 'processed' || 'moderation_pending' || 'publish_pending' => StudioVideoStatus.processing,
      'published' => StudioVideoStatus.published,
      'failed_upload' || 'failed_processing' => StudioVideoStatus.failed,
      'hidden' => StudioVideoStatus.hidden,
      'rejected' => StudioVideoStatus.rejected,
      'archived' => StudioVideoStatus.archived,
      _ => StudioVideoStatus.draft,
    };
    final rawSection = (json['section'] ?? 'drafts').toString();
    final section = switch (rawSection) {
      'processing' => StudioSection.processing,
      'published' => StudioSection.published,
      'needs_attention' => StudioSection.needsAttention,
      'archived' => StudioSection.archived,
      _ => StudioSection.drafts,
    };
    return StudioVideo(
      videoId: (json['id'] ?? json['videoId'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      placeName: (json['placeName'] ?? json['placeId'] ?? '').toString(),
      title: (json['title'] ?? json['caption'] ?? 'Untitled draft').toString(),
      caption: json['caption']?.toString(),
      status: status,
      section: section,
      statusLabel: json['statusLabel']?.toString(),
      failureReason: json['failureReason']?.toString(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      isRetryable: json['isRetryable'] == true,
      uploadProgressState: _uploadProgressFromRaw((json['uploadProgressState'] ?? 'not_started').toString()),
      processingProgressState: _processingProgressFromRaw((json['processingProgressState'] ?? 'not_started').toString()),
      publishReady: json['publishReadiness'] is Map && (json['publishReadiness'] as Map)['ready'] == true,
      publishMissing: json['publishReadiness'] is Map && (json['publishReadiness'] as Map)['missing'] is List
          ? ((json['publishReadiness'] as Map)['missing'] as List).map((item) => item.toString()).toList(growable: false)
          : const [],
      updatedAt: (json['updatedAt'] ?? '').toString(),
      publishedAt: json['publishedAt']?.toString(),
      moderationState: json['moderationState']?.toString(),
      moderationReason: json['moderationReason']?.toString(),
    );
  }

  static UploadProgressState _uploadProgressFromRaw(String raw) {
    return switch (raw) {
      'in_progress' => UploadProgressState.in_progress,
      'completed' => UploadProgressState.completed,
      'failed' => UploadProgressState.failed,
      _ => UploadProgressState.not_started,
    };
  }

  static ProcessingProgressState _processingProgressFromRaw(String raw) {
    return switch (raw) {
      'queued' => ProcessingProgressState.queued,
      'in_progress' => ProcessingProgressState.in_progress,
      'completed' => ProcessingProgressState.completed,
      'failed' => ProcessingProgressState.failed,
      _ => ProcessingProgressState.not_started,
    };
  }
}

class StudioAnalyticsOverview {
  const StudioAnalyticsOverview({
    required this.totalVideosPublished,
    required this.totalViews,
    required this.statusCounts,
    required this.topPlaces,
  });

  final int totalVideosPublished;
  final int totalViews;
  final Map<String, int> statusCounts;
  final List<Map<String, dynamic>> topPlaces;

  factory StudioAnalyticsOverview.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] is Map<String, dynamic> ? json['summary'] as Map<String, dynamic> : const <String, dynamic>{};
    final status = json['statusCounts'] is Map<String, dynamic> ? json['statusCounts'] as Map<String, dynamic> : const <String, dynamic>{};
    final topPlaces = json['topPlaces'] is List ? (json['topPlaces'] as List).whereType<Map<String, dynamic>>().toList(growable: false) : const <Map<String, dynamic>>[];
    return StudioAnalyticsOverview(
      totalVideosPublished: summary['totalVideosPublished'] is num ? (summary['totalVideosPublished'] as num).toInt() : 0,
      totalViews: summary['totalViews'] is num ? (summary['totalViews'] as num).toInt() : 0,
      statusCounts: status.map((key, value) => MapEntry(key, value is num ? value.toInt() : 0)),
      topPlaces: topPlaces,
    );
  }
}

class MapDiscoveryPlace {
  const MapDiscoveryPlace({
    required this.placeId,
    required this.name,
    required this.category,
    required this.latitude,
    required this.longitude,
    required this.rating,
    this.city,
    this.region,
    this.neighborhood,
    this.distanceMeters,
    this.thumbnailUrl,
    this.descriptionSnippet,
    this.openNow,
    this.reviewCount = 0,
    this.creatorVideoCount = 0,
  });

  final String placeId;
  final String name;
  final String category;
  final String? city;
  final String? region;
  final String? neighborhood;
  final double latitude;
  final double longitude;
  final double rating;
  final double? distanceMeters;
  final String? thumbnailUrl;
  final String? descriptionSnippet;
  final bool? openNow;
  final int reviewCount;
  final int creatorVideoCount;

  factory MapDiscoveryPlace.fromJson(Map<String, dynamic> json) {
    return MapDiscoveryPlace(
      placeId: (json['canonicalPlaceId'] ?? json['placeId'] ?? '').toString(),
      name: (json['name'] ?? json['displayName'] ?? '').toString(),
      category: (json['category'] ?? 'place').toString(),
      city: json['city']?.toString(),
      region: json['region']?.toString(),
      neighborhood: json['neighborhood']?.toString(),
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      descriptionSnippet: json['descriptionSnippet']?.toString(),
      openNow: json['openNow'] as bool?,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      creatorVideoCount: (json['creatorVideoCount'] as num?)?.toInt() ?? 0,
    );
  }
}
