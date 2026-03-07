enum OnboardingStep {
  intro,
  permissions,
  signin,
  done,
}

class OnboardingState {
  const OnboardingState({
    required this.step,
    required this.hasCompleted,
  });

  factory OnboardingState.initial() {
    return const OnboardingState(
      step: OnboardingStep.intro,
      hasCompleted: false,
    );
  }

  final OnboardingStep step;
  final bool hasCompleted;

  OnboardingState copyWith({
    OnboardingStep? step,
    bool? hasCompleted,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      hasCompleted: hasCompleted ?? this.hasCompleted,
    );
  }
}
