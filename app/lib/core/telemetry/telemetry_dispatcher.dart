import 'dart:async';

import 'package:flutter/widgets.dart';

import '../../core/logging/log.dart';
import '../../repositories/telemetry_repository.dart';
import 'telemetry_backoff.dart';

class TelemetryDispatcher with WidgetsBindingObserver {
  TelemetryDispatcher({
    required TelemetryRepository telemetryRepository,
    TelemetryBackoff? backoff,
    Duration flushInterval = const Duration(seconds: 15),
    this.flushThreshold = 25,
  })  : _telemetryRepository = telemetryRepository,
        _backoff = backoff ?? TelemetryBackoff(),
        _flushInterval = flushInterval;

  final TelemetryRepository _telemetryRepository;
  final TelemetryBackoff _backoff;
  final Duration _flushInterval;
  final int flushThreshold;

  Timer? _intervalTimer;
  Timer? _retryTimer;
  String? _activeSessionId;
  bool _isFlushing = false;
  int _attempt = 0;

  void start() {
    _intervalTimer ??= Timer.periodic(_flushInterval, (_) {
      flush();
    });
  }

  void stop() {
    _intervalTimer?.cancel();
    _intervalTimer = null;
    _retryTimer?.cancel();
    _retryTimer = null;
  }

  void dispose() {
    stop();
  }

  void setActiveSession(String sessionId) {
    _activeSessionId = sessionId;
    _flushIfThresholdReached(sessionId);
  }

  void clearActiveSession() {
    _activeSessionId = null;
  }

  Future<void> flush({bool includeAllSessions = false}) async {
    if (_isFlushing) {
      return;
    }

    _isFlushing = true;
    try {
      if (includeAllSessions) {
        await _telemetryRepository.flushAllActive();
      } else if (_activeSessionId != null) {
        await _telemetryRepository.flushSession(_activeSessionId!);
      }
      _attempt = 0;
      _retryTimer?.cancel();
      _retryTimer = null;
    } catch (error, stackTrace) {
      Log.warn('Telemetry flush failed: $error');
      Log.error('Telemetry flush stack', error: error, stackTrace: stackTrace);
      _scheduleRetry();
    } finally {
      _isFlushing = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      flush(includeAllSessions: true);
    }
  }

  Future<void> notifyEventQueued(String sessionId) async {
    if (_activeSessionId == null) {
      _activeSessionId = sessionId;
    }
    await _flushIfThresholdReached(sessionId);
  }

  Future<void> _flushIfThresholdReached(String sessionId) async {
    final size = await _telemetryRepository.queueSize(sessionId);
    if (size >= flushThreshold) {
      await flush();
    }
  }

  void _scheduleRetry() {
    _retryTimer?.cancel();
    final delay = _backoff.nextDelay(_attempt);
    _attempt += 1;
    _retryTimer = Timer(delay, () {
      flush(includeAllSessions: true);
    });
  }
}
