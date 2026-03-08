class PlaceReviewVideoAuthor {
  PlaceReviewVideoAuthor({
    required this.profileId,
    required this.profileType,
    required this.displayName,
    this.handle,
    this.avatarUrl,
  });

  final String profileId;
  final String profileType;
  final String displayName;
  final String? handle;
  final String? avatarUrl;

  factory PlaceReviewVideoAuthor.fromJson(Map<String, dynamic> json) {
    return PlaceReviewVideoAuthor(
      profileId: (json['profileId'] ?? '').toString(),
      profileType: (json['profileType'] ?? 'PERSONAL').toString(),
      displayName: (json['displayName'] ?? '').toString(),
      handle: json['handle']?.toString(),
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }
}

class PlaceReviewVideo {
  PlaceReviewVideo({
    required this.id,
    required this.reviewId,
    required this.placeId,
    required this.playbackUrl,
    required this.author,
    required this.createdAt,
    required this.labels,
    required this.badges,
    required this.helpfulCount,
    this.thumbnailUrl,
    this.posterUrl,
    this.durationMs,
    this.title,
    this.caption,
  });

  final String id;
  final String reviewId;
  final String placeId;
  final String playbackUrl;
  final String? thumbnailUrl;
  final String? posterUrl;
  final int? durationMs;
  final String? title;
  final String? caption;
  final DateTime createdAt;
  final PlaceReviewVideoAuthor author;
  final List<String> labels;
  final List<String> badges;
  final int helpfulCount;

  factory PlaceReviewVideo.fromJson(Map<String, dynamic> json) {
    return PlaceReviewVideo(
      id: (json['id'] ?? '').toString(),
      reviewId: (json['reviewId'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      playbackUrl: (json['playbackUrl'] ?? '').toString(),
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      posterUrl: json['posterUrl']?.toString(),
      durationMs: json['durationMs'] is num ? (json['durationMs'] as num).toInt() : null,
      title: json['title']?.toString(),
      caption: json['caption']?.toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0),
      author: PlaceReviewVideoAuthor.fromJson(
        (json['author'] is Map<String, dynamic> ? json['author'] : <String, dynamic>{}) as Map<String, dynamic>,
      ),
      labels: (json['labels'] as List?)?.map((item) => item.toString()).toList(growable: false) ?? const <String>[],
      badges: (json['badges'] as List?)?.map((item) => item.toString()).toList(growable: false) ?? const <String>[],
      helpfulCount: json['helpfulCount'] is num ? (json['helpfulCount'] as num).toInt() : 0,
    );
  }

  String get previewUrl => thumbnailUrl ?? posterUrl ?? '';
}

class PlaceReviewVideoSection {
  PlaceReviewVideoSection({
    required this.placeId,
    required this.videos,
    required this.totalVisibleVideos,
    this.featuredVideo,
    this.nextCursor,
  });

  final String placeId;
  final PlaceReviewVideo? featuredVideo;
  final List<PlaceReviewVideo> videos;
  final String? nextCursor;
  final int totalVisibleVideos;

  factory PlaceReviewVideoSection.fromJson(Map<String, dynamic> json) {
    final featuredRaw = json['featuredVideo'];
    final videosRaw = json['videos'];
    return PlaceReviewVideoSection(
      placeId: (json['placeId'] ?? '').toString(),
      featuredVideo: featuredRaw is Map<String, dynamic> ? PlaceReviewVideo.fromJson(featuredRaw) : null,
      videos: videosRaw is List
          ? videosRaw.whereType<Map<String, dynamic>>().map(PlaceReviewVideo.fromJson).toList(growable: false)
          : const <PlaceReviewVideo>[],
      nextCursor: json['nextCursor']?.toString(),
      totalVisibleVideos: json['totalVisibleVideos'] is num ? (json['totalVisibleVideos'] as num).toInt() : 0,
    );
  }
}
