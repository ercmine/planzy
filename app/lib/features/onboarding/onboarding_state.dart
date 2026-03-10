enum OnboardingStep {
  intro,
  interests,
  permissions,
  signin,
  done,
}

class OnboardingState {
  const OnboardingState({
    required this.step,
    required this.hasCompleted,
    required this.selectedCategories,
  });

  factory OnboardingState.initial() {
    return const OnboardingState(
      step: OnboardingStep.intro,
      hasCompleted: false,
      selectedCategories: <String>[],
    );
  }

  final OnboardingStep step;
  final bool hasCompleted;
  final List<String> selectedCategories;

  OnboardingState copyWith({
    OnboardingStep? step,
    bool? hasCompleted,
    List<String>? selectedCategories,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      hasCompleted: hasCompleted ?? this.hasCompleted,
      selectedCategories: selectedCategories ?? this.selectedCategories,
    );
  }
}
