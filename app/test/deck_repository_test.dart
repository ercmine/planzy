import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:dryad/api/api_client.dart';
import 'package:dryad/core/ads/ads_config.dart';
import 'package:dryad/core/cache/local_store.dart';
import 'package:dryad/core/env/env.dart';
import 'package:dryad/repositories/deck_repository.dart';
import 'package:dryad/services/foursquare/foursquare_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  const env = EnvConfig(
    flavor: EnvFlavor.dev,
    apiBaseUrl: 'https://example.test',
    enableDebugLogs: true,
    associatedDomain: 'example.test',
    fsqApiKey: null,
    adsConfig: AdsConfig(
      enabled: false,
      admobAppIdIos: '',
      admobAppIdAndroid: '',
      nativeUnitIdIos: '',
      nativeUnitIdAndroid: '',
      frequencyN: 10,
      placeFirstAfter: 3,
      maxAdsPerWindow: 3,
      adsWindowSize: 50,
    ),
  );

  test('fetches deck from session endpoint and preserves nearby params', () async {
    SharedPreferences.setMockInitialValues({});
    late Uri capturedUri;
    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        capturedUri = request.url;
        return http.Response(
          jsonEncode({
            'sessionId': 's-1',
            'plans': [
              {
                'id': 'p1',
                'title': 'Cafe One',
                'category': 'food',
                'source': 'google_places',
                'location': {'lat': 37.7801, 'lng': -122.4102, 'address': '1 Main St'},
              }
            ],
            'nextCursor': 'next-cursor',
            'mix': {
              'providersUsed': ['google_places'],
              'planSourceCounts': {'google_places': 1},
              'categoryCounts': {'food': 1},
              'sponsoredCount': 0,
            },
            'debug': {'requestId': 'req-1', 'cacheHit': false},
          }),
          200,
        );
      }),
      envConfig: env,
      userIdResolver: () async => 'user-1',
    );
    final localStore = LocalStore(await SharedPreferences.getInstance());
    final repository = DeckRepository(
      apiClient: apiClient,
      localStore: localStore,
      foursquareClient: FoursquareClient(httpClient: MockClient((_) async => http.Response('{}', 200)), apiKey: ''),
    );

    final deck = await repository.fetchDeckBatch(
      's-1',
      const DeckQueryParams(
        lat: 37.78,
        lng: -122.41,
        radiusMeters: 5000,
        maxResults: 20,
        cursor: 'c1',
      ),
    );

    expect(capturedUri.path, '/sessions/s-1/deck');
    expect(capturedUri.queryParameters['lat'], '37.780000');
    expect(capturedUri.queryParameters['lng'], '-122.410000');
    expect(capturedUri.queryParameters['radiusMeters'], '5000');
    expect(capturedUri.queryParameters['limit'], '20');
    expect(capturedUri.queryParameters.containsKey('maxResults'), isFalse);
    expect(deck.nextCursor, 'next-cursor');
    expect(deck.mix.providersUsed, ['google_places']);
  });
}
