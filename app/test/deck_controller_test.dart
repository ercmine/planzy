import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:perbug/core/ads/ad_deck_injector.dart';
import 'package:perbug/core/ads/ads_config.dart';
import 'package:perbug/core/location/location_controller.dart';
import 'package:perbug/core/location/location_models.dart';
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
          permissionService: _FakePermissionService(),
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
    expect(controller.state.plans.first.id, 'p1');
    expect(controller.state.plans.any((p) => p.id == 'p10'), true);
    controller.dispose();
  });

  test('fetch error falls back to cached batch when available', () async {
    final created = await sessionsRepository.createLocalSession(
      title: 'Test',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(created.sessionId, any()))
        .thenThrow(Exception('boom'));
    when(() => deckRepository.getCachedDeckBatch(created.sessionId, any())).thenReturn(
      _batch([
        _plan('cached-1'),
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

    expect(controller.state.plans.first.id, 'cached-1');
    expect(controller.state.showCachedResultsNotice, true);
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
