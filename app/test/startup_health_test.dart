import 'package:perbug/api/api_client.dart';
import 'package:perbug/app/startup_health.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/core/platform/perbug_platform.dart';
import 'package:perbug/core/cache/local_store.dart';
import 'package:perbug/providers/app_providers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('StartupHealthController', () {
    test('all checks healthy leads to startupReadyFull', () async {
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWith((ref) async => _FakeApiClient()),
          localStoreProvider.overrideWith((ref) async {
            SharedPreferences.setMockInitialValues(const <String, Object>{});
            return LocalStore(await SharedPreferences.getInstance());
          }),
          perbugPlatformSnapshotProvider.overrideWith(
            (ref) async => const PerbugPlatformSnapshot(
              target: TargetPlatform.android,
              web: true,
              walletAvailable: true,
              locationApiSupported: true,
            ),
          ),
        ],
      );

      final notifier = container.read(startupHealthControllerProvider.notifier);
      await notifier.runStartupChecks(force: true);

      final state = container.read(startupHealthControllerProvider);
      expect(state.stage, StartupStage.startupReadyFull);
      expect(state.failedRequired, isEmpty);
      expect(state.failedOptional, isEmpty);
      container.dispose();
    });

    test('optional backend failure degrades startup but allows demo continue', () async {
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWith((ref) async => _FakeApiClient(failHealthPing: true)),
          localStoreProvider.overrideWith((ref) async {
            SharedPreferences.setMockInitialValues(const <String, Object>{});
            return LocalStore(await SharedPreferences.getInstance());
          }),
          perbugPlatformSnapshotProvider.overrideWith(
            (ref) async => const PerbugPlatformSnapshot(
              target: TargetPlatform.android,
              web: true,
              walletAvailable: false,
              locationApiSupported: false,
            ),
          ),
        ],
      );

      final notifier = container.read(startupHealthControllerProvider.notifier);
      await notifier.runStartupChecks(force: true);

      final degradedState = container.read(startupHealthControllerProvider);
      expect(degradedState.stage, StartupStage.degradedOptionalFailure);
      expect(degradedState.failedRequired, isEmpty);
      expect(degradedState.failedOptional, isNotEmpty);

      notifier.continueInDemoMode();
      final demoState = container.read(startupHealthControllerProvider);
      expect(demoState.stage, StartupStage.startupReadyDemo);

      container.dispose();
    });

    test('retry retries failing checks and can recover to full mode', () async {
      var fail = true;
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWith((ref) async => _FakeApiClient(healthPingEvaluator: () => fail)),
          localStoreProvider.overrideWith((ref) async {
            SharedPreferences.setMockInitialValues(const <String, Object>{});
            return LocalStore(await SharedPreferences.getInstance());
          }),
          perbugPlatformSnapshotProvider.overrideWith(
            (ref) async => const PerbugPlatformSnapshot(
              target: TargetPlatform.android,
              web: true,
              walletAvailable: true,
              locationApiSupported: true,
            ),
          ),
        ],
      );

      final notifier = container.read(startupHealthControllerProvider.notifier);
      await notifier.runStartupChecks(force: true);
      expect(container.read(startupHealthControllerProvider).stage, StartupStage.degradedOptionalFailure);

      fail = false;
      await notifier.retry();
      expect(container.read(startupHealthControllerProvider).stage, StartupStage.startupReadyFull);
      container.dispose();
    });
  });
}

class _FakeApiClient extends ApiClient {
  _FakeApiClient({this.failHealthPing = false, this.healthPingEvaluator})
      : super(
          httpClient: http.Client(),
          envConfig: EnvConfig(
            flavor: EnvFlavor.dev,
            apiBaseUrl: 'https://api.perbug.com',
            enableDebugLogs: true,
            associatedDomain: 'perbug.com',
            adsConfig: AdsConfig.disabled(),
            fsqApiKey: null,
            mapStack: const MapStackConfig(
              styleUrl: '{}',
              darkStyleUrl: '{}',
              tileSourceStrategy: 'openfreemap',
              terrainSourceUrl: null,
              enable3dBuildings: false,
              enableTerrain: false,
              enableClustering: false,
              enableEnhancedPitch: false,
              enableDiagnostics: false,
            ),
          ),
          userIdResolver: () async => 'test-user',
        );

  final bool failHealthPing;
  final bool Function()? healthPingEvaluator;

  @override
  Future<void> pingHealth() async {
    final shouldFail = healthPingEvaluator?.call() ?? failHealthPing;
    if (shouldFail) {
      throw Exception('simulated backend outage');
    }
  }
}
