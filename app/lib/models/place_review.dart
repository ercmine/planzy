import '../core/json_parsers.dart';

class PlaceReview {
  PlaceReview({
    required this.id,
    required this.placeId,
    required this.userId,
    required this.displayName,
    required this.rating,
    required this.text,
    required this.createdAt,
    required this.anonymous,
  });

  final String id;
  final String placeId;
  final String userId;
  final String displayName;
  final int rating;
  final String text;
  final DateTime createdAt;
  final bool anonymous;

  factory PlaceReview.fromJson(Map<String, dynamic> json) {
    return PlaceReview(
      id: (json['id'] ?? '').toString(),
      placeId: (json['placeId'] ?? '').toString(),
      userId: (json['userId'] ?? '').toString(),
      displayName: (json['displayName'] ?? '').toString(),
      rating: parseInt(json['rating']) ?? 0,
      text: (json['text'] ?? '').toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0),
      anonymous: json['anonymous'] == true,
    );
  }
}
