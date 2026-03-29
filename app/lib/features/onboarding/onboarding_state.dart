import 'onboarding_models.dart';

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
    required this.isFinishing,
    required this.hasCompleted,
    required this.startedAt,
    required this.firstMoveAt,
    required this.firstRewardAt,
    required this.skipped,
    required this.useCurrentLocation,
    required this.city,
    required this.region,
    required this.selectedCategories,
    required this.discoveryMode,
    this.errorMessage,
  });

  factory OnboardingState.initial() => const OnboardingState(
        step: OnboardingStep.identityIntro,
        isBusy: false,
        isFinishing: false,
        hasCompleted: false,
        startedAt: null,
        firstMoveAt: null,
        firstRewardAt: null,
        skipped: false,
        useCurrentLocation: true,
        city: '',
        region: '',
        selectedCategories: <String>[],
        discoveryMode: DiscoveryMode.mostlyLocal,
      );

  final OnboardingStep step;
  final bool isBusy;
  final bool isFinishing;
  final bool hasCompleted;
  final DateTime? startedAt;
  final DateTime? firstMoveAt;
  final DateTime? firstRewardAt;
  final bool skipped;
  final bool useCurrentLocation;
  final String city;
  final String region;
  final List<String> selectedCategories;
  final DiscoveryMode discoveryMode;
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
    bool? isFinishing,
    bool? hasCompleted,
    DateTime? startedAt,
    bool clearStartedAt = false,
    DateTime? firstMoveAt,
    bool clearFirstMoveAt = false,
    DateTime? firstRewardAt,
    bool clearFirstRewardAt = false,
    bool? skipped,
    bool? useCurrentLocation,
    String? city,
    String? region,
    List<String>? selectedCategories,
    DiscoveryMode? discoveryMode,
    String? errorMessage,
    bool clearError = false,
  }) {
    return OnboardingState(
      step: step ?? this.step,
      isBusy: isBusy ?? this.isBusy,
      isFinishing: isFinishing ?? this.isFinishing,
      hasCompleted: hasCompleted ?? this.hasCompleted,
      startedAt: clearStartedAt ? null : (startedAt ?? this.startedAt),
      firstMoveAt: clearFirstMoveAt ? null : (firstMoveAt ?? this.firstMoveAt),
      firstRewardAt: clearFirstRewardAt ? null : (firstRewardAt ?? this.firstRewardAt),
      skipped: skipped ?? this.skipped,
      useCurrentLocation: useCurrentLocation ?? this.useCurrentLocation,
      city: city ?? this.city,
      region: region ?? this.region,
      selectedCategories: selectedCategories ?? this.selectedCategories,
      discoveryMode: discoveryMode ?? this.discoveryMode,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}
