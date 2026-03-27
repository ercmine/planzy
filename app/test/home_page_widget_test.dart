import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:dryad/core/identity/identity_provider.dart';
import 'package:dryad/core/identity/identity_store.dart';
import 'package:dryad/features/accomplishments/accomplishment_models.dart';
import 'package:dryad/features/challenges/challenge_models.dart';
import 'package:dryad/features/collections/collection_models.dart';
import 'package:dryad/features/home/home_page.dart';
import 'package:dryad/features/home/place_detail_page.dart';
import 'package:dryad/features/home/place_video_detail_page.dart';
import 'package:dryad/features/video_platform/video_models.dart';
import 'package:dryad/features/video_platform/video_providers.dart';
import 'package:dryad/features/viewer_rewards/viewer_reward_models.dart';

void main() {
  Widget buildApp(List<Override> overrides) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp.router(
        routerConfig: GoRouter(routes: [GoRoute(path: '/', builder: (_, __) => const HomePage())]),
      ),
    );
  }

  final localItems = [
    const PlaceVideoFeedItem(
      videoId: 'v1',
      placeId: 'p1',
      placeName: 'Cafe Orbit',
      placeCategory: 'Cafe',
      regionLabel: 'Downtown',
      scope: FeedScope.local,
      creatorName: 'Sam',
      creatorHandle: '@sam',
      caption: 'Best espresso near station',
      videoUrl: 'https://cdn/video.mp4',
      viewerRewardHint: ViewerRewardHint(isEligible: true, watchRewardDryad: 3, sponsorName: 'Cafe Orbit'),
      rating: 5,
    ),
  ];
  final localStreamItems = [
    PlaceStreamItem.fromFeedItems(placeId: 'p1', scope: FeedScope.local, items: localItems),
    PlaceStreamItem.fromFeedItems(
      placeId: 'p2',
      scope: FeedScope.local,
      items: const [
        PlaceVideoFeedItem(
          videoId: 'v2',
          placeId: 'p2',
          placeName: 'Noodle Night',
          placeCategory: 'Ramen',
          regionLabel: 'East Side',
          scope: FeedScope.local,
          creatorName: 'Ari',
          creatorHandle: '@ari',
          caption: 'Late-night broth run',
          videoUrl: 'https://cdn/video-2.mp4',
          rating: 4,
        ),
        PlaceVideoFeedItem(
          videoId: 'v3',
          placeId: 'p2',
          placeName: 'Noodle Night',
          placeCategory: 'Ramen',
          regionLabel: 'East Side',
          scope: FeedScope.local,
          creatorName: 'Bo',
          creatorHandle: '@bo',
          caption: 'Go extra spicy',
          videoUrl: 'https://cdn/video-3.mp4',
          rating: 5,
        ),
      ],
    ),
    const PlaceStreamItem(
      placeId: 'p3',
      placeName: 'Gallery Noon',
      placeCategory: 'Gallery',
      regionLabel: 'Warehouse District',
      scope: FeedScope.local,
      reviewCount: 0,
      selectedHero: 0,
      heroImageUrl: 'https://cdn/gallery.jpg',
      socialProof: 'Image-first fallback',
    ),
  ];

  List<Override> baseOverrides({
    List<StudioVideo> studioItems = const [],
    List<PlaceSearchResult> placeResults = const [],
  }) {
    return [
      localUserProfileProvider.overrideWith((ref) async => const LocalUserProfile(
            userId: 'user_1',
            displayName: 'Pat Local',
            username: 'pat_local',
            bio: 'Finding the best local spots one review at a time.',
          )),
      profileCollectionsProvider.overrideWith((ref) async => const [
            CollectionCardModel(
              id: 'col_1',
              title: 'Downtown saves',
              type: 'saved_places',
              totalItems: 8,
              completedItems: 3,
              status: 'active',
            ),
          ]),
      profileAccomplishmentSummaryProvider.overrideWith((ref) async => AccomplishmentSummary(
            earnedCount: 2,
            featured: const ['Trusted Reviewer'],
            nextMilestones: const ['publish_10_reviews'],
          )),
      profileChallengeSummaryProvider.overrideWith((ref) async => ChallengeSummary(
            totalAvailable: 4,
            inProgress: 1,
            completed: 2,
            weeklyActive: 1,
            seasonalActive: 0,
            featuredLocales: const ['Downtown'],
          )),
      videoFeedProvider(FeedScope.local).overrideWith((ref) async => localItems),
      videoFeedProvider(FeedScope.regional).overrideWith((ref) async => [localItems.first.copyWith(scope: FeedScope.regional, caption: 'Regional favorite')]),
      videoFeedProvider(FeedScope.global).overrideWith((ref) async => [localItems.first.copyWith(scope: FeedScope.global, caption: 'Global highlight')]),
      placeStreamProvider(FeedScope.local).overrideWith((ref) async => localStreamItems),
      placeStreamProvider(FeedScope.regional).overrideWith((ref) async => [localStreamItems.first.copyWith(socialProof: 'Regional place stream')]),
      placeStreamProvider(FeedScope.global).overrideWith((ref) async => [localStreamItems.first.copyWith(socialProof: 'Global place stream')]),
      placeSearchProvider((query: '', scope: FeedScope.local)).overrideWith((ref) async => const []),
      placeSearchProvider((query: 'Cafe', scope: FeedScope.local)).overrideWith((ref) async => placeResults),
      placeSearchProvider((query: 'cafe', scope: FeedScope.local)).overrideWith((ref) async => placeResults),
      studioVideosProvider.overrideWith((ref) async => studioItems),
      studioAnalyticsProvider.overrideWith(
        (ref) async => const StudioAnalyticsOverview(
          totalVideosPublished: 12,
          totalViews: 3456,
          statusCounts: {'drafts': 2, 'needsAttention': 1},
          topPlaces: [],
        ),
      ),
    ];
  }

  testWidgets('Feed tab switches Local/Regional/Global with real provider scopes', (tester) async {
    await tester.pumpWidget(buildApp(baseOverrides()));
    await tester.pumpAndSettle();

    expect(find.text('Cafe Orbit'), findsOneWidget);
    expect(find.text('Earn 3.0 DRYAD'), findsOneWidget);

    await tester.tap(find.text('Regional'));
    await tester.pumpAndSettle();
    expect(find.text('Regional place stream'), findsOneWidget);

    await tester.tap(find.text('Global'));
    await tester.pumpAndSettle();
    expect(find.text('Global place stream'), findsOneWidget);
  });

  testWidgets('Unified place stream supports save/pass, review switching, and depth actions', (tester) async {
    await tester.pumpWidget(buildApp(baseOverrides()));
    await tester.pumpAndSettle();

    expect(find.text('Swipe right save • left pass'), findsOneWidget);
    expect(find.text('Want to go'), findsOneWidget);

    await tester.drag(find.byKey(const ValueKey('place-stream-p1')), const Offset(180, 0));
    await tester.pumpAndSettle();
    expect(find.text('Saved Cafe Orbit'), findsOneWidget);

    await tester.fling(find.byType(PageView).first, const Offset(0, -400), 1200);
    await tester.pumpAndSettle();
    expect(find.text('Noodle Night'), findsOneWidget);

    await tester.tap(find.text('@bo'));
    await tester.pumpAndSettle();
    expect(find.text('Go extra spicy'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.account_circle_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Creator profile'), findsOneWidget);
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.map_outlined));
    await tester.pumpAndSettle();
    expect(find.text('Map preview'), findsOneWidget);
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.open_in_new_rounded));
    await tester.pumpAndSettle();
    expect(find.byType(PlaceDetailPage), findsOneWidget);
  });

  testWidgets('Sparse-media place renders gracefully in the place stream', (tester) async {
    await tester.pumpWidget(buildApp(baseOverrides()));
    await tester.pumpAndSettle();

    await tester.fling(find.byType(PageView).first, const Offset(0, -900), 1200);
    await tester.pumpAndSettle();
    await tester.fling(find.byType(PageView).first, const Offset(0, -900), 1200);
    await tester.pumpAndSettle();

    expect(find.text('Gallery Noon'), findsOneWidget);
    expect(find.text('Image-first fallback'), findsOneWidget);
  });

  testWidgets('Create tab shows polished empty state for new creators', (tester) async {
    await tester.pumpWidget(buildApp(baseOverrides()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create'));
    await tester.pumpAndSettle();

    expect(find.text('Creator Hub'), findsOneWidget);
    expect(find.text('Record Video'), findsOneWidget);
    expect(find.text('Upload Video'), findsOneWidget);
    expect(find.text('New Draft'), findsOneWidget);
    expect(find.text('Create your first place review'), findsOneWidget);
  });

  testWidgets('Create flow enforces canonical place tagging before publish', (tester) async {
    await tester.pumpWidget(
      buildApp(
        baseOverrides(
          placeResults: const [
            PlaceSearchResult(placeId: 'place_123', name: 'Cafe Orbit', category: 'Cafe', regionLabel: 'Downtown'),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('New Draft'));
    await tester.pumpAndSettle();

    final publishButton = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Publish now'));
    expect(publishButton.onPressed, isNull);

    await tester.enterText(find.byType(TextField).first, 'Orbit review');
    await tester.enterText(find.byKey(const Key('place-search-field')), 'Cafe');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cafe Orbit').first);
    await tester.pumpAndSettle();

    final enabledPublishButton = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Publish now'));
    expect(enabledPublishButton.onPressed, isNotNull);
  });

  testWidgets('Create tab renders drafts and needs-attention upload states', (tester) async {
    await tester.pumpWidget(
      buildApp(
        baseOverrides(
          studioItems: const [
            StudioVideo(
              videoId: 'draft_1',
              placeId: 'p1',
              placeName: 'Cafe Orbit',
              title: 'Lunch draft',
              status: StudioVideoStatus.draft,
              section: StudioSection.drafts,
              updatedAt: '2026-01-01T00:00:00Z',
            ),
            StudioVideo(
              videoId: 'failed_1',
              placeId: 'p2',
              placeName: 'Noodle Spot',
              title: 'Noodle upload',
              status: StudioVideoStatus.failed,
              section: StudioSection.needsAttention,
              updatedAt: '2026-01-01T00:00:00Z',
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create'));
    await tester.pumpAndSettle();

    expect(find.text('Resume Drafts'), findsOneWidget);
    expect(find.text('Lunch draft'), findsOneWidget);
    expect(find.text('Needs Attention'), findsOneWidget);
    expect(find.text('Noodle upload'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });

  testWidgets('Create tab shortcut opens profile review library page', (tester) async {
    await tester.pumpWidget(buildApp(baseOverrides()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Published'));

    await tester.pumpAndSettle();

    expect(find.text('Published reviews'), findsOneWidget);
  });


  testWidgets('Profile tab renders profile details and settings entry points', (tester) async {
    await tester.pumpWidget(
      buildApp(
        baseOverrides(
          studioItems: const [
            StudioVideo(
              videoId: 'published_1',
              placeId: 'p3',
              placeName: 'Taco Terrace',
              title: 'Taco Terrace review',
              status: StudioVideoStatus.published,
              section: StudioSection.published,
              updatedAt: '2026-01-01T00:00:00Z',
              publishedAt: '2026-01-02T00:00:00Z',
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('Edit profile'), findsOneWidget);
    expect(find.text('Posts & reviews'), findsOneWidget);
    expect(find.text('Drafted reviews & videos'), findsOneWidget);
    expect(find.text('Saved places & collections'), findsOneWidget);
    expect(find.text('Profile tools'), findsOneWidget);
    expect(find.text('Log out'), findsOneWidget);
  });

  testWidgets('Place detail page shows place-linked video section', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          videoFeedProvider(FeedScope.local).overrideWith((ref) async => localItems),
        ],
        child: const MaterialApp(home: PlaceVideoDetailPage(placeId: 'p1', placeName: 'Cafe Orbit')),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Place review video coverage'), findsOneWidget);
    expect(find.text('Best espresso near station'), findsOneWidget);
  });
}

extension on PlaceVideoFeedItem {
  PlaceVideoFeedItem copyWith({FeedScope? scope, String? caption}) {
    return PlaceVideoFeedItem(
      videoId: videoId,
      placeId: placeId,
      placeName: placeName,
      placeCategory: placeCategory,
      regionLabel: regionLabel,
      scope: scope ?? this.scope,
      creatorName: creatorName,
      creatorHandle: creatorHandle,
      caption: caption ?? this.caption,
      videoUrl: videoUrl,
      rating: rating,
    );
  }
}
