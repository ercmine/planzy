import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../models/telemetry.dart';

class TelemetryRepository {
  TelemetryRepository({required this.apiClient, this.maxBatchSize = 50});

  final ApiClient apiClient;
  final int maxBatchSize;
  final Map<String, List<TelemetryEventInput>> _queueBySession =
      <String, List<TelemetryEventInput>>{};

  void enqueue(String sessionId, TelemetryEventInput event) {
    _queueBySession.putIfAbsent(sessionId, () => <TelemetryEventInput>[]).add(event);
  }

  Future<void> flush(String sessionId) async {
    final queue = _queueBySession[sessionId];
    if (queue == null || queue.isEmpty) {
      return;
    }

    while (queue.isNotEmpty) {
      final takeCount = queue.length >= maxBatchSize ? maxBatchSize : queue.length;
      final batch = queue.take(takeCount).toList(growable: false);

      try {
        await apiClient.postJson(
          ApiEndpoints.telemetry(sessionId),
          body: TelemetryBatchRequest(events: batch).toJson(),
        );
        queue.removeRange(0, takeCount);
      } catch (_) {
        return;
      }
    }

    _queueBySession.remove(sessionId);
  }

  Future<void> flushAll() async {
    final sessions = _queueBySession.keys.toList(growable: false);
    for (final sessionId in sessions) {
      await flush(sessionId);
    }
  }
}
