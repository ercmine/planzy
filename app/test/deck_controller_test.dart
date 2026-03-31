import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:perbug/core/ads/ad_deck_injector.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/location/location_controller.dart';
import 'package:perbug/core/location/location_models.dart';
import 'package:perbug/core/location/location_permission_service.dart';
import 'package:perbug/core/location/location_service.dart';
import 'package:perbug/core/permissions/permission_service.dart';
import 'package:perbug/core/permissions/permission_state.dart';
import 'package:perbug/core/store/sessions_store.dart';
import 'package:perbug/core/store/swipes_store.dart';
import 'package:perbug/core/telemetry/telemetry_dispatcher.dart';
import 'package:perbug/features/deck/deck_controller.dart';
import 'package:perbug/models/deck_batch.dart';
import 'package:perbug/models/plan.dart';
import 'package:perbug/models/session.dart';
import 'package:perbug/models/session_filters.dart';
import 'package:perbug/models/swipe.dart';
import 'package:perbug/models/telemetry.dart';
import 'package:perbug/repositories/deck_repository.dart';
import 'package:perbug/repositories/sessions_repository.dart';
import 'package:perbug/repositories/swipes_repository.dart';
import 'package:perbug/repositories/telemetry_repository.dart';

class _MockDeckRepository extends Mock implements DeckRepository {}

class _MockSwipesRepository extends Mock implements SwipesRepository {}

class _MockTelemetryRepository extends Mock implements TelemetryRepository {}

class _FakePermissionService extends PermissionService {
  @override
  Future<PermissionState> requestLocation() async => PermissionState.granted;

  @override
  Future<PermissionState> checkLocation() async => PermissionState.granted;
}

class _DeniedLocationPermissionService extends LocationPermissionService {
  _DeniedLocationPermissionService()
      : super(permissionService: _DeniedPermissionService(), locationService: _DisabledLocationService());
}

class _DeniedPermissionService extends PermissionService {
  @override
  Future<PermissionState> requestLocation() async => PermissionState.denied;

  @override
  Future<PermissionState> checkLocation() async => PermissionState.denied;
}

class _DisabledLocationService extends LocationService {
  @override
  Future<bool> isLocationServiceEnabled() async => false;

  @override
  Future<AppLocation> getCurrentLocation() {
    throw StateError('location disabled');
  }
}

class _FakeLocationService extends LocationService {
  @override
  Future<bool> isLocationServiceEnabled() async => true;

  @override
  Future<AppLocation> getCurrentLocation() async => AppLocation(
        lat: 37.78,
        lng: -122.41,
        capturedAt: DateTime.utc(2024, 1, 1),
      );
}

class _FakeLocationController extends LocationController {
  _FakeLocationController()
      : super(
          locationPermissionService: LocationPermissionService(permissionService: _FakePermissionService(), locationService: _FakeLocationService()),
          locationService: _FakeLocationService(),
        ) {
    state = state.copyWith(
      status: LocationStatus.ready,
      location: AppLocation(
        lat: 37.78,
        lng: -122.41,
        capturedAt: DateTime.utc(2024, 1, 1),
      ),
    );
  }

  @override
  Future<void> requestPermissionAndLoad() async {}
}

