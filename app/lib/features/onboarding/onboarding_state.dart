enum OnboardingStep {
  identityIntro,
  mapNodes,
  squadIntro,
  firstMove,
  firstEncounter,
  firstReward,
  progressionCue,
  liveLoop,
  completed,
}

class OnboardingState {
  const OnboardingState({
    required this.step,
    required this.isBusy,
    required this.hasCompleted,
    required this.startedAt,
    required this.firstMoveAt,
    required this.firstRewardAt,
    required this.skipped,
    this.errorMessage,
  });

  factory OnboardingState.initial() => const OnboardingState(
        step: OnboardingStep.identityIntro,
        isBusy: false,
        hasCompleted: false,
        startedAt: null,
        firstMoveAt: null,
        firstRewardAt: null,
        skipped: false,
      );

  final OnboardingStep step;
  final bool isBusy;
  final bool hasCompleted;
  final DateTime? startedAt;
  final DateTime? firstMoveAt;
  final DateTime? firstRewardAt;
  final bool skipped;
  final String? errorMessage;

  bool get shouldGateIntro => !hasCompleted && step == OnboardingStep.identityIntro;

  int? get timeToFirstMoveMs {
    if (startedAt == null || firstMoveAt == null) return null;
    return firstMoveAt!.difference(startedAt!).inMilliseconds;
  }

  int? get timeToFirstRewardMs {
    if (startedAt == null || firstRewardAt == null) return null;
    return firstRewardAt!.difference(startedAt!).inMilliseconds;
  }

  OnboardingState copyWith({
    OnboardingStep? step,
    bool? isBusy,
    bool? hasCompleted,
    DateTime? startedAt,
    bool clearStartedAt = false,
    DateTime? firstMoveAt,
    bool clearFirstMoveAt = false,
    DateTime? firstRewardAt,
    bool clearFirstRewardAt = false,
    bool? skipped,
    String? errorMessage,
    bool clearError = false,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      isBusy: isBusy ?? this.isBusy,
      hasCompleted: hasCompleted ?? this.hasCompleted,
      startedAt: clearStartedAt ? null : (startedAt ?? this.startedAt),
      firstMoveAt: clearFirstMoveAt ? null : (firstMoveAt ?? this.firstMoveAt),
      firstRewardAt: clearFirstRewardAt ? null : (firstRewardAt ?? this.firstRewardAt),
      skipped: skipped ?? this.skipped,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
