import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:dryad/api/api_client.dart';
import 'package:dryad/app/theme/theme.dart';
import 'package:dryad/core/ads/ads_config.dart';
import 'package:dryad/core/env/env.dart';
import 'package:dryad/features/deck/plan_detail_page.dart';
import 'package:dryad/models/place_review.dart';
import 'package:dryad/models/place_review_video.dart';
import 'package:dryad/models/plan.dart';
import 'package:dryad/providers/app_providers.dart';
import 'package:dryad/repositories/reviews_repository.dart';

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
      author: ReviewAuthor(displayName: 'Pat', profileType: 'PERSONAL', profileId: 'p1'),
      body: 'Great place',
      rating: 4,
      createdAt: DateTime.utc(2024, 1, 1),
      moderationState: 'published',
      helpfulCount: 0,
      viewerHasHelpfulVote: false,
      canEdit: false,
    )
  ];

  @override
  Future<List<PlaceReview>> fetchForPlace(String placeId, {String sort = 'most_helpful'}) async => reviews;


  @override
  Future<PlaceReviewVideoSection> fetchVideoSection(String placeId, {String filter = 'all', String? cursor, int limit = 12}) async {
    return PlaceReviewVideoSection(placeId: placeId, videos: const [], totalVisibleVideos: 0);
  }
  @override
  Future<PlaceReview> createReview({required String placeId, int? rating, required String body, required String displayName}) async {
    final created = PlaceReview(
      id: 'r-new',
      placeId: placeId,
      author: ReviewAuthor(displayName: displayName.isEmpty ? 'Dryad User' : displayName, profileType: 'PERSONAL', profileId: 'p2'),
      body: body,
      rating: rating,
      createdAt: DateTime.utc(2024, 1, 2),
      moderationState: 'published',
      helpfulCount: 0,
      viewerHasHelpfulVote: false,
      canEdit: true,
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
        'notable': {
          'landmarkType': 'museum',
          'aliases': ['Arc Museum']
        },
        'images': [
          {'url': 'https://example.test/wikidata.jpg', 'source': 'wikidata', 'attributionText': 'Image from Wikidata'},
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
    expect(find.textContaining('Landmark type: museum'), findsOneWidget);
    expect(find.textContaining('Also known as: Arc Museum'), findsOneWidget);
    expect(find.textContaining('Photo: Image from Wikidata'), findsOneWidget);
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
    await tester.enterText(find.widgetWithText(TextFormField, 'Display name (optional)'), 'Robin');
    await tester.enterText(find.widgetWithText(TextFormField, 'Write your review'), 'Excellent experience');
    await tester.tap(find.text('Submit review'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Excellent experience'), findsOneWidget);
  });

  testWidgets('detail page renders empty gallery fallback when no photos available', (tester) async {
    final fakeApi = _FakeApiClient(details: const {'description': 'No photos yet'});
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

    expect(find.byIcon(Icons.photo_library_outlined), findsOneWidget);
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
