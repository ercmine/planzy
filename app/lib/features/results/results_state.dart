import '../../models/plan.dart';

class PlanScoreView {
  const PlanScoreView({
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

class ResultsState {
  const ResultsState({
    required this.isLoading,
    required this.topPicks,
    this.lockedPlanId,
    this.errorMessage,
    required this.swipeCount,
  });

  factory ResultsState.initial() => const ResultsState(
        isLoading: true,
        topPicks: <PlanScoreView>[],
        swipeCount: 0,
      );

  final bool isLoading;
  final List<PlanScoreView> topPicks;
  final String? lockedPlanId;
  final String? errorMessage;
  final int swipeCount;

  ResultsState copyWith({
    bool? isLoading,
    List<PlanScoreView>? topPicks,
    String? lockedPlanId,
    String? errorMessage,
    int? swipeCount,
    bool clearError = false,
  }) {
    return ResultsState(
      isLoading: isLoading ?? this.isLoading,
      topPicks: topPicks ?? this.topPicks,
      lockedPlanId: lockedPlanId ?? this.lockedPlanId,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      swipeCount: swipeCount ?? this.swipeCount,
    );
  }
}
