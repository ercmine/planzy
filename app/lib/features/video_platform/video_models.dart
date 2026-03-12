enum FeedScope { local, regional, global }

enum StudioVideoStatus { draft, awaiting_upload, uploaded, processing, published, failed, hidden, rejected, archived }

enum StudioSection { drafts, processing, published, needsAttention, archived }

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

class StudioVideo {
  const StudioVideo({
    required this.videoId,
    required this.placeId,
    required this.placeName,
    required this.title,
    required this.status,
    required this.section,
    this.moderationState,
    this.moderationReason,
  });

  final String videoId;
  final String placeId;
  final String placeName;
  final String title;
  final StudioVideoStatus status;
  final StudioSection section;
  final String? moderationState;
  final String? moderationReason;

  factory StudioVideo.fromJson(Map<String, dynamic> json) {
    final raw = (json['status'] ?? 'draft').toString();
    final status = StudioVideoStatus.values.firstWhere(
      (item) => item.name == raw,
      orElse: () => StudioVideoStatus.draft,
    );
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
      status: status,
      section: section,
      moderationState: json['moderationState']?.toString(),
      moderationReason: json['moderationReason']?.toString(),
    );
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
