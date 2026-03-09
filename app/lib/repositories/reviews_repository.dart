import '../api/api_client.dart';
import '../models/place_review.dart';
import '../models/place_review_video.dart';

class ReviewsRepository {
  ReviewsRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<PlaceReview>> fetchForPlace(String placeId, {String sort = 'most_helpful'}) async {
    final response = await apiClient.getJson(
      '/places/$placeId/reviews',
      queryParameters: <String, String>{'sort': sort},
    );
    final items = response['reviews'];
    if (items is! List) {
      return const <PlaceReview>[];
    }
    return items.whereType<Map<String, dynamic>>().map(PlaceReview.fromJson).toList(growable: false);
  }



  Future<PlaceReviewVideoSection> fetchVideoSection(
    String placeId, {
    String filter = 'all',
    String? cursor,
    int limit = 12,
  }) async {
    final response = await apiClient.getJson(
      '/places/$placeId/review-videos',
      queryParameters: <String, String?>{
        'filter': filter,
        'cursor': cursor,
        'limit': '$limit',
      },
    );
    return PlaceReviewVideoSection.fromJson(response);
  }
  Future<PlaceReview> createReview({
    required String placeId,
    int? rating,
    required String body,
    required String displayName,
  }) async {
    final response = await apiClient.postJson(
      '/places/$placeId/reviews',
      body: {
        'rating': rating,
        'body': body,
        'displayName': displayName,
      },
    );
    final review = response['review'];
    if (review is Map<String, dynamic>) {
      return PlaceReview.fromJson(review);
    }
    throw const FormatException('Invalid review response payload');
  }

  Future<PlaceReview> updateReview({required String placeId, required String reviewId, required String body, int? rating}) async {
    final response = await apiClient.patchJson('/places/$placeId/reviews/$reviewId', body: {'body': body, 'rating': rating});
    final review = response['review'];
    if (review is Map<String, dynamic>) return PlaceReview.fromJson(review);
    throw const FormatException('Invalid review response payload');
  }

  Future<void> voteHelpful(String reviewId) => apiClient.postJson('/reviews/$reviewId/helpful', body: const {});
  Future<void> unvoteHelpful(String reviewId) => apiClient.deleteJson('/reviews/$reviewId/helpful');

  Future<void> createBusinessReply(String reviewId, String body) =>
      apiClient.postJson('/reviews/$reviewId/business-reply', body: {'body': body});
}
