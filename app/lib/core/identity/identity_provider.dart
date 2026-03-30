import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'identity_store.dart';

enum EntryAuthMode {
  none,
  wallet,
  demo,
}

final identityStoreProvider = FutureProvider<IdentityStore>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return IdentityStore(sharedPreferences: prefs);
});

final userIdProvider = FutureProvider<String>((ref) async {
  final identityStore = await ref.watch(identityStoreProvider.future);
  return identityStore.getOrCreateUserId();
});

final onboardingCompletedProvider = FutureProvider<bool>((ref) async {
  final identityStore = await ref.watch(identityStoreProvider.future);
  return identityStore.isOnboardingCompleted();
});

final localUserProfileProvider = FutureProvider<LocalUserProfile>((ref) async {
  final identityStore = await ref.watch(identityStoreProvider.future);
  return identityStore.getOrCreateProfile();
});


final onboardingIntroRequiredProvider = FutureProvider<bool>((ref) async {
  final identityStore = await ref.watch(identityStoreProvider.future);
  final completed = await identityStore.isOnboardingCompleted();
  if (completed) return false;
  final progress = await identityStore.getOnboardingProgress();
  return progress.step == 'identityIntro';
});

final entryAuthModeProvider = StateProvider<EntryAuthMode>((ref) => EntryAuthMode.none);
