import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:dryad/api/api_client.dart';
import 'package:dryad/core/env/env.dart';
import 'package:dryad/features/home/place_video_detail_page.dart';
import 'package:dryad/providers/app_providers.dart';
import 'package:dryad/features/video_platform/video_models.dart';
import 'package:dryad/features/video_platform/video_providers.dart';

import 'package:dryad/core/ads/ads_config.dart';

void main() {
  testWidgets('report button submits video report', (tester) async {
    final requests = <Uri>[];
    final client = MockClient((request) async {
      requests.add(request.url);
      if (request.url.path.endsWith('/v1/videos/v1/report')) {
        return http.Response(jsonEncode({'accepted': true}), 202, headers: {'content-type': 'application/json'});
      }
      return http.Response(jsonEncode({}), 200, headers: {'content-type': 'application/json'});
    });

    final apiClient = ApiClient(
      httpClient: client,
      envConfig: const EnvConfig(flavor: EnvFlavor.dev, apiBaseUrl: 'https://api.dryad.test', enableDebugLogs: false, associatedDomain: 'dryad.dev', adsConfig: AdsConfig.disabled(), fsqApiKey: null),
      userIdResolver: () async => 'user_1',
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) async => apiClient),
          videoFeedProvider(FeedScope.local).overrideWith((ref) async => const [
                PlaceVideoFeedItem(
                  videoId: 'v1',
                  placeId: 'p1',
                  scope: FeedScope.local,
                  caption: 'Clip',
                  videoUrl: 'https://cdn/video.mp4',
                  rating: 5,
                  status: 'published',
                ),
              ]),
        ],
        child: const MaterialApp(home: PlaceVideoDetailPage(placeId: 'p1', placeName: 'Cafe')),
      ),
    );

    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Report video'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Violence / graphic content'));
    await tester.enterText(find.byType(TextField), 'unsafe');
    await tester.tap(find.text('Submit report'));
    await tester.pumpAndSettle();

    expect(requests.any((uri) => uri.path.endsWith('/v1/videos/v1/report')), isTrue);
    expect(find.text('Report received. Our safety team will review it.'), findsOneWidget);
  });
}
