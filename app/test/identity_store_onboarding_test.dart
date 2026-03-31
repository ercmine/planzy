import 'package:perbug/core/identity/identity_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('persists onboarding category preferences', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final store = IdentityStore(sharedPreferences: prefs);

    await store.setOnboardingCategories(['coffee', 'food', 'coffee']);

    final saved = await store.getOnboardingCategories();
    expect(saved, containsAll(<String>['coffee', 'food']));
    expect(saved.length, 2);
  });

  test('persists onboarding progress snapshot for resume', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final store = IdentityStore(sharedPreferences: prefs);

    final startedAt = DateTime.utc(2026, 3, 29, 10, 0, 0);
    final firstMoveAt = startedAt.add(const Duration(seconds: 25));

    await store.setOnboardingStep('firstMove');
    await store.setOnboardingStartedAt(startedAt);
    await store.setOnboardingFirstMoveAt(firstMoveAt);
    await store.setOnboardingSkipped(false);

    final progress = await store.getOnboardingProgress();
    expect(progress.step, 'firstMove');
    expect(progress.startedAt, startedAt);
    expect(progress.firstMoveAt, firstMoveAt);
    expect(progress.skipped, isFalse);
  });
}
