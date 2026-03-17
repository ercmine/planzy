import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perbug/api/api_client.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/features/home/review_prompt_service.dart';
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

  test('suppresses when opted out', () async {
    SharedPreferences.setMockInitialValues({ReviewPromptService.optInKey: false});
    final prefs = await SharedPreferences.getInstance();
    final apiClient = ApiClient(
      httpClient: MockClient((_) async => http.Response('{}', 200)),
      envConfig: testEnv(),
      userIdResolver: () async => 'u-1',
    );

    final service = ReviewPromptService(apiClient: apiClient, preferences: prefs);
    final decision = await service.evaluate(lat: 30.2, lng: -97.7, reviewedPlaceIds: const []);
    expect(decision.shouldPrompt, isFalse);
    expect(decision.suppressionReason, 'opted_out');
  });

  test('suppresses repeated place prompts via cooldown', () async {
    SharedPreferences.setMockInitialValues({ReviewPromptService.optInKey: true});
    final prefs = await SharedPreferences.getInstance();
    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        if (request.url.path.endsWith('/v1/review-prompts/visit-match')) {
          return http.Response(jsonEncode({'matched': true, 'canonicalPlaceId': 'cp-9', 'placeName': 'Venue 9', 'confidence': 0.9}), 200);
        }
        return http.Response('{}', 200);
      }),
      envConfig: testEnv(),
      userIdResolver: () async => 'u-1',
    );
    final service = ReviewPromptService(apiClient: apiClient, preferences: prefs);

    final first = await service.evaluate(lat: 30.2, lng: -97.7, reviewedPlaceIds: const []);
    expect(first.shouldPrompt, isTrue);
    await service.markPromptSent('cp-9');

    final second = await service.evaluate(lat: 30.2, lng: -97.7, reviewedPlaceIds: const []);
    expect(second.shouldPrompt, isFalse);
    expect(second.suppressionReason, anyOf('global_cooldown', 'place_cooldown'));
  });
}
