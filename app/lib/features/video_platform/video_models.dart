enum FeedScope { local, regional, global }

enum StudioVideoStatus { draft, awaiting_upload, uploaded, processing, published, failed, hidden, rejected, archived }

class PlaceSearchResult {
  const PlaceSearchResult({
    required this.placeId,
    required this.name,
    required this.category,
    required this.regionLabel,
    this.distanceKm,
  });

  final String placeId;
  final String name;
  final String category;
  final String regionLabel;
  final double? distanceKm;

  factory PlaceSearchResult.fromJson(Map<String, dynamic> json) {
    return PlaceSearchResult(
      placeId: (json['placeId'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      category: (json['category'] ?? 'Place').toString(),
      regionLabel: (json['regionLabel'] ?? '').toString(),
      distanceKm: json['distanceKm'] is num ? (json['distanceKm'] as num).toDouble() : null,
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
  final int rating;
  final String status;

  factory PlaceVideoFeedItem.fromJson(Map<String, dynamic> json, FeedScope scope) {
    return PlaceVideoFeedItem(
      videoId: (json['videoId'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      placeName: (json['placeName'] ?? '').toString(),
      placeCategory: (json['placeCategory'] ?? 'Place').toString(),
      regionLabel: (json['regionLabel'] ?? 'Unknown').toString(),
      scope: scope,
      creatorName: (json['creatorName'] ?? 'Creator').toString(),
      creatorHandle: (json['creatorHandle'] ?? '@creator').toString(),
      caption: (json['caption'] ?? json['title'] ?? '').toString(),
      videoUrl: (json['playbackUrl'] ?? json['videoUrl'] ?? '').toString(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      coverUrl: json['coverUrl']?.toString(),
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
  });

  final String videoId;
  final String placeId;
  final String placeName;
  final String title;
  final StudioVideoStatus status;

  factory StudioVideo.fromJson(Map<String, dynamic> json) {
    final raw = (json['status'] ?? 'draft').toString();
    final status = StudioVideoStatus.values.firstWhere(
      (item) => item.name == raw,
      orElse: () => StudioVideoStatus.draft,
    );
    return StudioVideo(
      videoId: (json['id'] ?? json['videoId'] ?? '').toString(),
      placeId: (json['canonicalPlaceId'] ?? json['placeId'] ?? '').toString(),
      placeName: (json['placeName'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      status: status,
    );
  }
}
