import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:dryad/api/api_client.dart';
import 'package:dryad/api/retry.dart';
import 'package:dryad/core/ads/ads_config.dart';
import 'package:dryad/core/env/env.dart';
import 'package:dryad/features/video_platform/video_models.dart';
import 'package:dryad/features/video_platform/video_repository.dart';

void main() {
  const env = EnvConfig(
    flavor: EnvFlavor.dev,
    apiBaseUrl: 'https://example.test',
    enableDebugLogs: true,
    associatedDomain: 'example.test',
    fsqApiKey: null,
    adsConfig: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50),
  );

  ApiClient buildClient(Future<http.Response> Function(http.Request request) handler) {
    return ApiClient(
      httpClient: MockClient(handler),
      envConfig: env,
      userIdResolver: () async => 'user-1',
      retryPolicy: const RetryPolicy(maxRetries: 0, baseDelay: Duration.zero),
    );
  }

  test('fetchFeed caches responses per scope to avoid duplicate requests', () async {
    var feedCalls = 0;
    final repo = VideoRepository(
      apiClient: buildClient((request) async {
        if (request.url.path.endsWith('/v1/feed/videos')) {
          feedCalls += 1;
          return http.Response(
            jsonEncode({
              'items': [
                {
                  'videoId': 'v1',
                  'placeId': 'p1',
                  'placeName': 'Cafe Orbit',
                  'caption': 'Great coffee',
                  'videoUrl': 'https://cdn/video.mp4',
                  'rating': 5,
                }
              ]
            }),
            200,
          );
        }
        return http.Response('{}', 200);
      }),
    );

    final first = await repo.fetchFeed(scope: FeedScope.local);
    final second = await repo.fetchFeed(scope: FeedScope.local);

    expect(first.length, 1);
    expect(second.length, 1);
    expect(feedCalls, 1);
  });

  test('searchPlaces deduplicates concurrent identical queries', () async {
    var searchCalls = 0;
    final repo = VideoRepository(
      apiClient: buildClient((request) async {
        if (request.url.path.endsWith('/v1/places/autocomplete')) {
          searchCalls += 1;
          await Future<void>.delayed(const Duration(milliseconds: 25));
          return http.Response(
            jsonEncode({
              'suggestions': [
                {
                  'placeId': 'p1',
                  'name': 'Cafe Orbit',
                  'category': 'Cafe',
                  'regionLabel': 'Downtown',
                }
              ]
            }),
            200,
          );
        }
        return http.Response('{}', 200);
      }),
    );

    final results = await Future.wait([
      repo.searchPlaces(query: 'Cafe', scope: FeedScope.local),
      repo.searchPlaces(query: 'Cafe', scope: FeedScope.local),
    ]);

    expect(results[0].first.name, 'Cafe Orbit');
    expect(results[1].first.name, 'Cafe Orbit');
    expect(searchCalls, 1);
  });
}
