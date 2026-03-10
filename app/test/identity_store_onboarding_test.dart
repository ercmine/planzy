import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/identity/identity_store.dart';
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
}
