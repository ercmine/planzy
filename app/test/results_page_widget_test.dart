import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';
import 'package:go_router/go_router.dart';
import 'package:dryad/app/theme/theme.dart';
import 'package:dryad/core/ads/ads_config.dart';
import 'package:dryad/core/env/env.dart';
import 'package:dryad/core/location/location_controller.dart';
import 'package:dryad/core/location/location_models.dart';
import 'package:dryad/core/location/location_permission_service.dart';
import 'package:dryad/core/location/location_service.dart';
import 'package:dryad/core/sharing/share_service.dart';
import 'package:dryad/features/results/results_controller.dart';
import 'package:dryad/features/results/results_mapper.dart';
import 'package:dryad/features/results/results_models.dart';
import 'package:dryad/features/results/results_page.dart';
import 'package:dryad/features/results/results_state.dart';
import 'package:dryad/models/plan.dart';
import 'package:dryad/providers/app_providers.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dryad/repositories/swipes_repository.dart';

class _FakeLocationPermissionService extends LocationPermissionService {
  @override
  Future<LocationPermissionResult> ensureLocationPermission() async {
    return const LocationPermissionResult(
      outcome: LocationPermissionOutcome.granted,
      rawPermission: LocationPermission.always,
    );
  }

  @override
  Future<LocationPermissionResult> checkPermissionStatus() async {
    return const LocationPermissionResult(
      outcome: LocationPermissionOutcome.granted,
      rawPermission: LocationPermission.always,
    );
  }
}

class _FakeLocationService extends LocationService {
  @override
  Future<AppLocation> getCurrentLocation() async {
    return AppLocation(lat: 37.7, lng: -122.4, capturedAt: DateTime.utc(2024, 1, 1));
  }
}

class _FakeShareService extends ShareService {
  @override
  Future<void> shareText(String text, {String? subject}) async {}
}

class _MockSwipesRepository extends Mock implements SwipesRepository {}

class _TestResultsController extends ResultsController {
  _TestResultsController(this._seed)
      : super(
          sessionId: 'session-1',
          swipesRepository: _MockSwipesRepository(),
          shareService: _FakeShareService(),
          liveResultsRepository: null,
          locationController: LocationController(
            locationPermissionService: _FakeLocationPermissionService(),
            locationService: _FakeLocationService(),
          ),
        ) {
    state = _seed;
  }

  final ResultsState _seed;

  @override
  Future<void> refresh() async {}

  @override
  Future<void> requestLocationAndReload() async {}

  @override
  Future<void> lockIn(Plan plan) async {}

  @override
  Future<void> loadMore() async {}
}

void main() {
  ProviderScope _wrap(ResultsState state, {Widget? child}) {
    return ProviderScope(
      overrides: [
        envConfigProvider.overrideWithValue(
          const EnvConfig(
            flavor: EnvFlavor.dev,
            apiBaseUrl: 'https://example.test',
            enableDebugLogs: false,
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
          ),
        ),
        resultsControllerProvider.overrideWith((ref, sessionId) => _TestResultsController(state)),
      ],
      child: child ?? MaterialApp(theme: buildAppTheme(Brightness.light), home: const ResultsPage(sessionId: 'session-1')),
    );
  }

  testWidgets('Results page renders cards when provider has data', (tester) async {
    final scored = PlanScoreView(plan: _plan('plan-1'), score: 3, yesCount: 1, maybeCount: 1);
    final state = ResultsState(
      isLoading: false,
      isRefreshing: false,
      isLoadingMore: false,
      topPicks: [scored],
      feedItems: [PlaceResultFeedItem(card: mapPlanToCardViewModel(scored), isLocked: false)],
      swipeCount: 1,
      locationRequired: false,
      hasMore: false,
    );

    await tester.pumpWidget(_wrap(state));
    await tester.pump();

    expect(find.text('Plan plan-1'), findsOneWidget);
    expect(find.text('food'), findsOneWidget);
  });

  testWidgets('Results page shows loading skeleton while fetching', (tester) async {
    final state = const ResultsState(
      isLoading: true,
      isRefreshing: false,
      isLoadingMore: false,
      topPicks: <PlanScoreView>[],
      feedItems: <ResultFeedItem>[],
      swipeCount: 0,
      locationRequired: false,
      hasMore: false,
    );

    await tester.pumpWidget(_wrap(state));

    expect(find.byType(Card), findsWidgets);
  });

  testWidgets('Results page shows empty state for zero results', (tester) async {
    final state = const ResultsState(
      isLoading: false,
      isRefreshing: false,
      isLoadingMore: false,
      topPicks: <PlanScoreView>[],
      feedItems: <ResultFeedItem>[],
      swipeCount: 0,
      locationRequired: false,
      hasMore: false,
    );

    await tester.pumpWidget(_wrap(state));

    expect(find.text('No results found yet.'), findsOneWidget);
  });

  testWidgets('Navigating to Results page with valid data displays the first result', (tester) async {
    final scored = PlanScoreView(plan: _plan('plan-1'), score: 4, yesCount: 2, maybeCount: 0);
    final state = ResultsState(
      isLoading: false,
      isRefreshing: false,
      isLoadingMore: false,
      topPicks: [scored],
      feedItems: [PlaceResultFeedItem(card: mapPlanToCardViewModel(scored), isLocked: false)],
      swipeCount: 2,
      locationRequired: false,
      hasMore: false,
    );

    final router = GoRouter(
      initialLocation: '/sessions/session-1/results',
      routes: [
        GoRoute(
          path: '/sessions/:id/results',
          builder: (context, routeState) => ResultsPage(sessionId: routeState.pathParameters['id'] ?? ''),
        ),
      ],
    );

    await tester.pumpWidget(
      _wrap(
        state,
        child: MaterialApp.router(
          theme: buildAppTheme(Brightness.light),
          routerConfig: router,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Plan plan-1'), findsOneWidget);
  });
}

Plan _plan(String id) => Plan(
      id: id,
      source: 'google',
      sourceId: 'src-$id',
      title: 'Plan $id',
      category: 'food',
      location: const PlanLocation(lat: 1, lng: 2),
    );
