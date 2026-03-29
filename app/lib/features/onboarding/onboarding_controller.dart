import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/identity/identity_provider.dart';
import 'onboarding_models.dart';
import 'onboarding_state.dart';

class OnboardingController extends Notifier<OnboardingState> {
  @override
  OnboardingState build() {
    _load();
    return OnboardingState.initial();
  }

  static const List<OnboardingStep> _flow = [
    OnboardingStep.identityIntro,
    OnboardingStep.mapNodes,
    OnboardingStep.squadIntro,
    OnboardingStep.firstMove,
    OnboardingStep.firstEncounter,
    OnboardingStep.firstReward,
    OnboardingStep.progressionCue,
    OnboardingStep.liveLoop,
    OnboardingStep.completed,
  ];

  Future<void> _load() async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final identity = await ref.read(identityStoreProvider.future);
      final completed = await identity.isOnboardingCompleted();
      final progress = await identity.getOnboardingProgress();
      final step = _parseStep(progress.step);
      state = state.copyWith(
        isBusy: false,
        hasCompleted: completed,
        step: completed ? OnboardingStep.completed : step,
        startedAt: progress.startedAt,
        firstMoveAt: progress.firstMoveAt,
        firstRewardAt: progress.firstRewardAt,
        skipped: progress.skipped,
      );
    } catch (error) {
      state = state.copyWith(isBusy: false, errorMessage: 'Failed to load onboarding progress: $error');
    }
  }

  OnboardingStep _parseStep(String raw) {
    for (final value in OnboardingStep.values) {
      if (value.name == raw) return value;
    }
    return OnboardingStep.identityIntro;
  }

  Future<void> startOnboardingExpedition() async {
    final identity = await ref.read(identityStoreProvider.future);
    final now = DateTime.now().toUtc();
    await identity.setOnboardingStartedAt(now);
    await identity.setOnboardingStep(OnboardingStep.mapNodes.name);
    await identity.setOnboardingSkipped(false);
    state = state.copyWith(
      step: OnboardingStep.mapNodes,
      startedAt: now,
      skipped: false,
      clearError: true,
    );
  }

  Future<void> advanceTo(OnboardingStep step) async {
    if (state.hasCompleted) return;
    final identity = await ref.read(identityStoreProvider.future);
    await identity.setOnboardingStep(step.name);
    state = state.copyWith(step: step, clearError: true);
  }

  Future<void> advanceStep() async {
    if (state.hasCompleted) return;
    final currentIndex = _flow.indexOf(state.step);
    final next = currentIndex < 0 || currentIndex >= _flow.length - 1 ? OnboardingStep.completed : _flow[currentIndex + 1];
    await advanceTo(next);
    if (next == OnboardingStep.completed) {
      await completeOnboarding();
    }
  }

  Future<void> recordFirstMove() async {
    if (state.firstMoveAt != null) return;
    final identity = await ref.read(identityStoreProvider.future);
    final now = DateTime.now().toUtc();
    await identity.setOnboardingFirstMoveAt(now);
    state = state.copyWith(firstMoveAt: now);
  }

  Future<void> recordFirstReward() async {
    if (state.firstRewardAt != null) return;
    final identity = await ref.read(identityStoreProvider.future);
    final now = DateTime.now().toUtc();
    await identity.setOnboardingFirstRewardAt(now);
    state = state.copyWith(firstRewardAt: now);
  }

  Future<void> skipOnboarding() async {
    final identity = await ref.read(identityStoreProvider.future);
    await identity.setOnboardingSkipped(true);
    await identity.setOnboardingStep(OnboardingStep.completed.name);
    await identity.setOnboardingCompleted(true);
    ref.invalidate(onboardingCompletedProvider);
    state = state.copyWith(step: OnboardingStep.completed, hasCompleted: true, skipped: true);
  }

  Future<void> completeOnboarding() async {
    final identity = await ref.read(identityStoreProvider.future);
    await identity.setOnboardingStep(OnboardingStep.completed.name);
    await identity.setOnboardingCompleted(true);
    ref.invalidate(onboardingCompletedProvider);
    state = state.copyWith(step: OnboardingStep.completed, hasCompleted: true, clearError: true);
  }

  void updateLocationMode(bool useCurrentLocation) {
    state = state.copyWith(useCurrentLocation: useCurrentLocation);
  }

  void updateCity(String city) {
    state = state.copyWith(city: city);
  }

  void updateRegion(String region) {
    state = state.copyWith(region: region);
  }

  void toggleCategory(String categoryId) {
    final next = state.selectedCategories.toSet();
    if (next.contains(categoryId)) {
      next.remove(categoryId);
    } else {
      next.add(categoryId);
    }
    state = state.copyWith(selectedCategories: next.toList(growable: false));
  }

  void setDiscoveryMode(DiscoveryMode mode) {
    state = state.copyWith(discoveryMode: mode);
  }

  Future<void> finish() async {
    if (state.isFinishing) return;
    state = state.copyWith(isFinishing: true, clearError: true);
    try {
      await completeOnboarding();
    } catch (error) {
      state = state.copyWith(errorMessage: 'Failed to finish onboarding: $error');
    } finally {
      state = state.copyWith(isFinishing: false);
    }
  }

  Future<OnboardingFinishResult> finishAndBootstrapFeed() async {
    await finish();
    if (state.errorMessage != null) {
      return OnboardingFinishResult.failure(state.errorMessage!);
    }
    return const OnboardingFinishResult.success();
  }
}

class OnboardingFinishResult {
  const OnboardingFinishResult._({required this.isSuccess, this.message});

  const OnboardingFinishResult.success() : this._(isSuccess: true);

  const OnboardingFinishResult.failure(String message) : this._(isSuccess: false, message: message);

  final bool isSuccess;
  final String? message;
}

final onboardingControllerProvider = NotifierProvider<OnboardingController, OnboardingState>(() {
  return OnboardingController();
});
