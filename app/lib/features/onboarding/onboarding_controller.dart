import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/identity/identity_provider.dart';
import 'onboarding_state.dart';

class OnboardingController extends Notifier<OnboardingState> {
  bool _disposed = false;

  @override
  OnboardingState build() {
    _disposed = false;
    ref.onDispose(() => _disposed = true);
    _load();
    return OnboardingState.initial();
  }

  Future<void> _load() async {
    final identityStore = await ref.read(identityStoreProvider.future);
    final hasCompleted = await identityStore.isOnboardingCompleted();
    final selectedCategories = await identityStore.getOnboardingCategories();
    if (_disposed) {
      return;
    }

    state = state.copyWith(
      hasCompleted: hasCompleted,
      step: hasCompleted ? OnboardingStep.done : OnboardingStep.intro,
      selectedCategories: selectedCategories,
    );
  }

  void start() {
    state = state.copyWith(step: OnboardingStep.intro);
  }

  void goToPermissions() {
    state = state.copyWith(step: OnboardingStep.permissions);
  }

  void goToInterests() {
    state = state.copyWith(step: OnboardingStep.interests);
  }

  void toggleCategory(String category) {
    final next = state.selectedCategories.toSet();
    if (!next.add(category)) {
      next.remove(category);
    }
    state = state.copyWith(selectedCategories: next.toList(growable: false));
  }

  void skipSignIn() {
    state = state.copyWith(step: OnboardingStep.done);
  }

  Future<void> finish() async {
    final identityStore = await ref.read(identityStoreProvider.future);
    await identityStore.setOnboardingCategories(state.selectedCategories);
    await identityStore.setOnboardingCompleted(true);

    state = state.copyWith(
      step: OnboardingStep.done,
      hasCompleted: true,
    );

    ref.invalidate(onboardingCompletedProvider);
  }
}

final onboardingControllerProvider =
    NotifierProvider<OnboardingController, OnboardingState>(() {
  return OnboardingController();
});
