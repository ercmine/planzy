import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'identity_store.dart';

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
