import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../api/models.dart';

class LiveResultsRepository {
  LiveResultsRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<LiveResultsResponse> fetchLiveResults() async {
    final decoded = await apiClient.getDecoded(ApiEndpoints.liveResults);
    if (decoded is! Map<String, dynamic>) {
      throw FormatException(
        'Parse error: expected object but got ${decoded.runtimeType}',
      );
    }
    return LiveResultsResponse.fromJson(decoded);
  }
}
