import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../models/plan.dart';
import '../../models/swipe.dart';
import '../../models/telemetry.dart';
import '../../repositories/deck_repository.dart';
import '../../repositories/sessions_repository.dart';
import '../../repositories/swipes_repository.dart';
import '../../repositories/telemetry_repository.dart';

class DeckState {
  const DeckState({
    required this.isLoading,
    required this.plans,
    required this.currentIndex,
    required this.totalSwipes,
    this.errorMessage,
    this.cursor,
  });

  factory DeckState.initial() => const DeckState(
        isLoading: true,
        plans: <Plan>[],
        currentIndex: 0,
        totalSwipes: 0,
      );

  final bool isLoading;
  final List<Plan> plans;
  final int currentIndex;
  final int totalSwipes;
  final String? errorMessage;
  final String? cursor;

  bool get hasCurrentPlan => currentIndex < plans.length;
  Plan? get currentPlan => hasCurrentPlan ? plans[currentIndex] : null;

  DeckState copyWith({
    bool? isLoading,
    List<Plan>? plans,
    int? currentIndex,
    int? totalSwipes,
    String? errorMessage,
    String? cursor,
    bool clearError = false,
  }) {
    return DeckState(
      isLoading: isLoading ?? this.isLoading,
      plans: plans ?? this.plans,
      currentIndex: currentIndex ?? this.currentIndex,
      totalSwipes: totalSwipes ?? this.totalSwipes,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      cursor: cursor ?? this.cursor,
    );
  }
}

class DeckController extends StateNotifier<DeckState> {
  DeckController({
    required String sessionId,
    required DeckRepository deckRepository,
    required SwipesRepository swipesRepository,
    required TelemetryRepository telemetryRepository,
    required SessionsRepository sessionsRepository,
  })  : _sessionId = sessionId,
        _deckRepository = deckRepository,
        _swipesRepository = swipesRepository,
        _telemetryRepository = telemetryRepository,
        _sessionsRepository = sessionsRepository,
        super(DeckState.initial()) {
    Future<void>.microtask(_loadInitial);
  }

  static const int swipesThreshold = 15;

  final String _sessionId;
  final DeckRepository _deckRepository;
  final SwipesRepository _swipesRepository;
  final TelemetryRepository _telemetryRepository;
  final SessionsRepository _sessionsRepository;

  bool get showResultsCTA => state.totalSwipes >= swipesThreshold;

  Future<void> _loadInitial() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final count = await _swipesRepository.getSwipeCount(_sessionId);
      final batch = await _deckRepository.fetchDeckBatch(_sessionId, const DeckQueryParams());
      await _sessionsRepository.setLastCursor(_sessionId, batch.nextCursor);

      _telemetryRepository.enqueue(
        _sessionId,
        TelemetryEventInput.deckLoaded(
          batchSize: batch.plans.length,
          returned: batch.plans.length,
          nextCursorPresent: batch.nextCursor != null,
          cursor: batch.nextCursor,
          clientAtISO: DateTime.now().toUtc().toIso8601String(),
        ),
      );
      await _telemetryRepository.flush(_sessionId);

      state = state.copyWith(
        isLoading: false,
        plans: batch.plans,
        cursor: batch.nextCursor,
        totalSwipes: count,
      );
    } catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    }
  }

  Future<void> swipeCurrent(SwipeAction action) async {
    final plan = state.currentPlan;
    if (plan == null) {
      return;
    }

    final position = state.currentIndex;

    await _swipesRepository.recordSwipe(_sessionId, plan, action, position);

    _telemetryRepository.enqueue(
      _sessionId,
      TelemetryEventInput.swipe(
        planId: plan.id,
        action: action.name,
        position: position,
        cursor: state.cursor,
        source: plan.source,
        clientAtISO: DateTime.now().toUtc().toIso8601String(),
      ),
    );
    await _telemetryRepository.flush(_sessionId);

    state = state.copyWith(
      currentIndex: state.currentIndex + 1,
      totalSwipes: state.totalSwipes + 1,
    );
  }
}
