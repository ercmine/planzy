import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class TelemetryQueueStore {
  TelemetryQueueStore({required this.sharedPreferences});

  static const String storageKey = 'telemetry_queue_v1';

  final SharedPreferences sharedPreferences;

  Future<void> enqueue(String sessionId, Map<String, dynamic> eventJson) async {
    final state = _readState();
    final sessionBucket =
        state.putIfAbsent(sessionId, () => <Map<String, dynamic>>[]);

    sessionBucket.add(<String, dynamic>{
      'queuedAtMs': DateTime.now().millisecondsSinceEpoch,
      'event': _sanitizeMap(eventJson),
    });

    await _writeState(state);
  }

  Future<List<Map<String, dynamic>>> peekBatch(String sessionId, int max) async {
    final state = _readState();
    final sessionBucket = state[sessionId];
    if (sessionBucket == null || sessionBucket.isEmpty || max <= 0) {
      return const <Map<String, dynamic>>[];
    }

    return sessionBucket
        .take(max)
        .map((entry) => Map<String, dynamic>.from(entry['event'] as Map<String, dynamic>))
        .toList(growable: false);
  }

  Future<void> removeBatch(String sessionId, int count) async {
    if (count <= 0) {
      return;
    }

    final state = _readState();
    final sessionBucket = state[sessionId];
    if (sessionBucket == null || sessionBucket.isEmpty) {
      return;
    }

    final removeCount = count > sessionBucket.length ? sessionBucket.length : count;
    sessionBucket.removeRange(0, removeCount);

    if (sessionBucket.isEmpty) {
      state.remove(sessionId);
    }

    await _writeState(state);
  }

  Future<int> size(String sessionId) async {
    final state = _readState();
    return state[sessionId]?.length ?? 0;
  }

  Future<List<String>> sessionIdsWithQueuedEvents() async {
    final state = _readState();
    return state.entries
        .where((entry) => entry.value.isNotEmpty)
        .map((entry) => entry.key)
        .toList(growable: false);
  }

  Future<void> pruneOld({
    int maxEventsPerSession = 2000,
    int maxAgeDays = 7,
  }) async {
    final state = _readState();
    final cutoff = DateTime.now()
        .subtract(Duration(days: maxAgeDays))
        .millisecondsSinceEpoch;

    for (final sessionId in state.keys.toList(growable: false)) {
      final bucket = state[sessionId]!;
      bucket.removeWhere((entry) {
        final queuedAtMs = entry['queuedAtMs'];
        return queuedAtMs is int && queuedAtMs < cutoff;
      });

      if (bucket.length > maxEventsPerSession) {
        final keepFrom = bucket.length - maxEventsPerSession;
        state[sessionId] = bucket.sublist(keepFrom);
      }

      if (state[sessionId]!.isEmpty) {
        state.remove(sessionId);
      }
    }

    await _writeState(state);
  }

  Map<String, List<Map<String, dynamic>>> _readState() {
    final raw = sharedPreferences.getString(storageKey);
    if (raw == null || raw.isEmpty) {
      return <String, List<Map<String, dynamic>>>{};
    }

    dynamic decoded;
    try {
      decoded = jsonDecode(raw);
    } catch (_) {
      return <String, List<Map<String, dynamic>>>{};
    }

    if (decoded is! Map<String, dynamic>) {
      return <String, List<Map<String, dynamic>>>{};
    }

    final result = <String, List<Map<String, dynamic>>>{};

    for (final entry in decoded.entries) {
      final sessionId = entry.key;
      final value = entry.value;
      if (value is! List) {
        continue;
      }

      final parsedBucket = <Map<String, dynamic>>[];
      for (final item in value) {
        if (item is! Map) {
          continue;
        }

        final mapped = Map<String, dynamic>.from(item as Map);
        final event = mapped['event'];
        if (event is! Map) {
          continue;
        }

        parsedBucket.add(<String, dynamic>{
          'queuedAtMs': mapped['queuedAtMs'] is int
              ? mapped['queuedAtMs'] as int
              : DateTime.now().millisecondsSinceEpoch,
          'event': _sanitizeMap(Map<String, dynamic>.from(event as Map)),
        });
      }

      if (parsedBucket.isNotEmpty) {
        result[sessionId] = parsedBucket;
      }
    }

    return result;
  }

  Future<void> _writeState(Map<String, List<Map<String, dynamic>>> state) async {
    await sharedPreferences.setString(storageKey, jsonEncode(state));
  }

  static Map<String, dynamic> _sanitizeMap(Map<String, dynamic> source) {
    final sanitized = <String, dynamic>{};
    for (final entry in source.entries) {
      sanitized[entry.key] = _sanitizeValue(entry.value);
    }
    return sanitized;
  }

  static dynamic _sanitizeValue(dynamic value) {
    if (value == null || value is String || value is num || value is bool) {
      return value;
    }

    if (value is Map) {
      return _sanitizeMap(Map<String, dynamic>.from(value));
    }

    if (value is List) {
      return value.map(_sanitizeValue).toList(growable: false);
    }

    return value.toString();
  }
}
