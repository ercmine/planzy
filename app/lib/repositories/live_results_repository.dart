import '../api/api_client.dart';
import '../api/api_error.dart';
import '../api/endpoints.dart';
import '../api/models.dart';
import '../core/logging/log.dart';

class LiveResultsRepository {
  LiveResultsRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<LiveResultsResponse> fetchLiveResults({
    required double lat,
    required double lng,
  }) async {
    try {
      final decoded = await apiClient.getDecoded(
        ApiEndpoints.liveResults,
        queryParameters: <String, String?>{
          'lat': lat.toStringAsFixed(6),
          'lng': lng.toStringAsFixed(6),
        },
      );
      if (decoded is! Map<String, dynamic>) {
        throw ApiError.decoding(
          'Parse error: expected object but got ${decoded.runtimeType}',
          details: decoded,
        );
      }
      final response = LiveResultsResponse.fromJson(decoded);
      Log.info(
        '/live-results status=${apiClient.lastLiveResultsStatus ?? '-'} '
        'bodySnippet="${apiClient.lastLiveResultsBodySnippet ?? '-'}" '
        'parsedCount=${response.results.length} fallbackUsed=false reason=none',
      );
      return response;
    } on ApiError catch (error) {
      Log.warn(
        '/live-results status=${apiClient.lastLiveResultsStatus ?? '-'} '
        'bodySnippet="${apiClient.lastLiveResultsBodySnippet ?? '-'}" '
        'fallbackUsed=false errorKind=${error.kind}',
      );
      rethrow;
    }
  }
}
