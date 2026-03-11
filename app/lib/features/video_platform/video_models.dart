enum FeedScope { local, regional, global }

enum StudioVideoStatus { draft, uploading, processing, published, failed, moderated }

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

class PlaceVideoFeedItem {
  const PlaceVideoFeedItem({
    required this.videoId,
    required this.placeId,
    required this.placeName,
    required this.placeCategory,
    required this.regionLabel,
    required this.scope,
    required this.creatorName,
    required this.creatorHandle,
    required this.caption,
    required this.videoUrl,
    required this.rating,
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
  final int rating;

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
      caption: (json['caption'] ?? '').toString(),
      videoUrl: (json['videoUrl'] ?? '').toString(),
      rating: json['rating'] is num ? (json['rating'] as num).toInt() : 0,
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
      videoId: (json['videoId'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      placeName: (json['placeName'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      status: status,
    );
  }
}
