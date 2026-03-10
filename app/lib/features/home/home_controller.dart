import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models.dart';
import '../../core/identity/identity_provider.dart';
import '../../core/location/location_controller.dart';
import '../../models/session.dart';
import '../../providers/app_providers.dart';

class HomeSnapshot {
  const HomeSnapshot({
    required this.sessions,
    required this.userId,
    required this.onboardingCategories,
    this.liveResults,
  });

  final List<Session> sessions;
  final String userId;
  final List<String> onboardingCategories;
  final LiveResultsResponse? liveResults;

  int get activeSessionCount => sessions.where((session) => session.status == 'active').length;
}

final homeSnapshotProvider = FutureProvider<HomeSnapshot>((ref) async {
  final sessions = await ref.watch(sessionsRepositoryProvider).listActive();
  final userId = await ref.watch(userIdProvider.future);
  final identityStore = await ref.watch(identityStoreProvider.future);
  final onboardingCategories = await identityStore.getOnboardingCategories();

  LiveResultsResponse? liveResults;
  final locationState = ref.watch(locationControllerProvider);
  final effectiveLocation = locationState.effectiveLocation;
  final liveResultsRepository = await ref.watch(liveResultsRepositoryProvider.future);

  if (effectiveLocation != null) {
    try {
      liveResults = await liveResultsRepository.fetchLiveResults(
        lat: effectiveLocation.lat,
        lng: effectiveLocation.lng,
      );
    } catch (_) {
      liveResults = null;
    }
  }

  return HomeSnapshot(
    sessions: sessions,
    userId: userId,
    onboardingCategories: onboardingCategories,
    liveResults: liveResults,
  );
});
