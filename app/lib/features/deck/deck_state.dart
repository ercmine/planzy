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

class AdSlot {
  const AdSlot({
    required this.slotId,
    required this.positionKey,
  });

  final String slotId;
  final int positionKey;
}

abstract class DeckItem {
  const DeckItem();

  String get itemKey;
}

class DeckPlanItem extends DeckItem {
  const DeckPlanItem(this.plan);

  final Plan plan;

  @override
  String get itemKey => 'plan:${plan.id}';
}

class DeckAdItem extends DeckItem {
  const DeckAdItem(this.slot);

  final AdSlot slot;

  @override
  String get itemKey => 'ad:${slot.slotId}';
}

class DeckState {
  const DeckState({
    required this.sessionId,
    this.isLoadingInitial = false,
    this.isLoadingMore = false,
    this.errorMessage,
    this.plans = const <Plan>[],
    this.items = const <DeckItem>[],
    this.currentIndex = 0,
    this.currentItemKey,
    this.nextCursor,
    this.hasMore = true,
    this.lastBatchMix,
    this.shownPlanIds = const <String>[],
    this.answeredPlanIds = const <String>{},
    this.undoStack = const <DeckSwipeRecord>[],
    this.usedFallback = false,
    this.locationRequired = false,
    this.showCachedResultsNotice = false,
    this.usingOfflineCachedData = false,
    this.isLoadingNextBatch = false,
    this.nextBatchErrorMessage,
    this.seenPlanIds = const <String>{},
  });

  factory DeckState.initial(String sessionId) =>
      DeckState(sessionId: sessionId, isLoadingInitial: true);

  final String sessionId;
  final bool isLoadingInitial;
  final bool isLoadingMore;
  final String? errorMessage;
  final List<Plan> plans;
  final List<DeckItem> items;
  final int currentIndex;
  final String? currentItemKey;
  final String? nextCursor;
  final bool hasMore;
  final DeckSourceMix? lastBatchMix;
  final List<String> shownPlanIds;
  final Set<String> answeredPlanIds;
  final List<DeckSwipeRecord> undoStack;
  final bool usedFallback;
  final bool locationRequired;
  final bool showCachedResultsNotice;
  final bool usingOfflineCachedData;
  final bool isLoadingNextBatch;
  final String? nextBatchErrorMessage;
  final Set<String> seenPlanIds;

  DeckState copyWith({
    String? sessionId,
    bool? isLoadingInitial,
    bool? isLoadingMore,
    String? errorMessage,
    bool clearError = false,
    List<Plan>? plans,
    List<DeckItem>? items,
    int? currentIndex,
    String? currentItemKey,
    bool clearCurrentItemKey = false,
    String? nextCursor,
    bool clearCursor = false,
    bool? hasMore,
    DeckSourceMix? lastBatchMix,
    List<String>? shownPlanIds,
    Set<String>? answeredPlanIds,
    List<DeckSwipeRecord>? undoStack,
    bool? usedFallback,
    bool? locationRequired,
    bool? showCachedResultsNotice,
    bool? usingOfflineCachedData,
    bool? isLoadingNextBatch,
    String? nextBatchErrorMessage,
    bool clearNextBatchError = false,
    Set<String>? seenPlanIds,
  }) {
    return DeckState(
      sessionId: sessionId ?? this.sessionId,
      isLoadingInitial: isLoadingInitial ?? this.isLoadingInitial,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      plans: plans ?? this.plans,
      items: items ?? this.items,
      currentIndex: currentIndex ?? this.currentIndex,
      currentItemKey: clearCurrentItemKey
          ? null
          : (currentItemKey ?? this.currentItemKey),
      nextCursor: clearCursor ? null : (nextCursor ?? this.nextCursor),
      hasMore: hasMore ?? this.hasMore,
      lastBatchMix: lastBatchMix ?? this.lastBatchMix,
      shownPlanIds: shownPlanIds ?? this.shownPlanIds,
      answeredPlanIds: answeredPlanIds ?? this.answeredPlanIds,
      undoStack: undoStack ?? this.undoStack,
      usedFallback: usedFallback ?? this.usedFallback,
      locationRequired: locationRequired ?? this.locationRequired,
      showCachedResultsNotice:
          showCachedResultsNotice ?? this.showCachedResultsNotice,
      usingOfflineCachedData:
          usingOfflineCachedData ?? this.usingOfflineCachedData,
      isLoadingNextBatch: isLoadingNextBatch ?? this.isLoadingNextBatch,
      nextBatchErrorMessage: clearNextBatchError
          ? null
          : (nextBatchErrorMessage ?? this.nextBatchErrorMessage),
      seenPlanIds: seenPlanIds ?? this.seenPlanIds,
    );
  }
}
