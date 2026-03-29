import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_error.dart';
import '../core/connectivity/offline_banner.dart';
import '../core/debug_flags.dart';
import '../core/telemetry/telemetry_dispatcher.dart';
import '../providers/app_providers.dart';
import 'router.dart';
import 'theme/app_theme.dart';

class DryadApp extends ConsumerStatefulWidget {
  const DryadApp({super.key});

  @override
  ConsumerState<DryadApp> createState() => _DryadAppState();
}

class _DryadAppState extends ConsumerState<DryadApp> {
  TelemetryDispatcher? _registeredDispatcher;
  bool _adsInitialized = false;
  bool _healthCheckStarted = false;
  String? _startupHealthError;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncDispatcherRegistration();
    _checkStartupHealth();
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

    _syncDispatcherRegistration();
    _checkStartupHealth();
    _initializeAds();

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Perbug',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
      builder: (context, child) {
        return Stack(
          children: [
            if (child != null) child,
            const OfflineBanner(),
            if (kShowDebugUi && _startupHealthError != null)
              Positioned(
                left: 12,
                right: 12,
                top: 52,
                child: Material(
                  color: Colors.red.shade700,
                  borderRadius: BorderRadius.circular(10),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      _startupHealthError!,
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Future<void> _checkStartupHealth() async {
    if (_healthCheckStarted) {
      return;
    }

    final apiClient = ref.read(apiClientProvider).valueOrNull;
    if (apiClient == null) {
      return;
    }

    _healthCheckStarted = true;

    try {
      await apiClient.pingHealth();
      if (!mounted) {
        return;
      }
      setState(() {
        _startupHealthError = null;
      });
    } on ApiError catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _startupHealthError = 'Startup health check failed.';
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _startupHealthError = 'Startup health check failed.';
      });
    }
  }

  void _initializeAds() {
    if (_adsInitialized) {
      return;
    }
    _adsInitialized = true;
    ref.read(adsServiceProvider).initialize();
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
