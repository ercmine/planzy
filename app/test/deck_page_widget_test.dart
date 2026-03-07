import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ourplanplan/core/env/env.dart';
import 'package:ourplanplan/core/location/location_controller.dart';
import 'package:ourplanplan/core/location/location_models.dart';
import 'package:ourplanplan/core/location/location_service.dart';
import 'package:ourplanplan/core/permissions/permission_service.dart';
import 'package:ourplanplan/core/permissions/permission_state.dart';
import 'package:ourplanplan/core/telemetry/telemetry_dispatcher.dart';
import 'package:ourplanplan/features/deck/deck_controller.dart';
import 'package:ourplanplan/features/deck/deck_page.dart';
import 'package:ourplanplan/models/deck_batch.dart';
import 'package:ourplanplan/models/plan.dart';
import 'package:ourplanplan/models/session.dart';
import 'package:ourplanplan/models/session_filters.dart';
import 'package:ourplanplan/models/session_member.dart';
import 'package:ourplanplan/repositories/deck_repository.dart';
import 'package:ourplanplan/repositories/sessions_repository.dart';
import 'package:ourplanplan/repositories/swipes_repository.dart';
import 'package:ourplanplan/repositories/telemetry_repository.dart';
import 'package:ourplanplan/providers/app_providers.dart';

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
  testWidgets('Deck page renders and Yes removes top plan', (tester) async {
    final deckRepository = _MockDeckRepository();
    final swipesRepository = _MockSwipesRepository();
    final telemetryRepository = _MockTelemetryRepository();
    final telemetryDispatcher = TelemetryDispatcher(
      telemetryRepository: telemetryRepository,
      flushInterval: const Duration(days: 1),
    );
    final sessionsRepository = SessionsRepository(sessionsStore: _InMemorySessionsStore());
    final locationController = _FakeLocationController();

    when(() => telemetryRepository.queueSize(any())).thenAnswer((_) async => 0);
    when(() => telemetryRepository.flushSession(any())).thenAnswer((_) async {});
    when(() => telemetryRepository.flushAllActive(sessionIds: any(named: 'sessionIds')))
        .thenAnswer((_) async {});
    when(() => telemetryRepository.enqueueEvent(any(), any()))
        .thenAnswer((_) async {});
    when(() => swipesRepository.recordSwipe(any(), any(), any(), any()))
        .thenAnswer((_) async {});

    final session = await sessionsRepository.createLocalSession(
      title: 'Widget Test Session',
      filters: const SessionFilters(),
      members: const [],
    );

    when(() => deckRepository.fetchDeckBatch(session.sessionId, any())).thenAnswer(
      (_) async => DeckBatchResponse(
        sessionId: session.sessionId,
        plans: [_plan('plan-1')],
        nextCursor: null,
        mix: const DeckSourceMix(planSourceCounts: {'google': 1}),
      ),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          envConfigProvider.overrideWithValue(
            const EnvConfig(
              flavor: EnvFlavor.dev,
              apiBaseUrl: 'https://example.test',
              enableDebugLogs: true,
              associatedDomain: 'example.test',
            ),
          ),
          deckRepositoryProvider.overrideWith((ref) async => deckRepository),
          telemetryRepositoryProvider.overrideWith((ref) async => telemetryRepository),
          swipesRepositoryProvider.overrideWith((ref) => swipesRepository),
          sessionsRepositoryProvider.overrideWith((ref) => sessionsRepository),
          locationControllerProvider.overrideWith((ref) => locationController),
          deckControllerProvider.overrideWith((ref, sessionId) {
            return DeckController(
              sessionId: sessionId,
              deckRepository: deckRepository,
              swipesRepository: swipesRepository,
              telemetryRepository: telemetryRepository,
              telemetryDispatcher: telemetryDispatcher,
              sessionsRepository: sessionsRepository,
              locationController: locationController,
            );
          }),
        ],
        child: MaterialApp(home: DeckPage(sessionId: session.sessionId)),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Plan plan-1'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Yes'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'No'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Maybe'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Yes'));
    await tester.pumpAndSettle();

    expect(find.text('No more ideas right now'), findsOneWidget);
  });
}

class _InMemorySessionsStore extends SessionsStore {
  final Map<String, Session> _sessions = {};

  @override
  Future<List<Session>> loadSessions() async => _sessions.values.toList(growable: false);

  @override
  Future<Session?> getSession(String sessionId) async => _sessions[sessionId];

  @override
  Future<void> upsertSession(Session session) async {
    _sessions[session.sessionId] = session;
  }

  @override
  Future<void> deleteSession(String sessionId) async {
    _sessions.remove(sessionId);
  }

  @override
  Future<void> updateSessionFilters(String sessionId, SessionFilters filters) async {
    final session = _sessions[sessionId];
    if (session != null) {
      _sessions[sessionId] = session.copyWith(filters: filters);
    }
  }

  @override
  Future<void> updateSessionMembers(String sessionId, List<SessionMember> members) async {
    final session = _sessions[sessionId];
    if (session != null) {
      _sessions[sessionId] = session.copyWith(members: members);
    }
  }

  @override
  Future<void> setLastCursor(String sessionId, String? cursor) async {
    final session = _sessions[sessionId];
    if (session != null) {
      _sessions[sessionId] = session.copyWith(lastCursor: cursor);
    }
  }
}

Plan _plan(String id) => Plan(
      id: id,
      source: 'google',
      sourceId: 'src-$id',
      title: 'Plan $id',
      category: 'food',
      location: const PlanLocation(lat: 1, lng: 2),
    );
