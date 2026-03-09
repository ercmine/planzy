import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/ads/ad_deck_injector.dart';
import '../../core/location/location_controller.dart';
import '../../core/telemetry/telemetry_dispatcher.dart';
import '../../models/deck_batch.dart';
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

  static const int _batchLimit = 20;
  static const int _prefetchThreshold = 5;
  static const int _minNewItems = 10;
  static const int _maxExtraFetchAttempts = 3;
  static const List<int> _radiusPattern = <int>[5000, 10000, 30000];
  static const double _debugDefaultLat = 44.8620;
  static const double _debugDefaultLng = -93.5590;

  DateTime? _viewStartedAt;
  String? _viewPlanId;
  int _batchRequestCounter = 0;
  int _latestAppliedBatchRequest = 0;

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
      answeredPlanIds: const <String>{},
      seenPlanIds: const <String>{},
      locationRequired: false,
      showCachedResultsNotice: false,
      usingOfflineCachedData: false,
      isLoadingNextBatch: false,
      clearNextBatchError: true,
      currentIndex: 0,
      clearCurrentItemKey: true,
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

  Future<void> maybePrefetchMore() async {
    final remaining = state.items.length - _resolveCurrentIndex() - 1;
    if (remaining <= _prefetchThreshold && !state.isLoadingMore && !state.isLoadingNextBatch) {
      await _loadBatch();
    }
  }

  Future<void> swipeTop(SwipeAction action) async {
    if (state.items.isEmpty) {
      return;
    }

    final currentIndex = _resolveCurrentIndex();
    if (currentIndex < 0 || currentIndex >= state.items.length) {
      if (state.hasMore) {
        await loadNextBatch();
      }
      return;
    }

    final topItem = state.items[currentIndex];
    if (kDebugMode) {
      debugPrint(
        '[Deck] advance source=${action.name} idx=$currentIndex key=${topItem.itemKey} len=${state.items.length}',
      );
    }

    if (topItem is DeckAdItem) {
      _advanceAcrossDeck(source: 'ad-${action.name}');
      await maybePrefetchMore();
      if (state.currentIndex >= state.items.length && state.hasMore) {
        await loadNextBatch();
      }
      return;
    }

    final plan = (topItem as DeckPlanItem).plan;
    const position = 0;

    await _emitCardViewedIfNeeded(plan);

    final shownIds = {...state.shownPlanIds, plan.id}.toList(growable: false);
    final answeredPlanIds = {...state.answeredPlanIds, plan.id};
    final undo = [
      DeckSwipeRecord(plan: plan, action: action, position: position),
      ...state.undoStack,
    ];
    final nextIndex = _nextIndex(currentIndex, state.items);

    state = state.copyWith(
      currentIndex: nextIndex,
      currentItemKey: nextIndex >= state.items.length ? null : state.items[nextIndex].itemKey,
      undoStack: undo,
      shownPlanIds: shownIds,
      answeredPlanIds: answeredPlanIds,
      seenPlanIds: {...state.seenPlanIds, plan.id},
      clearError: true,
      clearNextBatchError: true,
    );

    if (kDebugMode) {
      debugPrint(
        '[Deck] advanced oldPlan=${plan.id} -> newKey=${state.currentItemKey ?? 'none'} len=${state.items.length}',
      );
    }

    _startViewingTopCard();
    await maybePrefetchMore();

    await _swipesRepository.recordSwipe(_sessionId, plan, action, position);
    unawaited(_enqueueTelemetry(
      TelemetryEventInput.swipe(
        planId: plan.id,
        action: action.name,
        position: position,
        cursor: state.nextCursor,
        source: plan.source,
      ),
    ));

    if (state.currentIndex >= state.items.length && state.hasMore) {
      await loadNextBatch();
    }
  }

  Future<void> loadNextBatch() async {
    if (state.isLoadingNextBatch || state.locationRequired) {
      return;
    }

    state = state.copyWith(
      isLoadingNextBatch: true,
      clearNextBatchError: true,
      clearError: true,
    );

    await _loadBatch();

    if (state.errorMessage != null) {
      state = state.copyWith(
        isLoadingNextBatch: false,
        nextBatchErrorMessage: "Couldn't load new plans. Tap to retry.",
      );
      return;
    }

    state = state.copyWith(
      isLoadingNextBatch: false,
      clearNextBatchError: true,
    );
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

    if (state.currentIndex <= 0) {
      return;
    }

    final record = state.undoStack.first;
    final remainingUndo = [...state.undoStack]..removeAt(0);
    final restoredAnswers = {...state.answeredPlanIds}..remove(record.plan.id);
    final nextIndex = math.max(0, state.currentIndex - 1);
    state = state.copyWith(
      currentIndex: nextIndex,
      currentItemKey: state.items[nextIndex].itemKey,
      answeredPlanIds: restoredAnswers,
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

  List<MapEntry<String, Uri>> availableLinks(PlanDeepLinks? links) {
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
        errorMessage: 'Enable location to discover nearby places.',
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
      final requestId = ++_batchRequestCounter;
      final preLoadLength = state.plans.length;
      final session = await _sessionsRepository.getById(_sessionId);
      if (session == null) {
        state = state.copyWith(
          isLoadingInitial: false,
          isLoadingMore: false,
          errorMessage: 'This planning session is no longer available.',
        );
        return;
      }

      final filters = session.filters;
      final requestedCursor = reset ? null : state.nextCursor;
      var supportsCursor = state.nextCursor != null || requestedCursor != null;
      final radiusMeters = supportsCursor
          ? filters.radiusMeters
          : _radiusPattern[(state.seenPlanIds.length ~/ _batchLimit) % _radiusPattern.length];

      final batches = <Plan>[];
      String? nextCursor = requestedCursor;
      var attempts = 0;
      while (attempts <= _maxExtraFetchAttempts && batches.length < _minNewItems) {
        final pageParams = DeckQueryParams(
          cursor: nextCursor,
          maxResults: _batchLimit,
          lat: location.lat,
          lng: location.lng,
          radiusMeters: supportsCursor
              ? radiusMeters
              : _radiusPattern[(state.seenPlanIds.length + attempts * _prefetchThreshold) %
                  _radiusPattern.length],
          categories: filters.categories.map((e) => e.name).toList(growable: false),
          openNow: filters.openNow,
          priceLevelMax: filters.priceLevelMax,
          timeStart: filters.timeWindow?.startISO,
          timeEnd: filters.timeWindow?.endISO,
          seed: _sessionId,
        );
        final batch = await _deckRepository.fetchDeckBatch(_sessionId, pageParams);
        if (batch.nextCursor != null) {
          supportsCursor = true;
        }
        nextCursor = batch.nextCursor;
        final fresh = batch.plans.where((plan) => !state.seenPlanIds.contains(plan.id));
        batches.addAll(fresh);
        if (!supportsCursor && batch.plans.isEmpty) {
          break;
        }
        if (supportsCursor && nextCursor == null) {
          break;
        }
        attempts++;
      }

      if (requestId < _latestAppliedBatchRequest) {
        if (kDebugMode) {
          debugPrint('[Deck] stale batch ignored request=$requestId latest=$_latestAppliedBatchRequest');
        }
        state = state.copyWith(isLoadingInitial: false, isLoadingMore: false);
        return;
      }

      _applyBatch(
        DeckBatchResponse(
          sessionId: _sessionId,
          plans: batches,
          nextCursor: nextCursor,
          mix: const DeckSourceMix(),
        ),
        reset: reset,
        requestedCursor: requestedCursor,
        requestId: requestId,
      );

      if (kDebugMode) {
        debugPrint(
          '[Deck] fetch complete request=$requestId lenBefore=$preLoadLength lenAfter=${state.plans.length} '
          'cursor=${state.nextCursor ?? 'none'}',
        );
      }

      if (batches.length < _minNewItems) {
        state = state.copyWith(
          nextBatchErrorMessage: 'You\'re out of new nearby plans. Try expanding your radius.',
        );
      }
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
    required int requestId,
    bool showCachedNotice = false,
    bool usingOfflineCachedData = false,
  }) {
    final filteredBatchPlans = batch.plans
        .where((plan) => !state.seenPlanIds.contains(plan.id))
        .toList(growable: false);
    final merged = reset ? filteredBatchPlans : [...state.plans, ...filteredBatchPlans];
    final deduped =
        <String, Plan>{for (final plan in merged) plan.id: plan}.values.toList();

    final nextItems = _adDeckInjector.inject(plans: deduped);
    final nextIndex = _resolveIndexForUpdatedItems(
      previousKey: reset ? null : state.currentItemKey,
      items: nextItems,
    );

    _latestAppliedBatchRequest = requestId;

    state = state.copyWith(
      isLoadingInitial: false,
      isLoadingMore: false,
      plans: deduped,
      items: nextItems,
      currentIndex: nextIndex,
      currentItemKey: nextItems.isEmpty ? null : nextItems[nextIndex].itemKey,
      nextCursor: batch.nextCursor,
      hasMore: batch.nextCursor != null || filteredBatchPlans.isNotEmpty,
      lastBatchMix: batch.mix,
      usedFallback: false,
      showCachedResultsNotice: showCachedNotice,
      usingOfflineCachedData: usingOfflineCachedData,
      answeredPlanIds: reset ? const <String>{} : state.answeredPlanIds,
      seenPlanIds: {...state.seenPlanIds, ...filteredBatchPlans.map((p) => p.id)},
      clearNextBatchError: true,
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



  int _resolveCurrentIndex() {
    if (state.items.isEmpty) {
      return 0;
    }
    final key = state.currentItemKey;
    if (key != null) {
      final byKey = state.items.indexWhere((item) => item.itemKey == key);
      if (byKey >= 0) {
        return byKey;
      }
    }
    return math.min(state.currentIndex, state.items.length);
  }

  int _firstDisplayableIndex(List<DeckItem> items) {
    if (items.isEmpty) {
      return 0;
    }
    return 0;
  }

  int _resolveIndexForUpdatedItems({
    required String? previousKey,
    required List<DeckItem> items,
  }) {
    if (items.isEmpty) {
      return 0;
    }
    if (previousKey == null) {
      return _firstDisplayableIndex(items);
    }
    final currentInNext = items.indexWhere((item) => item.itemKey == previousKey);
    if (currentInNext >= 0) {
      return currentInNext;
    }
    return _firstDisplayableIndex(items);
  }

  int _nextIndex(int currentIndex, List<DeckItem> items) {
    if (items.isEmpty) {
      return 0;
    }
    return math.min(currentIndex + 1, items.length);
  }

  void _advanceAcrossDeck({required String source}) {
    final currentIndex = _resolveCurrentIndex();
    final nextIndex = _nextIndex(currentIndex, state.items);
    if (nextIndex == currentIndex) {
      return;
    }
    final nextKey = nextIndex >= state.items.length ? null : state.items[nextIndex].itemKey;
    if (nextKey == state.currentItemKey) {
      return;
    }
    state = state.copyWith(
      currentIndex: nextIndex,
      currentItemKey: nextKey,
      clearError: true,
    );
    if (kDebugMode) {
      debugPrint('[Deck] advanced source=$source -> idx=$nextIndex key=${nextKey ?? 'none'}');
    }
    _startViewingTopCard();
  }

  String _formatLoadError(Object error) {
    if (error is ApiError) {
      if (error.kind == ApiErrorKind.http && error.statusCode != null) {
        return 'We could not refresh places right now. Please try again in a moment.';
      }
      if (error.kind == ApiErrorKind.decoding) {
        return 'We hit a temporary data issue while loading places. Please try again.';
      }
      if (error.kind == ApiErrorKind.network) {
        return 'You appear to be offline. Reconnect to load more places.';
      }
      return 'We could not load places right now. Please try again.';
    }
    if (error is FormatException) {
      return 'Something went wrong while loading places.';
    }
    return 'We could not load places right now. Please try again.';
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
        errorMessage: 'Enable location to discover nearby places.',
      );
    }
  }

  void _startViewingTopCard() {
    if (state.items.isEmpty ||
        state.currentIndex < 0 ||
        state.currentIndex >= state.items.length ||
        state.items[state.currentIndex] is! DeckPlanItem) {
      _viewStartedAt = null;
      _viewPlanId = null;
      return;
    }
    final topPlan = (state.items[state.currentIndex] as DeckPlanItem).plan;
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
    try {
      await _telemetryRepository.enqueueEvent(_sessionId, event);
      await _telemetryDispatcher.notifyEventQueued(_sessionId);
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[Telemetry] enqueue failed: $error');
      }
    }
  }
}
