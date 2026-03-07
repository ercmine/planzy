import 'dart:async';

import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../../core/telemetry/telemetry_dispatcher.dart';
import '../../models/deep_links.dart';
import '../../models/plan.dart';
import '../../models/swipe.dart';
import '../../models/telemetry.dart';
import '../../repositories/deck_repository.dart';
import '../../repositories/sessions_repository.dart';
import '../../repositories/swipes_repository.dart';
import '../../repositories/telemetry_repository.dart';
import 'deck_state.dart';

class DeckController extends StateNotifier<DeckState> {
  DeckController({
    required String sessionId,
    required DeckRepository deckRepository,
    required SwipesRepository swipesRepository,
    required TelemetryRepository telemetryRepository,
    required TelemetryDispatcher telemetryDispatcher,
    required SessionsRepository sessionsRepository,
    required LocationController locationController,
  })  : _sessionId = sessionId,
        _deckRepository = deckRepository,
        _swipesRepository = swipesRepository,
        _telemetryRepository = telemetryRepository,
        _telemetryDispatcher = telemetryDispatcher,
        _sessionsRepository = sessionsRepository,
        _locationController = locationController,
        super(DeckState.initial(sessionId)) {
    _telemetryDispatcher.setActiveSession(_sessionId);
    Future<void>.microtask(initialize);
  }

  final String _sessionId;
  final DeckRepository _deckRepository;
  final SwipesRepository _swipesRepository;
  final TelemetryRepository _telemetryRepository;
  final TelemetryDispatcher _telemetryDispatcher;
  final SessionsRepository _sessionsRepository;
  final LocationController _locationController;

  static const int _batchLimit = 25;

  DateTime? _viewStartedAt;
  String? _viewPlanId;

  @override
  void dispose() {
    _telemetryDispatcher.clearActiveSession();
    super.dispose();
  }

