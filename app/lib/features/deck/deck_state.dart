import '../../models/deck_batch.dart';
import '../../models/plan.dart';
import '../../models/swipe.dart';

class DeckSwipeRecord {
  const DeckSwipeRecord({
    required this.plan,
    required this.action,
    required this.position,
  });

  final Plan plan;
  final SwipeAction action;
  final int position;
}

class DeckState {
  const DeckState({
    required this.sessionId,
    this.isLoadingInitial = false,
    this.isLoadingMore = false,
    this.errorMessage,
    this.plans = const <Plan>[],
    this.nextCursor,
    this.hasMore = true,
    this.lastBatchMix,
    this.shownPlanIds = const <String>[],
    this.undoStack = const <DeckSwipeRecord>[],
    this.usedFallback = false,
    this.locationRequired = false,
  });

  factory DeckState.initial(String sessionId) =>
      DeckState(sessionId: sessionId, isLoadingInitial: true);

  final String sessionId;
  final bool isLoadingInitial;
  final bool isLoadingMore;
  final String? errorMessage;
  final List<Plan> plans;
  final String? nextCursor;
  final bool hasMore;
  final DeckSourceMix? lastBatchMix;
  final List<String> shownPlanIds;
  final List<DeckSwipeRecord> undoStack;
  final bool usedFallback;
  final bool locationRequired;

  DeckState copyWith({
    String? sessionId,
    bool? isLoadingInitial,
    bool? isLoadingMore,
    String? errorMessage,
    bool clearError = false,
    List<Plan>? plans,
    String? nextCursor,
    bool clearCursor = false,
    bool? hasMore,
    DeckSourceMix? lastBatchMix,
    List<String>? shownPlanIds,
    List<DeckSwipeRecord>? undoStack,
    bool? usedFallback,
    bool? locationRequired,
  }) {
    return DeckState(
      sessionId: sessionId ?? this.sessionId,
      isLoadingInitial: isLoadingInitial ?? this.isLoadingInitial,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      plans: plans ?? this.plans,
      nextCursor: clearCursor ? null : (nextCursor ?? this.nextCursor),
      hasMore: hasMore ?? this.hasMore,
      lastBatchMix: lastBatchMix ?? this.lastBatchMix,
      shownPlanIds: shownPlanIds ?? this.shownPlanIds,
      undoStack: undoStack ?? this.undoStack,
      usedFallback: usedFallback ?? this.usedFallback,
      locationRequired: locationRequired ?? this.locationRequired,
    );
  }
}
