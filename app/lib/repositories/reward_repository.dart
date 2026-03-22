import '../api/api_client.dart';
import '../models/reward_dashboard.dart';

class RewardRepository {
  RewardRepository({required this.apiClient});
  final ApiClient apiClient;

  Future<RewardDashboard> fetchDashboard() async {
    final response = await apiClient.getJson('/v1/creator/rewards/dashboard');
    return RewardDashboard.fromJson(response);
  }

  Future<Map<String, dynamic>> fetchPlacePreview(String placeId) {
    return apiClient.getJson('/v1/places/$placeId/reward-preview');
  }
}