  Future<void> initialize() async {
    await _ensureLocation();
    if (!state.locationRequired) {
      await refresh();
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(
      isLoadingInitial: true,
      clearError: true,
      clearCursor: true,
      hasMore: true,
      plans: const <Plan>[],
      undoStack: const <DeckSwipeRecord>[],
      shownPlanIds: const <String>[],
      locationRequired: false,
    );
    await _loadBatch(reset: true);
  }

  Future<void> requestLocationAndReload() async {
    await _locationController.requestPermissionAndLoad();
    await _ensureLocation();
    if (!state.locationRequired) {
      await refresh();
    }
  }

  Future<void> loadMoreIfNeeded() async {
    if (state.plans.length <= 5 && state.hasMore && !state.isLoadingMore) {
      await _loadBatch();
    }
  }

  Future<void> swipeTop(SwipeAction action) async {
    if (state.plans.isEmpty) {
      return;
    }

    final plan = state.plans.first;
    final position = 0;

    await _emitCardViewedIfNeeded(plan);

    await _swipesRepository.recordSwipe(_sessionId, plan, action, position);
    await _enqueueTelemetry(
      TelemetryEventInput.swipe(
        planId: plan.id,
        action: action.name,
        position: position,
        cursor: state.nextCursor,
        source: plan.source,
      ),
    );

    final nextPlans = [...state.plans]..removeAt(0);
    final shownIds = {...state.shownPlanIds, plan.id}.toList(growable: false);
    final undo = [
      DeckSwipeRecord(plan: plan, action: action, position: position),
      ...state.undoStack,
    ];

    state = state.copyWith(
      plans: nextPlans,
      undoStack: undo,
      shownPlanIds: shownIds,
      clearError: true,
    );

    _startViewingTopCard();
    await loadMoreIfNeeded();
  }

  Future<void> handleSwipeDirection(CardSwiperDirection direction) async {
    final action = switch (direction) {
      CardSwiperDirection.left => SwipeAction.no,
      CardSwiperDirection.right => SwipeAction.yes,
      CardSwiperDirection.top => SwipeAction.maybe,
      CardSwiperDirection.none => null,
      CardSwiperDirection.bottom => null,
    };

    if (action != null) {
      await swipeTop(action);
    }
  }

  Future<void> undo() async {
    if (state.undoStack.isEmpty) {
      return;
    }

    final record = state.undoStack.first;
    final remainingUndo = [...state.undoStack]..removeAt(0);
    state = state.copyWith(
      plans: [record.plan, ...state.plans],
      undoStack: remainingUndo,
    );
    _startViewingTopCard();
  }

  Future<void> onCardOpened(Plan plan) async {
    await _enqueueTelemetry(
      TelemetryEventInput.cardOpened(
        planId: plan.id,
        section: 'details',
        cursor: state.nextCursor,
        source: plan.source,
      ),
    );
  }

  Future<void> onOutboundLinkTapped({
    required Plan plan,
    required String linkType,
  }) async {
    await _enqueueTelemetry(
      TelemetryEventInput.outboundLinkClicked(
        planId: plan.id,
        linkType: linkType,
        affiliate: false,
        cursor: state.nextCursor,
        source: plan.source,
      ),
    );
  }

  List<MapEntry<String, Uri>> availableLinks(DeepLinks? links) {
    if (links == null) {
      return const <MapEntry<String, Uri>>[];
    }

    final values = <MapEntry<String, String?>>[
      MapEntry('maps', links.mapsLink),
      MapEntry('website', links.websiteLink),
      MapEntry('call', links.callLink),
      MapEntry('booking', links.bookingLink),
      MapEntry('tickets', links.ticketLink),
    ];

    return values
        .where((entry) => entry.value != null && entry.value!.isNotEmpty)
        .map((entry) => MapEntry(entry.key, Uri.parse(entry.value!)))
        .toList(growable: false);
  }

  Future<void> _loadBatch({bool reset = false}) async {
    if (state.locationRequired) {
      return;
    }

    final location = _locationController.state.effectiveLocation;
    if (location == null) {
      state = state.copyWith(
        isLoadingInitial: false,
        locationRequired: true,
        errorMessage: 'Location required',
      );
      return;
    }

    if (state.isLoadingMore || (state.isLoadingInitial && !reset)) {
      return;
    }

    state = state.copyWith(
      isLoadingInitial: reset,
      isLoadingMore: !reset,
      clearError: true,
    );

    try {
      final session = await _sessionsRepository.getById(_sessionId);
      if (session == null) {
        state = state.copyWith(
          isLoadingInitial: false,
          isLoadingMore: false,
          errorMessage: 'Session not found',
        );
        return;
      }

      final filters = session.filters;
      final requestedCursor = reset ? null : state.nextCursor;
      final batch = await _deckRepository.fetchDeckBatch(
        _sessionId,
        DeckQueryParams(
          cursor: requestedCursor,
          limit: _batchLimit,
          lat: location.lat,
          lng: location.lng,
          radiusMeters: filters.radiusMeters,
          categories: filters.categories.map((e) => e.name).toList(growable: false),
          openNow: filters.openNow,
          priceLevelMax: filters.priceLevelMax,
          timeStart: filters.timeWindow?.startISO,
          timeEnd: filters.timeWindow?.endISO,
        ),
      );

      final merged = reset ? batch.plans : [...state.plans, ...batch.plans];
      final deduped = <String, Plan>{for (final plan in merged) plan.id: plan}.values.toList();

      final sourceCounts = batch.mix.planSourceCounts;
      final curatedFallbackCount =
          (sourceCounts['curated'] ?? 0) + (sourceCounts['byo'] ?? 0);
      final usedFallback = batch.plans.isEmpty || curatedFallbackCount >= (batch.plans.length / 2);

      state = state.copyWith(
        isLoadingInitial: false,
        isLoadingMore: false,
        plans: deduped,
        nextCursor: batch.nextCursor,
        hasMore: batch.nextCursor != null,
        lastBatchMix: batch.mix,
        usedFallback: usedFallback,
      );

      await _enqueueTelemetry(
        TelemetryEventInput.deckLoaded(
          batchSize: _batchLimit,
          returned: batch.plans.length,
          nextCursorPresent: batch.nextCursor != null,
          planSourceCounts: batch.mix.planSourceCounts,
          cursor: requestedCursor,
          deckKey: batch.debug?.requestId,
        ),
      );

      _startViewingTopCard();
    } catch (error) {
      state = state.copyWith(
        isLoadingInitial: false,
        isLoadingMore: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> _ensureLocation() async {
    final existing = _locationController.state.effectiveLocation;
    if (existing != null) {
      state = state.copyWith(locationRequired: false);
      return;
    }

    await _locationController.requestPermissionAndLoad();
    final loaded = _locationController.state.effectiveLocation;

    if (loaded == null) {
      state = state.copyWith(
        isLoadingInitial: false,
        locationRequired: true,
        errorMessage: 'Location required',
      );
    }
  }

  void _startViewingTopCard() {
    if (state.plans.isEmpty) {
      _viewStartedAt = null;
      _viewPlanId = null;
      return;
    }
    _viewStartedAt = DateTime.now();
    _viewPlanId = state.plans.first.id;
  }

  Future<void> _emitCardViewedIfNeeded(Plan plan) async {
    if (_viewStartedAt == null || _viewPlanId != plan.id) {
      return;
    }

    final viewMs = DateTime.now().difference(_viewStartedAt!).inMilliseconds;
    await _enqueueTelemetry(
      TelemetryEventInput.cardViewed(
        planId: plan.id,
        viewMs: viewMs,
        cursor: state.nextCursor,
        position: 0,
        source: plan.source,
      ),
    );
  }

  Future<void> _enqueueTelemetry(TelemetryEventInput event) async {
    await _telemetryRepository.enqueueEvent(_sessionId, event);
    await _telemetryDispatcher.notifyEventQueued(_sessionId);
  }
}
