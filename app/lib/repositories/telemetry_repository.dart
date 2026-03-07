import '../api/api_client.dart';
import '../api/api_error.dart';
import '../api/endpoints.dart';
import '../core/telemetry/telemetry_queue_store.dart';
import '../models/telemetry.dart';

class TelemetryRepository {
  TelemetryRepository({
    required this.apiClient,
    required this.queueStore,
    DateTime Function()? now,
    this.maxBatchSize = 50,
  }) : _now = now ?? DateTime.now;

  final ApiClient apiClient;
  final TelemetryQueueStore queueStore;
  final DateTime Function() _now;
  final int maxBatchSize;

  Future<void> enqueueEvent(String sessionId, TelemetryEventInput event) async {
    final json = event.toJson();
    json['clientAtISO'] ??= _now().toUtc().toIso8601String();

    await queueStore.enqueue(sessionId, json);
    await queueStore.pruneOld();
  }

  Future<int> queueSize(String sessionId) {
    return queueStore.size(sessionId);
  }

  Future<void> flushSession(String sessionId) async {
    while (true) {
      final batchJson = await queueStore.peekBatch(sessionId, maxBatchSize);
      if (batchJson.isEmpty) {
        return;
      }

      final batch =
          batchJson.map(TelemetryEventInput.fromJson).toList(growable: false);

      try {
        await apiClient.postJson(
          ApiEndpoints.telemetry(sessionId),
          body: TelemetryBatchRequest(events: batch).toJson(),
        );
        await queueStore.removeBatch(sessionId, batch.length);
      } on ApiError catch (error) {
        if (_isNonRetryable(error)) {
          await queueStore.removeBatch(sessionId, batch.length);
          continue;
        }
        rethrow;
      }
    }
  }

  Future<void> flushAllActive({List<String>? sessionIds}) async {
    final ids = sessionIds ?? await queueStore.sessionIdsWithQueuedEvents();
    for (final sessionId in ids) {
      await flushSession(sessionId);
    }
  }

  bool _isNonRetryable(ApiError error) {
    final statusCode = error.statusCode;
    if (statusCode == null) {
      return false;
    }

    return statusCode == 400 ||
        statusCode == 401 ||
        statusCode == 403 ||
        statusCode == 404;
  }
}
