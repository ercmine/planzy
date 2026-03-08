import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:perbug/api/api_client.dart';
import 'package:perbug/app/theme/theme.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/env/env.dart';
import 'package:perbug/features/deck/plan_detail_page.dart';
import 'package:perbug/models/place_review.dart';
import 'package:perbug/models/plan.dart';
import 'package:perbug/providers/app_providers.dart';
import 'package:perbug/repositories/reviews_repository.dart';

class _FakeApiClient extends ApiClient {
  _FakeApiClient({required this.details})
      : super(
          httpClient: http.Client(),
          envConfig: const EnvConfig(
            flavor: EnvFlavor.dev,
            apiBaseUrl: 'https://example.test',
            enableDebugLogs: false,
            associatedDomain: 'example.test',
            fsqApiKey: null,
            adsConfig: AdsConfig.disabled(),
          ),
          userIdResolver: () async => 'user-1',
        );

  final Map<String, dynamic> details;
  int fetchPlaceDetailCalls = 0;

  @override
  Future<Map<String, dynamic>?> fetchPlanDetail(String planId) async => null;

  @override
  Future<Map<String, dynamic>?> fetchPlaceDetail(String placeId) async {
    fetchPlaceDetailCalls += 1;
    return details;
  }

  @override
  String? buildPhotoUrl(String? token) {
    if (token == null || token.isEmpty) return null;
    if (token.startsWith('http')) return token;
    return 'https://example.test/photos?name=$token';
  }
}

class _FakeReviewsRepository extends ReviewsRepository {
  _FakeReviewsRepository()
      : super(
          apiClient: ApiClient(
            httpClient: http.Client(),
            envConfig: const EnvConfig(
              flavor: EnvFlavor.dev,
              apiBaseUrl: 'https://example.test',
              enableDebugLogs: false,
              associatedDomain: 'example.test',
              adsConfig: AdsConfig.disabled(),
            ),
            userIdResolver: () async => 'user-1',
          ),
        );

  final List<PlaceReview> reviews = [
    PlaceReview(
      id: 'r1',
      placeId: 'src-1',
      userId: 'u1',
      displayName: 'Pat',
      rating: 4,
      text: 'Great place',
      createdAt: DateTime.utc(2024, 1, 1),
      anonymous: false,
    )
  ];

  @override
  Future<List<PlaceReview>> fetchForPlace(String placeId) async => reviews;

  @override
  Future<PlaceReview> createReview({required String placeId, required int rating, required String text, required String displayName, required bool anonymous}) async {
    final created = PlaceReview(
      id: 'r-new',
      placeId: placeId,
      userId: 'u2',
      displayName: anonymous ? 'Anonymous' : (displayName.isEmpty ? 'Perbug User' : displayName),
      rating: rating,
      text: text,
      createdAt: DateTime.utc(2024, 1, 2),
      anonymous: anonymous,
    );
    reviews.insert(0, created);
    return created;
  }
}

void main() {
  test('mergePlanWithDetails picks editorialSummary description', () {
    final base = Plan(
      id: '1',
      source: 'google',
      sourceId: 'src-1',
      title: 'A',
      category: 'food',
      location: const PlanLocation(lat: 1, lng: 2),
    );

    final merged = mergePlanWithDetails(
      basePlan: base,
      details: {
        'editorialSummary': {'text': 'Editorial text'},
      },
      apiClient: _FakeApiClient(details: const {}),
    );

    expect(merged.description, 'Editorial text');
  });

  testWidgets('detail page loads description and multiple photos from details API', (tester) async {
    final fakeApi = _FakeApiClient(
      details: {
        'description': 'Loaded description',
        'photos': [
          {'name': 'places/a/photos/1'},
          {'name': 'places/a/photos/2'},
        ]
      },
    );
    final fakeReviews = _FakeReviewsRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) async => fakeApi),
          reviewsRepositoryProvider.overrideWith((ref) async => fakeReviews),
        ],
        child: MaterialApp(
          theme: buildAppTheme(Brightness.light),
          home: PlanDetailPage(plan: _basePlan(), sessionId: 's1'),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Loaded description'), findsOneWidget);
    expect(find.byType(GestureDetector), findsAtLeastNWidgets(2));
    expect(fakeApi.fetchPlaceDetailCalls, 1);
  });

  testWidgets('review form blocks empty submissions and renders existing reviews', (tester) async {
    final fakeApi = _FakeApiClient(details: const {});
    final fakeReviews = _FakeReviewsRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWith((ref) async => fakeApi),
          reviewsRepositoryProvider.overrideWith((ref) async => fakeReviews),
        ],
        child: MaterialApp(
          theme: buildAppTheme(Brightness.light),
          home: PlanDetailPage(plan: _basePlan(), sessionId: 's1'),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Pat • 4/5'), findsOneWidget);

    await tester.tap(find.text('Submit review'));
    await tester.pump();

    expect(find.text('Rating is required'), findsOneWidget);

    await tester.tap(find.byType(DropdownButtonFormField<int>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('5').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Write your review'), 'Excellent experience');
    await tester.tap(find.text('Submit review'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Excellent experience'), findsOneWidget);
  });
}

Plan _basePlan() => Plan(
      id: '1',
      source: 'google',
      sourceId: 'src-1',
      title: 'Plan one',
      category: 'food',
      location: const PlanLocation(lat: 1, lng: 2),
    );
