import '../../api/api_client.dart';
import 'viewer_reward_models.dart';

class ViewerRewardRepository {
  const ViewerRewardRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<ViewerRewardVideoStatus> fetchVideoStatus(String videoId) async {
    final response = await apiClient.getJson('/v1/viewer-rewards/videos/$videoId/status');
    return ViewerRewardVideoStatus.fromJson(response);
  }

  Future<ViewerRewardVideoStatus> submitWatchProgress({required String videoId, required int secondsWatched}) async {
    final response = await apiClient.postJson('/v1/viewer-rewards/videos/$videoId/watch-progress', body: {'secondsWatched': secondsWatched});
    return ViewerRewardVideoStatus.fromJson(response);
  }

  Future<ViewerRewardVideoStatus> submitRatingReward({required String videoId, required int rating}) async {
    final response = await apiClient.postJson('/v1/viewer-rewards/videos/$videoId/rating', body: {'rating': rating});
    return ViewerRewardVideoStatus.fromJson(response);
  }

  Future<ViewerRewardVideoStatus> notifyCommentSubmitted({required String videoId, required int commentLength}) async {
    final response = await apiClient.postJson('/v1/viewer-rewards/videos/$videoId/comment', body: {'commentLength': commentLength});
    return ViewerRewardVideoStatus.fromJson(response);
  }

  Future<ViewerRewardSummary> fetchSummary() async {
    final response = await apiClient.getJson('/v1/viewer-rewards/me/summary');
    return ViewerRewardSummary.fromJson(response);
  }

  Future<List<ViewerRewardHistoryItem>> fetchHistory() async {
    final response = await apiClient.getJson('/v1/viewer-rewards/me/history');
    final items = response['items'];
    if (items is! List) return const [];
    return items.whereType<Map<String, dynamic>>().map(ViewerRewardHistoryItem.fromJson).toList(growable: false);
  }
}
