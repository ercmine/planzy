import '../api/api_client.dart';
import '../models/reward_dashboard.dart';

class RewardRepository {
  RewardRepository({required this.apiClient});
  final ApiClient apiClient;

  Future<RewardDashboard> fetchDashboard() async {
    final response = await apiClient.getJson('/v1/dryad/rewards/me');
    return RewardDashboard.fromJson(response);
  }

  Future<Map<String, dynamic>> fetchPlacePreview(String placeId) {
    return apiClient.getJson('/v1/dryad/rewards/places/$placeId/next');
  }

  Future<List<Map<String, dynamic>>> fetchWallets() async {
    final response = await apiClient.getJson('/v1/wallets');
    return ((response['wallets'] as List?) ?? const []).whereType<Map<String, dynamic>>().toList(growable: false);
  }
}
