import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perbug/api/api_client.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/core/identity/identity_store.dart';
import 'package:perbug/features/onboarding/onboarding_controller.dart';
import 'package:perbug/providers/app_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  EnvConfig testEnv() => EnvConfig(
        flavor: EnvFlavor.dev,
        apiBaseUrl: 'https://api.example.com',
        enableDebugLogs: false,
        associatedDomain: 'example.com',
        adsConfig: AdsConfig.disabled(),
        fsqApiKey: null,
      );

  test('finish persists onboarding payload and completion flag', () async {
    SharedPreferences.setMockInitialValues({});
    Map<String, dynamic>? capturedPayload;

    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        if (request.url.path.endsWith('/v1/onboarding/preferences')) {
          capturedPayload = jsonDecode(request.body) as Map<String, dynamic>;
          return http.Response('{}', 200);
        }
        return http.Response('{}', 200);
      }),
      envConfig: testEnv(),
      userIdResolver: () async => 'u-1',
    );

    final container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWith((ref) async => apiClient),
      ],
    );

    final notifier = container.read(onboardingControllerProvider.notifier);
    notifier.toggleCategory('Food');
    notifier.updateLocationMode(false);
    notifier.updateCity('Austin');

    final result = await notifier.finishAndBootstrapFeed();

    final prefs = await SharedPreferences.getInstance();
    final identity = IdentityStore(sharedPreferences: prefs);

    expect(result.isSuccess, isTrue);
    expect(await identity.isOnboardingCompleted(), isTrue);
    expect(await identity.getOnboardingCategories(), ['Food']);
    expect(capturedPayload?['onboardingCompleted'], isTrue);
    expect((capturedPayload?['preferredLocation'] as Map<String, dynamic>)['city'], 'Austin');
    expect(capturedPayload?['interestCategoryIds'], ['Food']);

    container.dispose();
  });

  test('duplicate finish taps are prevented while request is in flight', () async {
    SharedPreferences.setMockInitialValues({});
    final blocker = Completer<void>();
    var saveCalls = 0;

    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        if (request.url.path.endsWith('/v1/onboarding/preferences')) {
          saveCalls += 1;
          await blocker.future;
        }
        return http.Response('{}', 200);
      }),
      envConfig: testEnv(),
      userIdResolver: () async => 'u-1',
    );

    final container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWith((ref) async => apiClient),
      ],
    );

    final notifier = container.read(onboardingControllerProvider.notifier);
    notifier.toggleCategory('Food');
    notifier.updateLocationMode(false);
    notifier.updateCity('Austin');

    final first = notifier.finishAndBootstrapFeed();
    final second = await notifier.finishAndBootstrapFeed();

    expect(second.isSuccess, isFalse);
    expect(second.message, contains('already in progress'));

    blocker.complete();
    final firstResult = await first;
    expect(firstResult.isSuccess, isTrue);
    expect(saveCalls, 1);

    container.dispose();
  });

  test('finish still succeeds locally when backend save fails', () async {
    SharedPreferences.setMockInitialValues({});

    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        if (request.url.path.endsWith('/v1/onboarding/preferences')) {
          return http.Response('boom', 500);
        }
        return http.Response('{}', 200);
      }),
      envConfig: testEnv(),
      userIdResolver: () async => 'u-1',
    );

    final container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWith((ref) async => apiClient),
      ],
    );

    final notifier = container.read(onboardingControllerProvider.notifier);
    notifier.toggleCategory('Food');
    notifier.updateLocationMode(false);
    notifier.updateCity('Austin');

    final result = await notifier.finishAndBootstrapFeed();

    expect(result.isSuccess, isTrue);
    expect(result.message, isNull);
    final prefs = await SharedPreferences.getInstance();
    final identity = IdentityStore(sharedPreferences: prefs);
    expect(await identity.isOnboardingCompleted(), isTrue);
    expect(container.read(onboardingControllerProvider).isFinishing, isFalse);

    container.dispose();
  });
}
