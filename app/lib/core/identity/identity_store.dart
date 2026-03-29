import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/uuid.dart';

class LocalUserProfile {
  const LocalUserProfile({
    required this.userId,
    required this.displayName,
    required this.username,
    required this.bio,
  });

  final String userId;
  final String displayName;
  final String username;
  final String bio;

  String get initials {
    final parts = displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList(growable: false);
    if (parts.isEmpty) return 'P';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'.toUpperCase();
  }

  LocalUserProfile copyWith({
    String? userId,
    String? displayName,
    String? username,
    String? bio,
  }) {
    return LocalUserProfile(
      userId: userId ?? this.userId,
      displayName: displayName ?? this.displayName,
      username: username ?? this.username,
      bio: bio ?? this.bio,
    );
  }
}


class OnboardingProgressSnapshot {
  const OnboardingProgressSnapshot({
    required this.step,
    required this.startedAt,
    required this.firstMoveAt,
    required this.firstRewardAt,
    required this.skipped,
  });

  final String step;
  final DateTime? startedAt;
  final DateTime? firstMoveAt;
  final DateTime? firstRewardAt;
  final bool skipped;
}

class IdentityStore {
  IdentityStore({
    required SharedPreferences sharedPreferences,
    FlutterSecureStorage? secureStorage,
  })  : _prefs = sharedPreferences,
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const userIdKey = 'dryad_user_id';
  static const onboardingCompletedKey = 'onboarding_completed';
  static const onboardingCategoriesKey = 'onboarding_categories';
  static const onboardingStepKey = 'onboarding_step';
  static const onboardingStartedAtKey = 'onboarding_started_at';
  static const onboardingFirstMoveAtKey = 'onboarding_first_move_at';
  static const onboardingFirstRewardAtKey = 'onboarding_first_reward_at';
  static const onboardingSkippedKey = 'onboarding_skipped';
  static const displayNameKey = 'profile_display_name';
  static const usernameKey = 'profile_username';
  static const bioKey = 'profile_bio';

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


  Future<OnboardingProgressSnapshot> getOnboardingProgress() async {
    final startedRaw = _prefs.getString(onboardingStartedAtKey);
    final firstMoveRaw = _prefs.getString(onboardingFirstMoveAtKey);
    final firstRewardRaw = _prefs.getString(onboardingFirstRewardAtKey);
    return OnboardingProgressSnapshot(
      step: _prefs.getString(onboardingStepKey) ?? 'identityIntro',
      startedAt: startedRaw == null ? null : DateTime.tryParse(startedRaw),
      firstMoveAt: firstMoveRaw == null ? null : DateTime.tryParse(firstMoveRaw),
      firstRewardAt: firstRewardRaw == null ? null : DateTime.tryParse(firstRewardRaw),
      skipped: _prefs.getBool(onboardingSkippedKey) ?? false,
    );
  }

  Future<void> setOnboardingStep(String step) {
    return _prefs.setString(onboardingStepKey, step);
  }

  Future<void> setOnboardingStartedAt(DateTime value) {
    return _prefs.setString(onboardingStartedAtKey, value.toUtc().toIso8601String());
  }

  Future<void> setOnboardingFirstMoveAt(DateTime value) {
    return _prefs.setString(onboardingFirstMoveAtKey, value.toUtc().toIso8601String());
  }

  Future<void> setOnboardingFirstRewardAt(DateTime value) {
    return _prefs.setString(onboardingFirstRewardAtKey, value.toUtc().toIso8601String());
  }

  Future<void> setOnboardingSkipped(bool skipped) {
    return _prefs.setBool(onboardingSkippedKey, skipped);
  }

  Future<void> setOnboardingCategories(List<String> values) {
    final cleaned = values.where((value) => value.isNotEmpty).toSet().toList(growable: false);
    return _prefs.setStringList(onboardingCategoriesKey, cleaned);
  }

  Future<LocalUserProfile> getOrCreateProfile() async {
    final userId = await getOrCreateUserId();
    final fallbackSuffix = userId.replaceAll('-', '').substring(0, 6).toLowerCase();
    final displayName = (_prefs.getString(displayNameKey) ?? '').trim();
    final username = (_prefs.getString(usernameKey) ?? '').trim();
    final bio = (_prefs.getString(bioKey) ?? '').trim();

    final profile = LocalUserProfile(
      userId: userId,
      displayName: displayName.isEmpty ? 'Dryad Explorer' : displayName,
      username: username.isEmpty ? 'local_$fallbackSuffix' : _sanitizeUsername(username),
      bio: bio.isEmpty ? 'Tracking honest reviews, saved places, and what to try next around town.' : bio,
    );

    await _prefs.setString(displayNameKey, profile.displayName);
    await _prefs.setString(usernameKey, profile.username);
    await _prefs.setString(bioKey, profile.bio);
    return profile;
  }

  Future<LocalUserProfile> updateProfile({
    required String displayName,
    required String username,
    required String bio,
  }) async {
    final current = await getOrCreateProfile();
    final next = current.copyWith(
      displayName: displayName.trim().isEmpty ? current.displayName : displayName.trim(),
      username: _sanitizeUsername(username),
      bio: bio.trim(),
    );
    await _prefs.setString(displayNameKey, next.displayName);
    await _prefs.setString(usernameKey, next.username);
    await _prefs.setString(bioKey, next.bio);
    return next;
  }

  Future<void> resetIdentity() async {
    await _secureStorage.delete(key: userIdKey);
    await _prefs.remove(displayNameKey);
    await _prefs.remove(usernameKey);
    await _prefs.remove(bioKey);
    await _prefs.remove(onboardingCompletedKey);
    await _prefs.remove(onboardingCategoriesKey);
    await _prefs.remove(onboardingStepKey);
    await _prefs.remove(onboardingStartedAtKey);
    await _prefs.remove(onboardingFirstMoveAtKey);
    await _prefs.remove(onboardingFirstRewardAtKey);
    await _prefs.remove(onboardingSkippedKey);
  }

  String _sanitizeUsername(String value) {
    final cleaned = value
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9_\.]'), '_')
        .replaceAll(RegExp(r'_+'), '_');
    if (cleaned.isEmpty) {
      return 'local_${Uuid.v4().replaceAll('-', '').substring(0, 6).toLowerCase()}';
    }
    return cleaned;
  }
}
