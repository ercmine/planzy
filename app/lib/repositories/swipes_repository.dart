import '../core/store/swipes_store.dart';
import '../models/locked_plan.dart';
import '../models/plan.dart';
import '../models/swipe.dart';

class PlanScore {
  const PlanScore({
    required this.plan,
    required this.score,
    required this.yesCount,
    required this.maybeCount,
  });

  final Plan plan;
  final double score;
  final int yesCount;
  final int maybeCount;
}

class SwipesRepository {
  SwipesRepository({required SwipesStore swipesStore}) : _swipesStore = swipesStore;

  final SwipesStore _swipesStore;

  Future<void> recordSwipe(
    String sessionId,
    Plan plan,
    SwipeAction action,
    int? position,
  ) {
    final swipe = SwipeRecord(
      sessionId: sessionId,
      planId: plan.id,
      action: action,
      atISO: DateTime.now().toUtc().toIso8601String(),
      planSnapshot: plan,
      position: position,
    );
    return _swipesStore.appendSwipe(swipe);
  }

  Future<int> getSwipeCount(String sessionId) async {
    final swipes = await _swipesStore.loadSwipes(sessionId);
    return swipes.length;
  }

  Future<List<SwipeRecord>> getSwipes(String sessionId) {
    return _swipesStore.loadSwipes(sessionId);
  }

  Future<List<PlanScore>> computeTopPicks(String sessionId, {int limit = 5}) async {
    final swipes = await _swipesStore.loadSwipes(sessionId);
    final grouped = <String, _PlanAccumulator>{};

    for (final swipe in swipes) {
      final plan = swipe.planSnapshot;
      if (plan == null) {
        continue;
      }

      final accumulator = grouped.putIfAbsent(
        plan.id,
        () => _PlanAccumulator(plan: plan),
      );

      switch (swipe.action) {
        case SwipeAction.yes:
          accumulator.score += 2;
          accumulator.yesCount += 1;
        case SwipeAction.maybe:
          accumulator.score += 1;
          accumulator.maybeCount += 1;
        case SwipeAction.no:
          break;
      }

      final sponsored = plan.metadata?['sponsored'] == true;
      if (sponsored) {
        accumulator.score -= 0.5;
      }
    }

    final scores = grouped.values
        .map(
          (value) => PlanScore(
            plan: value.plan,
            score: value.score,
            yesCount: value.yesCount,
            maybeCount: value.maybeCount,
          ),
        )
        .toList(growable: false)
      ..sort((a, b) => b.score.compareTo(a.score));

    if (scores.length <= limit) {
      return scores;
    }
    return scores.take(limit).toList(growable: false);
  }

  Future<void> lockIn(String sessionId, Plan plan) {
    final locked = LockedPlan(
      sessionId: sessionId,
      planId: plan.id,
      lockedAtISO: DateTime.now().toUtc().toIso8601String(),
      planSnapshot: plan,
    );
    return _swipesStore.setLockedPlan(locked);
  }

  Future<LockedPlan?> getLockedPlan(String sessionId) {
    return _swipesStore.getLockedPlan(sessionId);
  }
}

class _PlanAccumulator {
  _PlanAccumulator({required this.plan});

  final Plan plan;
  double score = 0;
  int yesCount = 0;
  int maybeCount = 0;
}
