import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/connectivity/offline_banner.dart';
import '../core/debug_flags.dart';
import '../core/identity/identity_provider.dart';
import '../core/platform/perbug_platform.dart';
import '../core/telemetry/telemetry_dispatcher.dart';
import '../core/telegram/telegram_mini_app_runtime.dart';
import '../providers/app_providers.dart';
import 'app_routes.dart';
import 'perbug_recovery_page.dart';
import 'router.dart';
import 'startup_health.dart';
import 'theme/app_theme.dart';

class PerbugApp extends ConsumerStatefulWidget {
  const PerbugApp({super.key});

  @override
  ConsumerState<PerbugApp> createState() => _PerbugAppState();
}

class _PerbugAppState extends ConsumerState<PerbugApp> {
  TelemetryDispatcher? _registeredDispatcher;
  bool _adsInitialized = false;
  bool _startupInterstitialAttempted = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncDispatcherRegistration();
  }

  @override
  void dispose() {
    if (_registeredDispatcher != null) {
      WidgetsBinding.instance.removeObserver(_registeredDispatcher!);
      _registeredDispatcher!.stop();
      _registeredDispatcher = null;
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(localStoreProvider);
    ref.watch(userIdProvider);
    ref.watch(telemetryRepositoryProvider);
    ref.watch(telemetryDispatcherProvider);

    final startupState = ref.watch(startupHealthControllerProvider);

    _syncDispatcherRegistration();
    _initializeAds();
    _maybeShowStartupInterstitial();

    final router = ref.watch(routerProvider);
    final telegramContext = ref.watch(telegramMiniAppContextProvider).valueOrNull;

    return MaterialApp.router(
      title: 'Perbug',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
      builder: (context, child) {
        final content = child ?? const PerbugRecoveryPage();
        final telegramBackground = telegramContext?.themeParams['bg_color'];
        final shell = Container(
          color: telegramBackground == null ? null : Color(_parseHexColor(telegramBackground)),
          child: content,
        );
        return Stack(
          children: [
            shell,
            const OfflineBanner(),
            Positioned.fill(
              child: IgnorePointer(
                ignoring: startupState.hasCompleted,
                child: _StartupStatusPanel(state: startupState),
              ),
            ),
            if (kShowDebugUi)
              Positioned(
                left: 12,
                top: 52,
                child: _PerbugDebugOverlay(startupState: startupState),
              ),
          ],
        );
      },
    );
  }

  void _initializeAds() {
    if (_adsInitialized) {
      return;
    }
    _adsInitialized = true;
    ref.read(adsServiceProvider).initialize();
    ref.read(actionInterstitialAdServiceProvider).initialize();
  }

  void _maybeShowStartupInterstitial() {
    if (_startupInterstitialAttempted) {
      return;
    }
    _startupInterstitialAttempted = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_showStartupInterstitial());
    });
  }

  Future<void> _showStartupInterstitial() async {
    final interstitialService = ref.read(actionInterstitialAdServiceProvider);
    await interstitialService.initialize();
    await interstitialService.showIfAvailable(InterstitialAdTrigger.appOpen);
  }

  void _syncDispatcherRegistration() {
    final dispatcher = ref.read(telemetryDispatcherProvider);

    if (_registeredDispatcher == dispatcher) {
      return;
    }

    if (_registeredDispatcher != null) {
      WidgetsBinding.instance.removeObserver(_registeredDispatcher!);
      _registeredDispatcher!.stop();
    }

    _registeredDispatcher = dispatcher;
    if (dispatcher != null) {
      WidgetsBinding.instance.addObserver(dispatcher);
      dispatcher.start();
    }
  }
}


int _parseHexColor(String hex) {
  final value = hex.replaceAll('#', '').trim();
  if (value.length == 6) {
    return int.parse('FF$value', radix: 16);
  }
  if (value.length == 8) {
    return int.parse(value, radix: 16);
  }
  return 0xFF101014;
}

class _StartupStatusPanel extends ConsumerWidget {
  const _StartupStatusPanel({required this.state});

