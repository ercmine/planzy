import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_error.dart';
import '../../api/models.dart';
import '../../core/ads/ad_placement.dart';
import '../../core/ads/ads_visibility.dart';
import '../../core/ads/feed_ad_inserter.dart';
import '../../core/location/location_controller.dart';
import '../../core/sharing/share_service.dart';
import '../../models/plan.dart';
import '../../repositories/live_results_repository.dart';
import '../../repositories/swipes_repository.dart';
import 'results_mapper.dart';
import 'results_models.dart';
import 'results_state.dart';

class ResultsController extends StateNotifier<ResultsState> {
  ResultsController({
    required String sessionId,
    required SwipesRepository swipesRepository,
    required ShareService shareService,
    required LiveResultsRepository? liveResultsRepository,
    required LocationController locationController,
    required AdsVisibility adsVisibility,
    FeedAdInserter feedAdInserter = const FeedAdInserter(),
  })  : _sessionId = sessionId,
        _swipesRepository = swipesRepository,
        _shareService = shareService,
        _liveResultsRepository = liveResultsRepository,
        _locationController = locationController,
        _adsVisibility = adsVisibility,
        _feedAdInserter = feedAdInserter,
        super(ResultsState.initial()) {
    Future<void>.microtask(refresh);
  }

  static const int _pageSize = 8;
  static const double _debugDefaultLat = 44.8620;
  static const double _debugDefaultLng = -93.5590;

  final String _sessionId;
  final SwipesRepository _swipesRepository;
  final ShareService _shareService;
  final LiveResultsRepository? _liveResultsRepository;
  final LocationController _locationController;
  final AdsVisibility _adsVisibility;
  final FeedAdInserter _feedAdInserter;

  List<PlanScoreView> _allTopPicks = const <PlanScoreView>[];
  int _offset = 0;
  int _requestId = 0;

  Future<void> refresh() async {
    final requestId = ++_requestId;
    final hasExisting = state.topPicks.isNotEmpty;
    state = state.copyWith(
      isLoading: !hasExisting,
      isRefreshing: hasExisting,
      isLoadingMore: false,
      clearError: true,
      clearLiveResultsError: true,
      locationRequired: false,
    );

    try {
      final swipeCount = await _swipesRepository.getSwipeCount(_sessionId);
      final topPicks = await _swipesRepository.computeTopPicks(_sessionId, limit: 200);
      final lockedPlan = await _swipesRepository.getLockedPlan(_sessionId);
      LiveResultsResponse? liveResults;
      String? liveResultsError;
      try {
        liveResults = await _loadLiveResults();
      } catch (error) {
        liveResultsError = _formatError(error);
      }

      if (requestId != _requestId) {
        return;
      }

      _allTopPicks = _dedupeTopPicks(topPicks
          .map((score) => PlanScoreView(
                plan: score.plan,
                score: score.score,
                yesCount: score.yesCount,
                maybeCount: score.maybeCount,
              ))
          .toList(growable: false));
      _offset = _allTopPicks.length > _pageSize ? _pageSize : _allTopPicks.length;
      final firstPage = _allTopPicks.take(_offset).toList(growable: false);

      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        swipeCount: swipeCount,
        topPicks: firstPage,
        feedItems: _composeFeed(firstPage, lockedPlanId: lockedPlan?.planId),
        hasMore: _offset < _allTopPicks.length,
        lockedPlanId: lockedPlan?.planId,
        activeSessions: liveResults?.summary.activeSessions,
        generatedAt: liveResults?.summary.generatedAt,
        liveResultsErrorMessage: liveResultsError,
      );
    } catch (error) {
      if (requestId != _requestId) {
        return;
      }
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        isLoadingMore: false,
        errorMessage: _formatError(error),
      );
    }
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) {
      return;
    }

    state = state.copyWith(isLoadingMore: true, clearError: true);
    final nextOffset = (_offset + _pageSize).clamp(0, _allTopPicks.length);
    _offset = nextOffset;
    final visible = _allTopPicks.take(_offset).toList(growable: false);
    state = state.copyWith(
      isLoadingMore: false,
      topPicks: visible,
      feedItems: _composeFeed(visible, lockedPlanId: state.lockedPlanId),
      hasMore: _offset < _allTopPicks.length,
    );
  }

  Future<void> requestLocationAndReload() async {
    await _locationController.requestPermissionAndLoad();
    await refresh();
  }

  Future<LiveResultsResponse?> _loadLiveResults() async {
    if (_liveResultsRepository == null) {
      return null;
    }

    var location = _locationController.state.effectiveLocation;
    if (location == null && kDebugMode) {
      _locationController.setManualOverride(_debugDefaultLat, _debugDefaultLng);
      location = _locationController.state.effectiveLocation;
    }

    if (location == null) {
      state = state.copyWith(locationRequired: true, isLoading: false, isRefreshing: false);
      return null;
    }

    return _liveResultsRepository!.fetchLiveResults(lat: location.lat, lng: location.lng);
  }

  Future<void> lockIn(Plan plan) async {
    await _swipesRepository.lockIn(_sessionId, plan);
    await _shareService.shareText(_buildShareCard(plan), subject: 'Perbug pick: ${plan.title}');
    state = state.copyWith(
      lockedPlanId: plan.id,
      feedItems: _composeFeed(state.topPicks, lockedPlanId: plan.id),
    );
  }

  List<PlanScoreView> _dedupeTopPicks(List<PlanScoreView> picks) {
    final seen = <String>{};
    final deduped = <PlanScoreView>[];
    for (final item in picks) {
      if (seen.add(item.plan.id)) {
        deduped.add(item);
      }
    }
    return deduped;
  }

  List<ResultFeedItem> _composeFeed(List<PlanScoreView> picks, {String? lockedPlanId}) {
    return _feedAdInserter.inject<PlanScoreView, ResultFeedItem>(
      items: picks,
      placement: AdPlacement.resultsInlineBanner,
      adsEnabled: _adsVisibility.canShow(AdPlacement.resultsInlineBanner.name),
      adBuilder: (contentIndex, mixedIndex) => AdResultFeedItem(slotId: 'results-slot-$contentIndex-$mixedIndex'),
      contentBuilder: (pick) => PlaceResultFeedItem(
        card: mapPlanToCardViewModel(pick),
        isLocked: lockedPlanId == pick.plan.id,
      ),
    );
  }

  String _buildShareCard(Plan plan) {
    final mapsLink = plan.deepLinks?.mapsLink ?? 'N/A';
    final websiteLink = plan.deepLinks?.websiteLink ?? 'N/A';
    return 'Perbug pick: ${plan.title}\nCategory: ${plan.category}\nMaps: $mapsLink\nWebsite: $websiteLink\n\nJoin session: https://perbug.com/invite/$_sessionId';
  }

  String _formatError(Object error) {
    if (error is ApiError && error.kind == ApiErrorKind.http && error.statusCode != null) {
      return 'Could not load results (HTTP ${error.statusCode})';
    }
    if (error is ApiError && error.kind == ApiErrorKind.decoding) {
      return 'Parse error: ${error.details ?? error.message}';
    }
    return error.toString();
  }
}
