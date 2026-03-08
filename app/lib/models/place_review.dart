import '../core/json_parsers.dart';

class ReviewAuthor {
  ReviewAuthor({
    required this.displayName,
    required this.profileType,
    required this.profileId,
    this.userId,
    this.handle,
    this.avatarUrl,
  });

  final String displayName;
  final String profileType;
  final String profileId;
  final String? userId;
  final String? handle;
  final String? avatarUrl;

  factory ReviewAuthor.fromJson(Map<String, dynamic> json) {
    return ReviewAuthor(
      displayName: (json['displayName'] ?? '').toString(),
      profileType: (json['profileType'] ?? 'PERSONAL').toString(),
      profileId: (json['profileId'] ?? '').toString(),
      userId: json['userId']?.toString(),
      handle: json['handle']?.toString(),
      avatarUrl: json['avatarUrl']?.toString(),
    );
  }
}

class BusinessReply {
  BusinessReply({
    required this.id,
    required this.businessProfileId,
    required this.body,
    required this.createdAt,
    this.editedAt,
  });

  final String id;
  final String businessProfileId;
  final String body;
  final DateTime createdAt;
  final DateTime? editedAt;

  factory BusinessReply.fromJson(Map<String, dynamic> json) {
    return BusinessReply(
      id: (json['id'] ?? '').toString(),
      businessProfileId: (json['businessProfileId'] ?? '').toString(),
      body: (json['body'] ?? '').toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0),
      editedAt: DateTime.tryParse((json['editedAt'] ?? '').toString()),
    );
  }
}

class PlaceReview {
  PlaceReview({
    required this.id,
    required this.placeId,
    required this.author,
    required this.body,
    required this.createdAt,
    required this.moderationState,
    required this.helpfulCount,
    required this.viewerHasHelpfulVote,
    required this.canEdit,
    this.rating,
    this.editedAt,
    this.editWindowEndsAt,
    this.businessReply,
  });

  final String id;
  final String placeId;
  final ReviewAuthor author;
  final String body;
  final int? rating;
  final DateTime createdAt;
  final DateTime? editedAt;
  final DateTime? editWindowEndsAt;
  final String moderationState;
  final int helpfulCount;
  final bool viewerHasHelpfulVote;
  final bool canEdit;
  final BusinessReply? businessReply;

  factory PlaceReview.fromJson(Map<String, dynamic> json) {
    return PlaceReview(
      id: (json['id'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      author: ReviewAuthor.fromJson((json['author'] is Map<String, dynamic> ? json['author'] : <String, dynamic>{}) as Map<String, dynamic>),
      body: (json['body'] ?? json['text'] ?? '').toString(),
      rating: parseInt(json['rating']),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0),
      editedAt: DateTime.tryParse((json['editedAt'] ?? '').toString()),
      editWindowEndsAt: DateTime.tryParse((json['editWindowEndsAt'] ?? '').toString()),
      moderationState: (json['moderationState'] ?? 'published').toString(),
      helpfulCount: parseInt(json['helpfulCount']) ?? 0,
      viewerHasHelpfulVote: json['viewerHasHelpfulVote'] == true,
      canEdit: json['canEdit'] == true,
      businessReply: json['businessReply'] is Map<String, dynamic>
          ? BusinessReply.fromJson(json['businessReply'] as Map<String, dynamic>)
          : null,
    );
  }
}
