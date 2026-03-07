import '../../models/deck_batch.dart';
import '../../models/plan.dart';

const _unset = Object();

class SwipeRecord {
  const SwipeRecord({
    required this.plan,
    required this.action,
  });

  final Plan plan;
  final String action;
}

class DeckState {
  const DeckState({
    required this.sessionId,
    required this.isLoadingInitial,
    required this.isLoadingMore,
    this.errorMessage,
    required this.plans,
    this.nextCursor,
    required this.hasMore,
    this.lastBatchMix,
    required this.shownPlanIds,
    required this.undoStack,
    required this.usedFallback,
  });

  factory DeckState.initial(String sessionId) {
    return DeckState(
      sessionId: sessionId,
      isLoadingInitial: true,
      isLoadingMore: false,
      plans: const [],
      hasMore: true,
      shownPlanIds: const [],
      undoStack: const [],
      usedFallback: false,
    );
  }

  final String sessionId;
  final bool isLoadingInitial;
  final bool isLoadingMore;
  final String? errorMessage;
  final List<Plan> plans;
  final String? nextCursor;
  final bool hasMore;
  final DeckSourceMix? lastBatchMix;
  final List<String> shownPlanIds;
  final List<SwipeRecord> undoStack;
  final bool usedFallback;

  DeckState copyWith({
    String? sessionId,
    bool? isLoadingInitial,
    bool? isLoadingMore,
    Object? errorMessage = _unset,
    List<Plan>? plans,
    Object? nextCursor = _unset,
    bool? hasMore,
    Object? lastBatchMix = _unset,
    List<String>? shownPlanIds,
    List<SwipeRecord>? undoStack,
    bool? usedFallback,
  }) {
    return DeckState(
      sessionId: sessionId ?? this.sessionId,
      isLoadingInitial: isLoadingInitial ?? this.isLoadingInitial,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage:
          identical(errorMessage, _unset) ? this.errorMessage : errorMessage as String?,
      plans: plans ?? this.plans,
      nextCursor: identical(nextCursor, _unset) ? this.nextCursor : nextCursor as String?,
      hasMore: hasMore ?? this.hasMore,
      lastBatchMix: identical(lastBatchMix, _unset)
          ? this.lastBatchMix
          : lastBatchMix as DeckSourceMix?,
      shownPlanIds: shownPlanIds ?? this.shownPlanIds,
      undoStack: undoStack ?? this.undoStack,
      usedFallback: usedFallback ?? this.usedFallback,
    );
  }
}
