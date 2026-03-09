import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perbug/api/api_client.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/repositories/reviews_repository.dart';

void main() {
  const env = EnvConfig(
    flavor: EnvFlavor.dev,
    apiBaseUrl: 'https://example.test',
    enableDebugLogs: false,
    associatedDomain: 'example.test',
    fsqApiKey: null,
    adsConfig: AdsConfig.disabled(),
  );

  test('fetchForPlace passes sort as query parameter', () async {
    late Uri requestedUri;
    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        requestedUri = request.url;
        return http.Response(jsonEncode({'reviews': []}), 200);
      }),
      envConfig: env,
      userIdResolver: () async => 'user-1',
    );
    final repository = ReviewsRepository(apiClient: apiClient);

    await repository.fetchForPlace('place-123', sort: 'most_helpful');

    expect(requestedUri.path, '/places/place-123/reviews');
    expect(requestedUri.queryParameters['sort'], 'most_helpful');
  });
}
