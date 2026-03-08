import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perbug/api/api_client.dart';
import 'package:perbug/api/api_error.dart';
import 'package:perbug/api/retry.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';

void main() {
  const env = EnvConfig(
    flavor: EnvFlavor.dev,
    apiBaseUrl: 'https://example.test',
    enableDebugLogs: true,
    associatedDomain: 'example.test',
    fsqApiKey: null,
    adsConfig: const AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50),
  );

  test('retries on 502 then succeeds', () async {
    var calls = 0;
    final client = ApiClient(
      httpClient: MockClient((request) async {
        calls += 1;
        if (calls == 1) {
          return http.Response('{"error":"provider_error"}', 502);
        }
        return http.Response(jsonEncode({'ok': true}), 200);
      }),
      envConfig: env,
      userIdResolver: () async => 'user-1',
      retryPolicy: const RetryPolicy(
        maxRetries: 2,
        baseDelay: Duration.zero,
        jitterRatio: 0,
      ),
    );

    final response = await client.getJson('/plans');

    expect(calls, 2);
    expect(response['ok'], true);
  });

  test('does not retry 400 and parses validation_error payload', () async {
    var calls = 0;
    final client = ApiClient(
      httpClient: MockClient((request) async {
        calls += 1;
        return http.Response(
          jsonEncode({
            'error': 'validation_error',
            'details': ['missing lat'],
          }),
          400,
        );
      }),
      envConfig: env,
      userIdResolver: () async => 'user-1',
      retryPolicy: const RetryPolicy(maxRetries: 3, baseDelay: Duration.zero),
    );

    expect(
      () => client.getJson('/plans'),
      throwsA(
        isA<ApiError>()
            .having((e) => e.statusCode, 'statusCode', 400)
            .having(
              (e) => e.serverPayload?.map(
                validationError: (_) => 'validation_error',
                providerError: (_) => 'provider_error',
                policyViolation: (_) => 'policy_violation',
                unknown: (_) => 'unknown',
              ),
              'serverPayload',
              'validation_error',
            ),
      ),
    );
    expect(calls, 1);
  });


  test('getDecoded supports JSON array response', () async {
    final client = ApiClient(
      httpClient: MockClient((request) async => http.Response('[{"id":"p1"}]', 200)),
      envConfig: env,
      userIdResolver: () async => 'user-1',
      retryPolicy: const RetryPolicy(maxRetries: 0, baseDelay: Duration.zero),
    );

    final response = await client.getDecoded('/plans');
    expect(response, isA<List<dynamic>>());
  });

  test('returns http error for 500 even if body is not JSON', () async {
    final client = ApiClient(
      httpClient: MockClient((request) async => http.Response('server exploded', 500)),
      envConfig: env,
      userIdResolver: () async => 'user-1',
      retryPolicy: const RetryPolicy(maxRetries: 0, baseDelay: Duration.zero),
    );

    expect(
      () => client.getDecoded('/plans'),
      throwsA(
        isA<ApiError>()
            .having((e) => e.kind, 'kind', ApiErrorKind.http)
            .having((e) => e.statusCode, 'statusCode', 500),
      ),
    );
  });

  test('throws decoding error on invalid JSON response', () async {
    final client = ApiClient(
      httpClient: MockClient((request) async => http.Response('not-json', 200)),
      envConfig: env,
      userIdResolver: () async => 'user-1',
      retryPolicy: const RetryPolicy(maxRetries: 0, baseDelay: Duration.zero),
    );

    expect(
      () => client.getJson('/plans'),
      throwsA(
        isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.decoding),
      ),
    );
  });
}
