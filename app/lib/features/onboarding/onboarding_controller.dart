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
    if (_disposed) {
      return;
    }

    state = state.copyWith(
      hasCompleted: hasCompleted,
      step: hasCompleted ? OnboardingStep.done : OnboardingStep.intro,
    );
  }

  void start() {
    state = state.copyWith(step: OnboardingStep.intro);
  }

  void goToPermissions() {
    state = state.copyWith(step: OnboardingStep.permissions);
  }

  void skipSignIn() {
    state = state.copyWith(step: OnboardingStep.done);
  }

  Future<void> finish() async {
    final identityStore = await ref.read(identityStoreProvider.future);
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
