import '../api/api_client.dart';
import '../models/place_review.dart';

class ReviewsRepository {
  ReviewsRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<PlaceReview>> fetchForPlace(String placeId) async {
    final response = await apiClient.getJson('/places/$placeId/reviews');
    final items = response['reviews'];
    if (items is! List) {
      return const <PlaceReview>[];
    }
    return items
        .whereType<Map<String, dynamic>>()
        .map(PlaceReview.fromJson)
        .toList(growable: false);
  }

  Future<PlaceReview> createReview({
    required String placeId,
    required int rating,
    required String text,
    required String displayName,
    required bool anonymous,
  }) async {
    final response = await apiClient.postJson(
      '/places/$placeId/reviews',
      body: {
        'rating': rating,
        'text': text,
        'displayName': displayName,
        'anonymous': anonymous,
      },
    );
    final review = response['review'];
    if (review is Map<String, dynamic>) {
      return PlaceReview.fromJson(review);
    }
    throw const FormatException('Invalid review response payload');
  }
}
