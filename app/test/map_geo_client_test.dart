import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perbug/api/api_client.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/features/home/map_discovery_clients.dart';
import 'package:perbug/features/home/map_discovery_models.dart';

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

  test('RemoteMapGeoClient falls back to v1 endpoints when public geo APIs fail', () async {
    final seenPaths = <String>[];
    final apiClient = ApiClient(
      httpClient: MockClient((request) async {
        seenPaths.add(request.url.path);
        if (request.url.path.endsWith('/api/geo/search') ||
            request.url.path.endsWith('/api/geo/reverse') ||
            request.url.path.endsWith('/api/geo/nearby')) {
          return http.Response(jsonEncode({'error': 'unavailable'}), 502);
        }
        if (request.url.path.endsWith('/v1/geocode')) {
          return http.Response(jsonEncode({'results': [{'displayName': 'Austin fallback', 'lat': 30.26, 'lng': -97.74, 'city': 'Austin', 'state': 'Texas'}]}), 200);
        }
        if (request.url.path.endsWith('/v1/reverse-geocode')) {
          return http.Response(jsonEncode({'result': {'displayName': 'Austin fallback', 'lat': 30.26, 'lng': -97.74, 'city': 'Austin', 'state': 'Texas'}}), 200);
        }
        if (request.url.path.endsWith('/v1/discovery/nearby')) {
          return http.Response(jsonEncode({'items': [{'placeId': 'pl_1', 'title': 'Fallback cafe', 'location': {'lat': 30.2672, 'lng': -97.7431}, 'category': 'coffee', 'score': 4.6}]}), 200);
        }
        return http.Response('{}', 404);
      }),
      envConfig: env,
      userIdResolver: () async => 'user-1',
    );

    final client = RemoteMapGeoClient(apiClient);
    final search = await client.geocode('Austin');
    final reverse = await client.reverseGeocode(lat: 30.2672, lng: -97.7431);
    final nearby = await client.nearby(context: const SearchAreaContext(viewport: MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13)));

    expect(search.single.displayName, 'Austin fallback');
    expect(reverse?.city, 'Austin');
    expect(nearby.single.name, 'Fallback cafe');
    expect(seenPaths, contains('/v1/geocode'));
    expect(seenPaths, contains('/v1/reverse-geocode'));
    expect(seenPaths, contains('/v1/discovery/nearby'));
  });
}
