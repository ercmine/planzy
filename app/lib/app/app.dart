import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/connectivity/offline_banner.dart';
import '../core/identity/identity_provider.dart';
import '../core/telemetry/telemetry_dispatcher.dart';
import '../providers/app_providers.dart';
import 'router.dart';
import 'theme/app_theme.dart';

class PerbugApp extends ConsumerStatefulWidget {
  const PerbugApp({super.key});

  @override
  ConsumerState<PerbugApp> createState() => _PerbugAppState();
}

class _PerbugAppState extends ConsumerState<PerbugApp> {
  TelemetryDispatcher? _registeredDispatcher;
  bool _adsInitialized = false;

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
    ref.watch(onboardingCompletedProvider);
    ref.watch(telemetryRepositoryProvider);
    ref.watch(telemetryDispatcherProvider);

    _syncDispatcherRegistration();
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
