import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/api_error.dart';
import '../../api/models.dart';
import '../../core/location/location_controller.dart';
import '../../core/sharing/share_service.dart';
import '../../models/plan.dart';
import '../../repositories/live_results_repository.dart';
import '../../repositories/swipes_repository.dart';
import 'results_state.dart';

class ResultsController extends StateNotifier<ResultsState> {
  ResultsController({
    required String sessionId,
    required SwipesRepository swipesRepository,
    required ShareService shareService,
    required LiveResultsRepository? liveResultsRepository,
    required LocationController locationController,
  })  : _sessionId = sessionId,
        _swipesRepository = swipesRepository,
        _shareService = shareService,
        _liveResultsRepository = liveResultsRepository,
        _locationController = locationController,
        super(ResultsState.initial()) {
    Future<void>.microtask(refresh);
  }

  final String _sessionId;
  final SwipesRepository _swipesRepository;
  final ShareService _shareService;
  final LiveResultsRepository? _liveResultsRepository;
  final LocationController _locationController;

  static const double _debugDefaultLat = 44.8620;
  static const double _debugDefaultLng = -93.5590;

  Future<void> refresh() async {
    if (kDebugMode) {
      debugPrint('[ResultsController] refresh start session=$_sessionId');
    }

    state = state.copyWith(
      isLoading: true,
      clearError: true,
      clearLiveResultsError: true,
      locationRequired: false,
    );
    try {
      final swipeCount = await _swipesRepository.getSwipeCount(_sessionId);
      final topPicks = await _swipesRepository.computeTopPicks(_sessionId);
      final lockedPlan = await _swipesRepository.getLockedPlan(_sessionId);
      LiveResultsResponse? liveResults;
      String? liveResultsError;
      try {
        liveResults = await _loadLiveResults();
      } catch (error) {
        liveResultsError = _formatError(error);
      }

      if (kDebugMode) {
        debugPrint(
          '[ResultsController] refresh complete '
          'session=$_sessionId topPicks=${topPicks.length} '
          'liveResults=${liveResults?.results.length ?? 0} '
          'liveResultsError=${liveResultsError ?? '-'}',
        );
      }

      state = state.copyWith(
        isLoading: false,
        swipeCount: swipeCount,
        topPicks: topPicks
            .map(
              (score) => PlanScoreView(
                plan: score.plan,
                score: score.score,
                yesCount: score.yesCount,
                maybeCount: score.maybeCount,
              ),
            )
            .toList(growable: false),
        lockedPlanId: lockedPlan?.planId,
        activeSessions: liveResults?.summary.activeSessions,
        generatedAt: liveResults?.summary.generatedAt,
        liveResultsErrorMessage: liveResultsError,
      );
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[ResultsController] refresh failed session=$_sessionId error=$error');
      }
      state = state.copyWith(
        isLoading: false,
        errorMessage: _formatError(error),
      );
    }
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
      if (kDebugMode) {
        debugPrint('[ResultsController] live results require location session=$_sessionId');
      }
      state = state.copyWith(locationRequired: true, isLoading: false);
      return null;
    }

    final response = await _liveResultsRepository!.fetchLiveResults(
      lat: location.lat,
      lng: location.lng,
    );
    if (kDebugMode) {
      debugPrint(
        '[ResultsController] live results fetched session=$_sessionId count=${response.results.length}',
      );
    }
    return response;
  }

  Future<void> lockIn(Plan plan) async {
    await _swipesRepository.lockIn(_sessionId, plan);

    await _shareService.shareText(
      _buildShareCard(plan),
      subject: 'Perbug pick: ${plan.title}',
    );

    state = state.copyWith(lockedPlanId: plan.id);
  }

  String _buildShareCard(Plan plan) {
    final mapsLink = plan.deepLinks?.mapsLink ?? 'N/A';
    final websiteLink = plan.deepLinks?.websiteLink ?? 'N/A';

    return 'Perbug pick: ${plan.title}\n'
        'Category: ${plan.category}\n'
        'Maps: $mapsLink\n'
        'Website: $websiteLink\n\n'
        'Join session: https://perbug.com/invite/$_sessionId';
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
