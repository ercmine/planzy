import 'onboarding_models.dart';

enum OnboardingStep {
  intro,
  location,
  interests,
  discovery,
  done,
}

class OnboardingState {
  const OnboardingState({
    required this.step,
    required this.hasCompleted,
    required this.selectedCategories,
    required this.city,
    required this.region,
    required this.useCurrentLocation,
    required this.discoveryMode,
  });

  factory OnboardingState.initial() {
    return const OnboardingState(
      step: OnboardingStep.intro,
      hasCompleted: false,
      selectedCategories: <String>[],
      city: '',
      region: '',
      useCurrentLocation: true,
      discoveryMode: DiscoveryMode.balanced,
    );
  }

  final OnboardingStep step;
  final bool hasCompleted;
  final List<String> selectedCategories;
  final String city;
  final String region;
  final bool useCurrentLocation;
  final DiscoveryMode discoveryMode;

  OnboardingState copyWith({
    OnboardingStep? step,
    bool? hasCompleted,
    List<String>? selectedCategories,
    String? city,
    String? region,
    bool? useCurrentLocation,
    DiscoveryMode? discoveryMode,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      hasCompleted: hasCompleted ?? this.hasCompleted,
      selectedCategories: selectedCategories ?? this.selectedCategories,
      city: city ?? this.city,
      region: region ?? this.region,
      useCurrentLocation: useCurrentLocation ?? this.useCurrentLocation,
      discoveryMode: discoveryMode ?? this.discoveryMode,
    );
  }
}
