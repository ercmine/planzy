import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/sharing/share_service.dart';
import '../../models/plan.dart';
import '../../repositories/swipes_repository.dart';
import 'results_state.dart';

class ResultsController extends StateNotifier<ResultsState> {
  ResultsController({
    required String sessionId,
    required SwipesRepository swipesRepository,
    required ShareService shareService,
  })  : _sessionId = sessionId,
        _swipesRepository = swipesRepository,
        _shareService = shareService,
        super(ResultsState.initial()) {
    Future<void>.microtask(refresh);
  }

  final String _sessionId;
  final SwipesRepository _swipesRepository;
  final ShareService _shareService;

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final swipeCount = await _swipesRepository.getSwipeCount(_sessionId);
      final topPicks = await _swipesRepository.computeTopPicks(_sessionId);
      final lockedPlan = await _swipesRepository.getLockedPlan(_sessionId);

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
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> lockIn(Plan plan) async {
    await _swipesRepository.lockIn(_sessionId, plan);

    await _shareService.shareText(
      _buildShareCard(plan),
      subject: 'OurPlanPlan pick: ${plan.title}',
    );

    state = state.copyWith(lockedPlanId: plan.id);
  }

  String _buildShareCard(Plan plan) {
    final mapsLink = plan.deepLinks?.mapsLink ?? 'N/A';
    final websiteLink = plan.deepLinks?.websiteLink ?? 'N/A';

    return 'OurPlanPlan pick: ${plan.title}\n'
        'Category: ${plan.category}\n'
        'Maps: $mapsLink\n'
        'Website: $websiteLink\n\n'
        'Join session: https://ourplanplan.com/invite/$_sessionId';
  }
}
