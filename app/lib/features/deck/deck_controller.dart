import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../../models/plan.dart';
import '../../models/telemetry.dart';
import '../../providers/app_providers.dart';
import '../../repositories/deck_repository.dart';
import '../../repositories/sessions_repository.dart';
import 'deck_state.dart';

class DeckController extends StateNotifier<DeckState> {
  DeckController({
    required this.ref,
    required String sessionId,
    required SessionsRepository sessionsRepository,
  })  : _sessionsRepository = sessionsRepository,
        super(DeckState.initial(sessionId));

  final Ref ref;
  final SessionsRepository _sessionsRepository;

  DateTime? _viewStartedAt;

  Future<void> initialize() async {
    await _ensureLocation();
    if (!_hasEffectiveLocation) {
      state = state.copyWith(
        isLoadingInitial: false,
        errorMessage: 'Location required',
      );
      return;
    }
    await refresh();
  }

  Future<void> requestLocation() async {
    await ref.read(locationControllerProvider.notifier).requestPermissionAndLoad();
    await initialize();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoadingInitial: true, clearError: true, plans: []);
    await _fetchBatch(forceRefresh: true);
  }

  Future<void> loadNextBatch() async {
    if (state.isLoadingMore || !state.hasMore) {
      return;
    }

    state = state.copyWith(isLoadingMore: true, clearError: true);
    await _fetchBatch(cursor: state.nextCursor);
  }

  void onSwipeNo() => _swipe('no');
  void onSwipeYes() => _swipe('yes');
  void onSwipeMaybe() => _swipe('maybe');

  void undo() {
    if (state.undoStack.isEmpty) {
      return;
    }

    final restore = state.undoStack.last;
    final undoStack = [...state.undoStack]..removeLast();
    state = state.copyWith(
      plans: [restore.plan, ...state.plans],
      undoStack: undoStack,
    );
    _viewStartedAt = DateTime.now();
  }

  void onCardOpened(Plan plan) {
    _emitCardViewed(plan);
    _enqueueTelemetry(
      TelemetryEventInput.cardOpened(
        planId: plan.id,
        source: plan.source,
      ),
    );
    _viewStartedAt = DateTime.now();
  }

  void onOutboundLinkClicked(Plan plan, String linkType) {
    _enqueueTelemetry(
      TelemetryEventInput.outboundLinkClicked(
        planId: plan.id,
        linkType: linkType,
        source: plan.source,
      ),
    );
  }

  void registerTopCardViewed() {
    _viewStartedAt ??= DateTime.now();
  }

  Future<void> _ensureLocation() async {
    final locationController = ref.read(locationControllerProvider.notifier);
    final locationState = ref.read(locationControllerProvider);

    if (locationState.effectiveLocation != null) {
      return;
    }

    await locationController.requestPermissionAndLoad();
  }

  bool get _hasEffectiveLocation {
    return ref.read(locationControllerProvider).effectiveLocation != null;
  }

  Future<void> _fetchBatch({String? cursor, bool forceRefresh = false}) async {
    final location = ref.read(locationControllerProvider).effectiveLocation;
    if (location == null) {
      state = state.copyWith(
        isLoadingInitial: false,
        isLoadingMore: false,
        errorMessage: 'Location required',
      );
      return;
    }

    try {
      final session = await _sessionsRepository.getById(state.sessionId);
      if (session == null) {
        state = state.copyWith(
          isLoadingInitial: false,
          isLoadingMore: false,
          errorMessage: 'Session not found',
        );
        return;
      }

      final deckRepository = await ref.read(deckRepositoryProvider.future);
      final response = await deckRepository.fetchDeckBatch(
        state.sessionId,
        DeckQueryParams(
          cursor: cursor,
          lat: location.lat,
          lng: location.lng,
          radiusMeters: session.filters.radiusMeters,
          categories: session.filters.categories.map((e) => e.name).toList(),
          openNow: session.filters.openNow,
          priceLevelMax: session.filters.priceLevelMax,
          timeStart: session.filters.timeWindow?.startISO,
          timeEnd: session.filters.timeWindow?.endISO,
        ),
        forceRefresh: forceRefresh,
      );

      final mergedPlans = _mergeUnique(state.plans, response.plans);
      final fallbackCount = response.mix.planSourceCounts.entries
          .where((entry) => entry.key == 'curated' || entry.key == 'byo')
          .fold<int>(0, (sum, entry) => sum + entry.value);

      state = state.copyWith(
        isLoadingInitial: false,
        isLoadingMore: false,
        clearError: true,
        plans: mergedPlans,
        nextCursor: response.nextCursor,
        hasMore: response.nextCursor != null,
        lastBatchMix: response.mix,
        usedFallback: response.plans.isEmpty || fallbackCount >= (response.plans.length ~/ 2),
      );

      _enqueueTelemetry(
        TelemetryEventInput.deckLoaded(
          batchSize: response.plans.length,
          returned: response.plans.length,
          nextCursorPresent: response.nextCursor != null,
          cursor: cursor,
          planSourceCounts: response.mix.planSourceCounts,
        ),
      );

      if (state.plans.isNotEmpty) {
        _viewStartedAt = DateTime.now();
      }
    } catch (_) {
      state = state.copyWith(
        isLoadingInitial: false,
        isLoadingMore: false,
        errorMessage: 'Failed to load deck. Pull to retry.',
      );
    }
  }

  List<Plan> _mergeUnique(List<Plan> current, List<Plan> incoming) {
    final seenIds = current.map((plan) => plan.id).toSet();
    final merged = [...current];

    for (final plan in incoming) {
      if (!seenIds.contains(plan.id)) {
        seenIds.add(plan.id);
        merged.add(plan);
      }
    }

    return merged;
  }

  void _enqueueTelemetry(TelemetryEventInput event) {
    ref.read(telemetryRepositoryProvider.future).then((repo) async {
      repo.enqueue(state.sessionId, event);
      await repo.flush(state.sessionId);
    });
  }

  void _swipe(String action) {
    if (state.plans.isEmpty) {
      return;
    }

    final topPlan = state.plans.first;
    _emitCardViewed(topPlan);

    _enqueueTelemetry(
      TelemetryEventInput.swipe(
        planId: topPlan.id,
        action: action,
        source: topPlan.source,
        position: state.shownPlanIds.length,
      ),
    );

    final remaining = [...state.plans]..removeAt(0);

    state = state.copyWith(
      plans: remaining,
      shownPlanIds: {...state.shownPlanIds, topPlan.id}.toList(),
      undoStack: [
        ...state.undoStack,
        SwipeRecord(plan: topPlan, action: action),
      ],
    );

    _viewStartedAt = DateTime.now();
    if (remaining.length <= 5 && state.hasMore) {
      loadNextBatch();
    }
  }

  void _emitCardViewed(Plan topPlan) {
    final startedAt = _viewStartedAt;
    if (startedAt == null) {
      return;
    }

    _enqueueTelemetry(
      TelemetryEventInput.cardViewed(
        planId: topPlan.id,
        viewMs: DateTime.now().difference(startedAt).inMilliseconds,
        source: topPlan.source,
      ),
    );
  }
}
