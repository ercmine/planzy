import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_error.dart';
import '../core/platform/perbug_platform.dart';
import '../providers/app_providers.dart';

enum StartupStage {
  initializing,
  checkingRequiredServices,
  requiredReady,
  degradedOptionalFailure,
  startupFailedHard,
  startupReadyDemo,
  startupReadyFull,
}

enum StartupDependencyTier { required, optional }

class StartupCheckResult {
  const StartupCheckResult({
    required this.key,
    required this.label,
    required this.tier,
    required this.ok,
    this.message,
    this.error,
    this.stackTrace,
  });

  final String key;
  final String label;
  final StartupDependencyTier tier;
  final bool ok;
  final String? message;
  final Object? error;
  final StackTrace? stackTrace;
}

class StartupHealthState {
  const StartupHealthState({
    required this.stage,
    required this.checks,
    required this.startedAt,
    this.completedAt,
    this.userMessage,
  });

  factory StartupHealthState.initial() => StartupHealthState(
        stage: StartupStage.initializing,
        checks: const [],
        startedAt: DateTime.now(),
      );

  final StartupStage stage;
  final List<StartupCheckResult> checks;
  final DateTime startedAt;
  final DateTime? completedAt;
  final String? userMessage;

  bool get hasCompleted =>
      stage == StartupStage.startupReadyDemo ||
      stage == StartupStage.startupReadyFull ||
      stage == StartupStage.startupFailedHard;

  bool get isLoading => !hasCompleted;

  bool get isDegraded =>
      stage == StartupStage.degradedOptionalFailure ||
      stage == StartupStage.startupReadyDemo;

  List<StartupCheckResult> get failedRequired => checks
      .where((check) =>
          check.tier == StartupDependencyTier.required && !check.ok)
      .toList(growable: false);

  List<StartupCheckResult> get failedOptional => checks
      .where((check) =>
          check.tier == StartupDependencyTier.optional && !check.ok)
      .toList(growable: false);
}

class StartupHealthController extends StateNotifier<StartupHealthState> {
  StartupHealthController(this._ref)
      : super(StartupHealthState.initial()) {
    unawaited(runStartupChecks());
  }

  final Ref _ref;
  bool _running = false;

  Future<void> runStartupChecks({bool force = false}) async {
    if (_running) {
      return;
    }
    if (!force && state.hasCompleted) {
      return;
    }

    _running = true;
    final startedAt = DateTime.now();
    state = StartupHealthState(
      stage: StartupStage.checkingRequiredServices,
      checks: const [],
      startedAt: startedAt,
      userMessage: 'Bootstrapping Perbug services…',
    );

    final checks = <StartupCheckResult>[];

    Future<void> runCheck({
      required String key,
      required String label,
      required StartupDependencyTier tier,
      required Future<void> Function() action,
    }) async {
      try {
        await action();
        checks.add(
          StartupCheckResult(key: key, label: label, tier: tier, ok: true),
        );
      } catch (error, stackTrace) {
        checks.add(
          StartupCheckResult(
            key: key,
            label: label,
            tier: tier,
            ok: false,
            message: _errorMessage(error),
            error: error,
            stackTrace: stackTrace,
          ),
        );
      }
    }

    await runCheck(
      key: 'app_shell',
      label: 'App shell render pipeline',
      tier: StartupDependencyTier.required,
      action: () async {},
    );

    state = StartupHealthState(
      stage: StartupStage.requiredReady,
      checks: List<StartupCheckResult>.unmodifiable(checks),
      startedAt: startedAt,
      userMessage: 'Required startup services are ready.',
    );

    await runCheck(
      key: 'backend_health',
      label: 'Backend API /health reachability',
      tier: StartupDependencyTier.optional,
      action: () async {
        final apiClient = await _ref.read(apiClientProvider.future);
        await apiClient.pingHealth();
      },
    );

    await runCheck(
      key: 'local_store',
      label: 'Local session/cache storage warm-up',
      tier: StartupDependencyTier.optional,
      action: () async {
        await _ref.read(localStoreProvider.future);
      },
    );

    await runCheck(
      key: 'platform_snapshot',
      label: 'Web platform probe (wallet + location)',
      tier: StartupDependencyTier.optional,
      action: () async {
        await _ref.read(perbugPlatformSnapshotProvider.future);
      },
    );

    final requiredFailures =
        checks.where((check) => !check.ok && check.tier == StartupDependencyTier.required);
    final optionalFailures =
        checks.where((check) => !check.ok && check.tier == StartupDependencyTier.optional);

    final completedAt = DateTime.now();

    if (requiredFailures.isNotEmpty) {
      state = StartupHealthState(
        stage: StartupStage.startupFailedHard,
        checks: List<StartupCheckResult>.unmodifiable(checks),
        startedAt: startedAt,
        completedAt: completedAt,
        userMessage: 'Perbug could not complete required startup checks.',
      );
      _running = false;
      return;
    }

    if (optionalFailures.isNotEmpty) {
      state = StartupHealthState(
        stage: StartupStage.degradedOptionalFailure,
        checks: List<StartupCheckResult>.unmodifiable(checks),
        startedAt: startedAt,
        completedAt: completedAt,
        userMessage:
            'Perbug started in degraded mode. Demo mode remains available while optional services recover.',
      );
      _running = false;
      return;
    }

    state = StartupHealthState(
      stage: StartupStage.startupReadyFull,
      checks: List<StartupCheckResult>.unmodifiable(checks),
      startedAt: startedAt,
      completedAt: completedAt,
      userMessage: 'Perbug startup checks completed successfully.',
    );
    _running = false;
  }

  Future<void> retry() => runStartupChecks(force: true);

  static String _errorMessage(Object error) {
    if (error is ApiError) {
      return error.message;
    }
    return error.toString();
  }
}

final startupHealthControllerProvider =
    StateNotifierProvider<StartupHealthController, StartupHealthState>(
  (ref) => StartupHealthController(ref),
);

String startupStageLabel(StartupStage stage) {
  switch (stage) {
    case StartupStage.initializing:
      return 'initializing';
    case StartupStage.checkingRequiredServices:
      return 'checking_required_services';
    case StartupStage.requiredReady:
      return 'required_ready';
    case StartupStage.degradedOptionalFailure:
      return 'degraded_optional_failure';
    case StartupStage.startupFailedHard:
      return 'startup_failed_hard';
    case StartupStage.startupReadyDemo:
      return 'startup_ready_demo';
    case StartupStage.startupReadyFull:
      return 'startup_ready_full';
  }
}


extension StartupHealthActions on StartupHealthController {
  void continueInDemoMode() {
    if (state.stage != StartupStage.degradedOptionalFailure) {
      return;
    }
    state = StartupHealthState(
      stage: StartupStage.startupReadyDemo,
      checks: state.checks,
      startedAt: state.startedAt,
      completedAt: state.completedAt ?? DateTime.now(),
      userMessage: 'Continuing in demo-ready degraded mode.',
    );
  }
}
