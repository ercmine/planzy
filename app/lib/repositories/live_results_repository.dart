import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../api/models.dart';

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
          'lat': lat.toString(),
          'lng': lng.toString(),
        },
      );
      if (decoded is! Map<String, dynamic>) {
        throw FormatException(
          'Parse error: expected object but got ${decoded.runtimeType}',
        );
      }
      final response = LiveResultsResponse.fromJson(decoded);
      if (response.results.isEmpty && kDebugMode) {
        return _debugFallback();
      }
      return response;
    } catch (_) {
      if (kDebugMode) {
        return _debugFallback();
      }
      rethrow;
    }
  }

  LiveResultsResponse _debugFallback() {
    return LiveResultsResponse(
      results: [
        LiveResultItem(
          sessionId: 'debug-fallback',
          topPlanId: 'debug-fallback-1',
          topPlanTitle: 'Fallback result',
          score: 0.6,
        ),
      ],
      summary: LiveResultsSummary(
        activeSessions: 1,
        generatedAt: DateTime.now().toUtc().toIso8601String(),
      ),
    );
  }
}
