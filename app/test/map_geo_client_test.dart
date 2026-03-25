import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perbug/api/api_client.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/features/home/map_discovery_clients.dart';

void main() {
  const env = EnvConfig(
    flavor: EnvFlavor.dev,
    apiBaseUrl: 'https://example.test',
    enableDebugLogs: true,
    associatedDomain: 'example.test',
    fsqApiKey: null,
    adsConfig: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50),
  );

  test('RemoteMapGeoClient uses backend /api/geo/search and /api/geo/reverse', () async {
    final seenPaths = <String>[];
    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        seenPaths.add(request.url.path);
        if (request.url.path.endsWith('/api/geo/search')) {
          return http.Response(jsonEncode({
            'results': [
              {'displayName': 'Austin, Texas', 'lat': 30.2672, 'lon': -97.7431, 'city': 'Austin', 'region': 'Texas'}
            ]
          }), 200);
        }
        if (request.url.path.endsWith('/api/geo/reverse')) {
          return http.Response(jsonEncode({'result': {'displayName': 'Austin, Texas', 'city': 'Austin', 'region': 'Texas'}}), 200);
        }
        return http.Response('{}', 404);
      }),
      envConfig: env,
      userIdResolver: () async => 'user-1',
    );

    final client = RemoteMapGeoClient(apiClient);
    final search = await client.geocode('Austin');
    final reverse = await client.reverseGeocode(lat: 30.2672, lng: -97.7431);

    expect(search.single.displayName, 'Austin, Texas');
    expect(reverse?.city, 'Austin');
    expect(seenPaths, contains('/api/geo/search'));
    expect(seenPaths, contains('/api/geo/reverse'));
    expect(seenPaths, isNot(contains('/v1/geocode')));
    expect(seenPaths, isNot(contains('/v1/reverse-geocode')));
  });
}
