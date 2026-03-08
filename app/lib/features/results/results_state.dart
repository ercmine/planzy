import '../../models/plan.dart';
import 'results_models.dart';

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
    required this.isRefreshing,
    required this.isLoadingMore,
    required this.feedItems,
    required this.topPicks,
    this.lockedPlanId,
    this.errorMessage,
    required this.swipeCount,
    this.activeSessions,
    this.generatedAt,
    required this.locationRequired,
    this.liveResultsErrorMessage,
    required this.hasMore,
  });

  factory ResultsState.initial() => const ResultsState(
        isLoading: true,
        isRefreshing: false,
        isLoadingMore: false,
        feedItems: <ResultFeedItem>[],
        topPicks: <PlanScoreView>[],
        swipeCount: 0,
        locationRequired: false,
        hasMore: false,
      );

  final bool isLoading;
  final bool isRefreshing;
  final bool isLoadingMore;
  final List<ResultFeedItem> feedItems;
  final List<PlanScoreView> topPicks;
  final String? lockedPlanId;
  final String? errorMessage;
  final int swipeCount;
  final int? activeSessions;
  final String? generatedAt;
  final bool locationRequired;
  final String? liveResultsErrorMessage;
  final bool hasMore;

  ResultsState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    bool? isLoadingMore,
    List<ResultFeedItem>? feedItems,
    List<PlanScoreView>? topPicks,
    String? lockedPlanId,
    String? errorMessage,
    int? swipeCount,
    int? activeSessions,
    String? generatedAt,
    bool? locationRequired,
    String? liveResultsErrorMessage,
    bool? hasMore,
    bool clearError = false,
    bool clearLiveResultsError = false,
  }) {
    return ResultsState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      feedItems: feedItems ?? this.feedItems,
      topPicks: topPicks ?? this.topPicks,
      lockedPlanId: lockedPlanId ?? this.lockedPlanId,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      swipeCount: swipeCount ?? this.swipeCount,
      activeSessions: activeSessions ?? this.activeSessions,
      generatedAt: generatedAt ?? this.generatedAt,
      locationRequired: locationRequired ?? this.locationRequired,
      liveResultsErrorMessage: clearLiveResultsError
          ? null
          : (liveResultsErrorMessage ?? this.liveResultsErrorMessage),
      hasMore: hasMore ?? this.hasMore,
    );
  }
}
