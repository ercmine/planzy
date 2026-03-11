import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:perbug/features/home/home_page.dart';
import 'package:perbug/features/video_platform/video_models.dart';
import 'package:perbug/features/video_platform/video_providers.dart';

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
      rating: 5,
    ),
  ];

  testWidgets('Feed tab switches Local/Regional/Global with real provider scopes', (tester) async {
    await tester.pumpWidget(
      buildApp([
        videoFeedProvider(FeedScope.local).overrideWith((ref) async => localItems),
        videoFeedProvider(FeedScope.regional).overrideWith((ref) async => [
              localItems.first.copyWith(scope: FeedScope.regional, caption: 'Regional favorite'),
            ]),
        videoFeedProvider(FeedScope.global).overrideWith((ref) async => [
              localItems.first.copyWith(scope: FeedScope.global, caption: 'Global highlight'),
            ]),
        placeSearchProvider((query: '', scope: FeedScope.local)).overrideWith((ref) async => const []),
        studioVideosProvider.overrideWith((ref) async => const []),
      ]),
    );
    await tester.pumpAndSettle();

    expect(find.text('Best espresso near station'), findsOneWidget);

    await tester.tap(find.text('Regional'));
    await tester.pumpAndSettle();
    expect(find.text('Regional favorite'), findsOneWidget);

    await tester.tap(find.text('Global'));
    await tester.pumpAndSettle();
    expect(find.text('Global highlight'), findsOneWidget);
  });

  testWidgets('Create flow supports record and upload entry points and requires place id', (tester) async {
    await tester.pumpWidget(
      buildApp([
        videoFeedProvider(FeedScope.local).overrideWith((ref) async => localItems),
        videoFeedProvider(FeedScope.regional).overrideWith((ref) async => const []),
        videoFeedProvider(FeedScope.global).overrideWith((ref) async => const []),
        placeSearchProvider((query: '', scope: FeedScope.local)).overrideWith((ref) async => const []),
        studioVideosProvider.overrideWith((ref) async => const []),
      ]),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create'));
    await tester.pumpAndSettle();

    expect(find.text('Open Recorder'), findsOneWidget);
    await tester.tap(find.text('Upload from device'));
    await tester.pumpAndSettle();
    expect(find.text('Open Media Picker'), findsOneWidget);

    final saveButton = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save Draft'));
    expect(saveButton.onPressed, isNull);

    await tester.enterText(find.byKey(const Key('place-id-field')), 'place_123');
    await tester.pumpAndSettle();

    final enabledSaveButton = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Save Draft'));
    expect(enabledSaveButton.onPressed, isNotNull);
  });

  testWidgets('Search tab renders advanced place search results', (tester) async {
    await tester.pumpWidget(
      buildApp([
        videoFeedProvider(FeedScope.local).overrideWith((ref) async => localItems),
        videoFeedProvider(FeedScope.regional).overrideWith((ref) async => const []),
        videoFeedProvider(FeedScope.global).overrideWith((ref) async => const []),
        placeSearchProvider((query: 'cafe', scope: FeedScope.local)).overrideWith((ref) async => const [
              PlaceSearchResult(placeId: 'p1', name: 'Cafe Orbit', category: 'Cafe', regionLabel: 'Downtown', distanceKm: 1.2),
            ]),
        placeSearchProvider((query: 'c', scope: FeedScope.local)).overrideWith((ref) async => const []),
        placeSearchProvider((query: 'ca', scope: FeedScope.local)).overrideWith((ref) async => const []),
        placeSearchProvider((query: 'caf', scope: FeedScope.local)).overrideWith((ref) async => const []),
        studioVideosProvider.overrideWith((ref) async => const []),
      ]),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Search'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'cafe');
    await tester.pumpAndSettle();
    expect(find.text('Cafe Orbit'), findsOneWidget);
  });

  testWidgets('Studio tab renders creator videos and statuses', (tester) async {
    await tester.pumpWidget(
      buildApp([
        videoFeedProvider(FeedScope.local).overrideWith((ref) async => localItems),
        videoFeedProvider(FeedScope.regional).overrideWith((ref) async => const []),
        videoFeedProvider(FeedScope.global).overrideWith((ref) async => const []),
        placeSearchProvider((query: '', scope: FeedScope.local)).overrideWith((ref) async => const []),
        studioVideosProvider.overrideWith((ref) async => const [
              StudioVideo(videoId: 'v2', placeId: 'p1', placeName: 'Cafe Orbit', title: 'Cafe Orbit review', status: StudioVideoStatus.processing),
            ]),
      ]),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Studio'));
    await tester.pumpAndSettle();

    expect(find.text('Cafe Orbit review'), findsOneWidget);
    expect(find.textContaining('processing'), findsOneWidget);
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