  final StartupHealthState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (state.stage == StartupStage.startupReadyFull || state.stage == StartupStage.startupReadyDemo) {
      return const SizedBox.shrink();
    }

    final isHardFailure = state.stage == StartupStage.startupFailedHard;
    final isDegraded = state.stage == StartupStage.degradedOptionalFailure;
    final canRetry = !state.isLoading;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      color: Colors.black.withOpacity(state.isLoading ? 0.32 : 0.55),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 620),
          child: Card(
            color: const Color(0xEE21142E),
            margin: const EdgeInsets.all(20),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isHardFailure
                        ? 'Perbug startup failed'
                        : isDegraded
                            ? 'Perbug started with degraded optional services'
                            : 'Starting Perbug…',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: const Color(0xFFFFE7B5),
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    state.userMessage ?? 'Initializing startup health checks.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                  ),
                  if (state.isLoading) ...[
                    const SizedBox(height: 14),
                    const LinearProgressIndicator(minHeight: 3),
                  ],
                  if (state.checks.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    ...state.checks.map(
                      (check) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          '${check.ok ? '✅' : '⚠️'} ${check.label} (${check.tier.name})'
                          '${check.message == null ? '' : ' • ${check.message}'}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70),
                        ),
                      ),
                    ),
                  ],
                  if (!state.isLoading) ...[
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (canRetry)
                          FilledButton.icon(
                            onPressed: () => ref.read(startupHealthControllerProvider.notifier).retry(),
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry Startup'),
                          ),
                        if (isDegraded)
                          OutlinedButton.icon(
                            onPressed: () {
                              ref.read(startupHealthControllerProvider.notifier).continueInDemoMode();
                            },
                            icon: const Icon(Icons.play_arrow_outlined),
                            label: const Text('Continue in Demo Mode'),
                          ),
                        if (isHardFailure)
                          TextButton.icon(
                            onPressed: () => ref.read(routerProvider).go(AppRoutes.entry),
                            icon: const Icon(Icons.home_outlined),
                            label: const Text('Return to Entry Screen'),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PerbugDebugOverlay extends ConsumerWidget {
  const _PerbugDebugOverlay({required this.startupState});

  final StartupHealthState startupState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(perbugPlatformSnapshotProvider);
    final router = ref.watch(routerProvider);
    final uri = router.routerDelegate.currentConfiguration.uri;

    final status = snapshot.maybeWhen(
      data: (data) =>
          '${data.modeLabel} • wallet:${data.walletAvailable ? 'ok' : 'none'} • location:${data.locationApiSupported ? 'ready' : 'blocked'}',
      orElse: () => 'platform: probing…',
    );

    final telegramStatus = ref.watch(telegramMiniAppContextProvider).maybeWhen(
          data: (context) {
            if (!context.isTelegramMiniApp) {
              return 'telegram: browser';
            }
            final userLabel = context.user?.username ?? context.user?.firstName ?? 'anonymous';
            final viewport = context.viewportHeight?.toStringAsFixed(0) ?? 'n/a';
            return 'telegram: mini-app • user:$userLabel • viewport:$viewport • init:${context.hasInitData ? 'yes' : 'no'}';
          },
          orElse: () => 'telegram: probing…',
        );

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 620),
      child: Material(
        color: Colors.black.withOpacity(0.72),
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: DefaultTextStyle(
            style: Theme.of(context).textTheme.bodySmall!.copyWith(color: Colors.white),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('route: ${uri.path}${uri.hasQuery ? '?${uri.query}' : ''}'),
                Text(status),
                Text('startup: ${startupStageLabel(startupState.stage)}'),
                Text(telegramStatus),
                ...startupState.checks
                    .where((check) => !check.ok)
                    .map(
                      (check) => Text(
                        '[${check.tier.name}] ${check.key}: ${check.message ?? check.error}',
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ),
                if (kDebugMode)
                  ...startupState.checks
                      .where((check) => !check.ok && check.stackTrace != null)
                      .map((check) => Text('stack(${check.key}): ${check.stackTrace}')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
