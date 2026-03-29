import 'package:dryad/core/identity/identity_store.dart';
import 'package:dryad/features/onboarding/onboarding_controller.dart';
import 'package:dryad/features/onboarding/onboarding_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('starts expedition and persists first actionable step', () async {
    SharedPreferences.setMockInitialValues({});
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await container.read(onboardingControllerProvider.notifier).startOnboardingExpedition();

    final state = container.read(onboardingControllerProvider);
    expect(state.step, OnboardingStep.mapNodes);
    expect(state.startedAt, isNotNull);

    final prefs = await SharedPreferences.getInstance();
    final store = IdentityStore(sharedPreferences: prefs);
    final progress = await store.getOnboardingProgress();
    expect(progress.step, OnboardingStep.mapNodes.name);
  });

  test('records first move and first reward timestamps once', () async {
    SharedPreferences.setMockInitialValues({});
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(onboardingControllerProvider.notifier);

    await controller.startOnboardingExpedition();
    await controller.recordFirstMove();
    final firstMove = container.read(onboardingControllerProvider).firstMoveAt;
    await controller.recordFirstMove();

    await controller.recordFirstReward();
    final firstReward = container.read(onboardingControllerProvider).firstRewardAt;
    await controller.recordFirstReward();

    final state = container.read(onboardingControllerProvider);
    expect(firstMove, isNotNull);
    expect(firstReward, isNotNull);
    expect(state.firstMoveAt, firstMove);
    expect(state.firstRewardAt, firstReward);
    expect(state.timeToFirstMoveMs, greaterThanOrEqualTo(0));
    expect(state.timeToFirstRewardMs, greaterThanOrEqualTo(0));
  });

  test('skip marks onboarding complete and persisted', () async {
    SharedPreferences.setMockInitialValues({});
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await container.read(onboardingControllerProvider.notifier).skipOnboarding();
    final state = container.read(onboardingControllerProvider);

    expect(state.hasCompleted, isTrue);
    expect(state.step, OnboardingStep.completed);
    expect(state.skipped, isTrue);

    final prefs = await SharedPreferences.getInstance();
    final store = IdentityStore(sharedPreferences: prefs);
    expect(await store.isOnboardingCompleted(), isTrue);
    expect((await store.getOnboardingProgress()).skipped, isTrue);
  });
}