void main() {
  late _MockDeckRepository deckRepository;
  late _MockSwipesRepository swipesRepository;
  late _MockTelemetryRepository telemetryRepository;
  late TelemetryDispatcher dispatcher;
  late SessionsRepository sessionsRepository;
  late _FakeLocationController locationController;

  setUp(() {
    deckRepository = _MockDeckRepository();
    swipesRepository = _MockSwipesRepository();
    telemetryRepository = _MockTelemetryRepository();
    dispatcher = TelemetryDispatcher(
      telemetryRepository: telemetryRepository,
      flushInterval: const Duration(days: 1),
    );
    sessionsRepository = SessionsRepository(sessionsStore: SessionsStore());
    locationController = _FakeLocationController();

    when(() => telemetryRepository.queueSize(any())).thenAnswer((_) async => 0);
    when(() => telemetryRepository.flushSession(any())).thenAnswer((_) async {});
    when(() => telemetryRepository.flushAllActive(sessionIds: any(named: 'sessionIds')))
        .thenAnswer((_) async {});
    when(() => telemetryRepository.enqueueEvent(any(), any()))
        .thenAnswer((_) async {});
    when(() => swipesRepository.recordSwipe(any(), any(), any(), any()))
        .thenAnswer((_) async {});
  });

  test('initial load sets plans and nextCursor', () async {
    const sessionId = 's-1';
    await sessionsRepository.createLocalSession(
      title: 'Test',
      filters: const SessionFilters(categories: [Category.food]),
      members: const [],
    );
    final session = (await sessionsRepository.listActive()).first;

    when(() => deckRepository.fetchDeckBatch(session.sessionId, any())).thenAnswer(
      (_) async => _batch([
        _plan('p1'),
        _plan('p2'),
      ], nextCursor: 'cursor-2', sessionId: session.sessionId),
    );

    final controller = DeckController(
      sessionId: session.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    expect(controller.state.plans.length, 2);
    expect(controller.state.nextCursor, 'cursor-2');
    expect(controller.state.hasMore, true);
    controller.dispose();
  });

  test('swipe removes top and triggers prefetch when low', () async {
    const sessionId = 's-2';
    final created = await sessionsRepository.createLocalSession(
      title: 'Test',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch(
        [for (var i = 0; i < 9; i++) _plan('p$i')],
        nextCursor: 'cursor-1',
        sessionId: created.sessionId,
      ),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch([
        _plan('p9'),
        _plan('p10'),
      ], nextCursor: null, sessionId: created.sessionId),
    );

    await controller.swipeTop(SwipeAction.yes);

    verify(() => swipesRepository.recordSwipe(
          created.sessionId,
          any(that: isA<Plan>().having((p) => p.id, 'id', 'p0')),
          SwipeAction.yes,
          0,
        )).called(1);
    expect(controller.state.currentIndex, 1);
    expect(controller.state.currentItemKey, 'plan:p1');
    expect(controller.state.plans.any((p) => p.id == 'p10'), true);
    controller.dispose();
  });

  test('advancing from card 0 moves deck to card 1', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Advance once',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch([
        _plan('p0'),
        _plan('p1'),
      ], nextCursor: null, sessionId: created.sessionId),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    await controller.swipeTop(SwipeAction.yes);

    expect(controller.state.currentIndex, 1);
    expect(controller.state.currentItemKey, 'plan:p1');
    controller.dispose();
  });

  test('advancing multiple times walks deck in order', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Advance many',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch([
        _plan('p0'),
        _plan('p1'),
        _plan('p2'),
      ], nextCursor: null, sessionId: created.sessionId),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    await controller.swipeTop(SwipeAction.yes);
    expect(controller.state.currentItemKey, 'plan:p1');
    await controller.swipeTop(SwipeAction.no);
    expect(controller.state.currentItemKey, 'plan:p2');
    expect(controller.state.currentIndex, 2);
    controller.dispose();
  });

  test('in-flight fetch append does not snap deck back to previous card', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Race condition',
      filters: const SessionFilters(),
      members: const [],
    );

    final delayedFetch = Completer<DeckBatchResponse>();
    var callCount = 0;
    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer((_) {
      callCount++;
      if (callCount == 1) {
        return Future<DeckBatchResponse>.value(
          _batch([
            _plan('p0'),
            _plan('p1'),
          ], nextCursor: 'cursor-2', sessionId: created.sessionId),
        );
      }
      return delayedFetch.future;
    });

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    final prefetchFuture = controller.maybePrefetchMore();
    await Future<void>.microtask(() {});

    await controller.swipeTop(SwipeAction.yes);
    expect(controller.state.currentItemKey, 'plan:p1');

    delayedFetch.complete(
      _batch([
        _plan('p2'),
        _plan('p3'),
      ], nextCursor: null, sessionId: created.sessionId),
    );
    await prefetchFuture;

    expect(controller.state.currentItemKey, 'plan:p1');
    expect(controller.state.plans.map((p) => p.id), containsAll(<String>['p0', 'p1', 'p2', 'p3']));
    controller.dispose();
  });

  test('exhausting deck then loading next batch advances correctly', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Exhaust and refill',
      filters: const SessionFilters(),
      members: const [],
    );

    var callCount = 0;
    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer((_) async {
      callCount++;
      if (callCount == 1) {
        return _batch([
          _plan('p0'),
        ], nextCursor: 'cursor-next', sessionId: created.sessionId);
      }
      return _batch([
        _plan('p1'),
      ], nextCursor: null, sessionId: created.sessionId);
    });

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    await controller.swipeTop(SwipeAction.yes);

    expect(controller.state.currentItemKey, 'plan:p1');
    expect(controller.state.currentIndex, 1);
    controller.dispose();
  });


  test('append preserves current item identity during prefetch', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Preserve identity',
      filters: const SessionFilters(),
      members: const [],
    );

    final delayedFetch = Completer<DeckBatchResponse>();
    var callCount = 0;
    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer((_) {
      callCount++;
      if (callCount == 1) {
        return Future<DeckBatchResponse>.value(
          _batch([
            _plan('a0'),
            _plan('a1'),
          ], nextCursor: 'cursor-2', sessionId: created.sessionId),
        );
      }
      return delayedFetch.future;
    });

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    expect(controller.state.currentItemKey, 'plan:a0');
    await controller.swipeTop(SwipeAction.yes);
    expect(controller.state.currentItemKey, 'plan:a1');

    final prefetch = controller.maybePrefetchMore();
    delayedFetch.complete(
      _batch([
        _plan('a2'),
        _plan('a3'),
      ], nextCursor: null, sessionId: created.sessionId),
    );

    await prefetch;

    expect(controller.state.currentItemKey, 'plan:a1');
    controller.dispose();
  });


  test('swipe advances index without refreshing current batch', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'No refresh on swipe',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch(
        [for (var i = 0; i < 12; i++) _plan('stable-$i')],
        nextCursor: 'cursor-2',
        sessionId: created.sessionId,
      ),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    await controller.swipeTop(SwipeAction.yes);

    verify(() => deckRepository.fetchDeckBatch(created.sessionId, any())).called(1);
    expect(controller.state.currentIndex, 1);
    expect(controller.state.currentItemKey, 'plan:stable-1');
    controller.dispose();
  });

  test('explicit refresh resets deck position to first card', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Refresh reset',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch(
        [for (var i = 0; i < 3; i++) _plan('reset-$i')],
        nextCursor: 'cursor-r',
        sessionId: created.sessionId,
      ),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    await controller.swipeTop(SwipeAction.yes);
    expect(controller.state.currentIndex, 1);

    await controller.refresh();

    expect(controller.state.currentIndex, 0);
    expect(controller.state.currentItemKey, 'plan:reset-0');
    controller.dispose();
  });

  test('fetch error sets error message', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Test',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any()))
        .thenThrow(Exception('boom'));
    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    expect(controller.state.plans, isEmpty);
    expect(controller.state.errorMessage, isNotNull);
    controller.dispose();
  });

  test('prefetch triggers when remaining is at threshold', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Prefetch',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch(
        [for (var i = 0; i < 6; i++) _plan('prefetch-$i')],
        nextCursor: 'cursor-next',
        sessionId: created.sessionId,
      ),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});
    await controller.maybePrefetchMore();

    verify(() => deckRepository.fetchDeckBatch(created.sessionId, any())).called(greaterThan(1));
    controller.dispose();
  });

  test('batch requests preserve live location context across pagination and refresh', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Location context',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch(
        [for (var i = 0; i < 12; i++) _plan('ctx-$i')],
        nextCursor: 'cursor-next',
        sessionId: created.sessionId,
      ),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});
    await controller.loadNextBatch();
    await controller.refresh();

    final calls = verify(() => deckRepository.fetchDeckBatch(created.sessionId, captureAny())).captured;
    expect(calls, isNotEmpty);
    for (final call in calls.cast<DeckQueryParams>()) {
      expect(call.lat, 37.78);
      expect(call.lng, -122.41);
    }

    controller.dispose();
  });

  test('without a location, deck requires permission instead of fake nearby results', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Needs location',
      filters: const SessionFilters(),
      members: const [],
    );

    final locationlessController = LocationController(
      locationPermissionService: _DeniedLocationPermissionService(),
      locationService: _FakeLocationService(),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationlessController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    expect(controller.state.locationRequired, true);
    verifyNever(() => deckRepository.fetchDeckBatch(created.sessionId, any()));

    controller.dispose();
  });

  test('duplicate IDs are filtered while appending', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Dedupe',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch(
        [for (var i = 0; i < 10; i++) _plan('dupe-$i')],
        nextCursor: 'cursor-1',
        sessionId: created.sessionId,
      ),
    );

    final controller = DeckController(
      sessionId: created.sessionId,
      deckRepository: deckRepository,
      swipesRepository: swipesRepository,
      telemetryRepository: telemetryRepository,
      telemetryDispatcher: dispatcher,
      sessionsRepository: sessionsRepository,
      locationController: locationController,
      adDeckInjector: const AdDeckInjector(config: AdsConfig(enabled: false, admobAppIdIos: '', admobAppIdAndroid: '', nativeUnitIdIos: '', nativeUnitIdAndroid: '', frequencyN: 10, placeFirstAfter: 3, maxAdsPerWindow: 3, adsWindowSize: 50)),
    );

    await Future<void>.microtask(() {});
    await Future<void>.microtask(() {});

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any())).thenAnswer(
      (_) async => _batch(
        [
          _plan('dupe-0'),
          _plan('dupe-1'),
          _plan('fresh-1'),
          _plan('fresh-2'),
        ],
        nextCursor: null,
        sessionId: created.sessionId,
      ),
    );

    await controller.swipeTop(SwipeAction.yes);

    final ids = controller.state.plans.map((p) => p.id).toList(growable: false);
    expect(ids.toSet().length, ids.length);
    expect(ids.contains('fresh-1'), true);
    expect(ids.contains('fresh-2'), true);
    controller.dispose();
  });
}

DeckBatchResponse _batch(List<Plan> plans, {required String sessionId, String? nextCursor}) {
  return DeckBatchResponse(
    sessionId: sessionId,
    plans: plans,
    nextCursor: nextCursor,
    mix: DeckSourceMix(
      providersUsed: const ['google'],
      planSourceCounts: {'google': plans.length},
      categoryCounts: const {'food': 1},
      sponsoredCount: 0,
    ),
  );
}

Plan _plan(String id) => Plan(
      id: id,
      source: 'google',
      sourceId: 'src-$id',
      title: 'Plan $id',
      category: 'food',
      location: const PlanLocation(lat: 1, lng: 2),
    );
