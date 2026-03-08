import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/ads/ad_deck_injector.dart';
import '../../core/location/location_controller.dart';
import '../../core/telemetry/telemetry_dispatcher.dart';
import '../../models/deck_batch.dart';
import '../../models/deep_links.dart';
import '../../models/plan.dart';
import '../../models/swipe.dart';
import '../../models/telemetry.dart';
import '../../api/api_error.dart';
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
    required AdDeckInjector adDeckInjector,
  })  : _sessionId = sessionId,
        _deckRepository = deckRepository,
        _swipesRepository = swipesRepository,
        _telemetryRepository = telemetryRepository,
        _telemetryDispatcher = telemetryDispatcher,
        _sessionsRepository = sessionsRepository,
        _locationController = locationController,
        _adDeckInjector = adDeckInjector,
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
  final AdDeckInjector _adDeckInjector;

  static const int _batchLimit = 25;
  static const double _debugDefaultLat = 44.8620;
  static const double _debugDefaultLng = -93.5590;

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
      items: const <DeckItem>[],
      undoStack: const <DeckSwipeRecord>[],
      shownPlanIds: const <String>[],
      locationRequired: false,
      showCachedResultsNotice: false,
      usingOfflineCachedData: false,
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
    if (state.plans.length <= 8 && state.hasMore && !state.isLoadingMore) {
      await _loadBatch();
    }
  }

  Future<void> swipeTop(SwipeAction action) async {
    if (state.items.isEmpty) {
      return;
    }

    final topItem = state.items.first;
    if (topItem is DeckAdItem) {
      final nextItems = [...state.items]..removeAt(0);
      state = state.copyWith(items: nextItems, clearError: true);
      _startViewingTopCard();
      await loadMoreIfNeeded();
      return;
    }

    final plan = (topItem as DeckPlanItem).plan;
    const position = 0;

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
      items: _adDeckInjector.inject(plans: nextPlans),
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
      _ => SwipeAction.no,
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
    final nextPlans = [record.plan, ...state.plans];
    state = state.copyWith(
      plans: nextPlans,
      items: _adDeckInjector.inject(plans: nextPlans),
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

  void clearCachedResultsNotice() {
    if (!state.showCachedResultsNotice) {
      return;
    }
    state = state.copyWith(showCachedResultsNotice: false);
  }

  Future<void> _loadBatch({bool reset = false}) async {
    if (state.locationRequired) {
      return;
    }

    var location = _locationController.state.effectiveLocation;
    if (location == null && kDebugMode) {
      _locationController.setManualOverride(_debugDefaultLat, _debugDefaultLng);
      location = _locationController.state.effectiveLocation;
    }
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
      final params = DeckQueryParams(
        cursor: requestedCursor,
        maxResults: _batchLimit,
        lat: location.lat,
        lng: location.lng,
        radiusMeters: filters.radiusMeters,
        categories: filters.categories.map((e) => e.name).toList(growable: false),
        openNow: filters.openNow,
        priceLevelMax: filters.priceLevelMax,
        timeStart: filters.timeWindow?.startISO,
        timeEnd: filters.timeWindow?.endISO,
      );

      final batch = await _deckRepository.fetchDeckBatch(_sessionId, params);
      _applyBatch(batch, reset: reset, requestedCursor: requestedCursor);
    } catch (error) {
      state = state.copyWith(
        isLoadingInitial: false,
        isLoadingMore: false,
        errorMessage: _formatLoadError(error),
      );
    }
  }

  void _applyBatch(
    DeckBatchResponse batch, {
    required bool reset,
    required String? requestedCursor,
    bool showCachedNotice = false,
    bool usingOfflineCachedData = false,
  }) {
    final merged = reset ? batch.plans : [...state.plans, ...batch.plans];
    final deduped =
        <String, Plan>{for (final plan in merged) plan.id: plan}.values.toList();

    state = state.copyWith(
      isLoadingInitial: false,
      isLoadingMore: false,
      plans: deduped,
      items: _adDeckInjector.inject(plans: deduped),
      nextCursor: batch.nextCursor,
      hasMore: batch.nextCursor != null,
      lastBatchMix: batch.mix,
      usedFallback: false,
      showCachedResultsNotice: showCachedNotice,
      usingOfflineCachedData: usingOfflineCachedData,
    );

    _enqueueTelemetry(
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
  }



  String _formatLoadError(Object error) {
    if (error is ApiError) {
      if (error.kind == ApiErrorKind.http && error.statusCode != null) {
        return 'Could not load plans (HTTP ${error.statusCode})';
      }
      if (error.kind == ApiErrorKind.decoding) {
        return 'Parse error: ${error.details ?? error.message}';
      }
      if (error.kind == ApiErrorKind.network) {
        return 'Could not load plans (network unavailable)';
      }
      return 'Could not load plans (${error.message})';
    }
    if (error is FormatException) {
      return error.message;
    }
    return 'Could not load plans (${error.toString()})';
  }

  Future<void> _ensureLocation() async {
    final existing = _locationController.state.effectiveLocation;
    if (existing != null) {
      state = state.copyWith(locationRequired: false);
      return;
    }

    await _locationController.requestPermissionAndLoad();
    final loaded = _locationController.state.effectiveLocation;

    if (loaded == null && kDebugMode) {
      _locationController.setManualOverride(_debugDefaultLat, _debugDefaultLng);
    }

    if (_locationController.state.effectiveLocation == null) {
      state = state.copyWith(
        isLoadingInitial: false,
        locationRequired: true,
        errorMessage: 'Location required',
      );
    }
  }

  void _startViewingTopCard() {
    if (state.items.isEmpty || state.items.first is! DeckPlanItem) {
      _viewStartedAt = null;
      _viewPlanId = null;
      return;
    }
    final topPlan = (state.items.first as DeckPlanItem).plan;
    _viewStartedAt = DateTime.now();
    _viewPlanId = topPlan.id;
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
