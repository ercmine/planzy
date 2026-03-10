import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/uuid.dart';

class IdentityStore {
  IdentityStore({
    required SharedPreferences sharedPreferences,
    FlutterSecureStorage? secureStorage,
  })  : _prefs = sharedPreferences,
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const userIdKey = 'perbug_user_id';
  static const onboardingCompletedKey = 'onboarding_completed';
  static const onboardingCategoriesKey = 'onboarding_categories';

  final SharedPreferences _prefs;
  final FlutterSecureStorage _secureStorage;

  Future<String> getOrCreateUserId() async {
    final existing = await _secureStorage.read(key: userIdKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final generated = Uuid.v4();
    await _secureStorage.write(key: userIdKey, value: generated);
    return generated;
  }

  Future<bool> isOnboardingCompleted() async {
    return _prefs.getBool(onboardingCompletedKey) ?? false;
  }

  Future<void> setOnboardingCompleted(bool value) {
    return _prefs.setBool(onboardingCompletedKey, value);
  }

  Future<List<String>> getOnboardingCategories() async {
    final values = _prefs.getStringList(onboardingCategoriesKey) ?? const <String>[];
    return values.where((value) => value.isNotEmpty).toList(growable: false);
  }

  Future<void> setOnboardingCategories(List<String> values) {
    final cleaned = values.where((value) => value.isNotEmpty).toSet().toList(growable: false);
    return _prefs.setStringList(onboardingCategoriesKey, cleaned);
  }
}
