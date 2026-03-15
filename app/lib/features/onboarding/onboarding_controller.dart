import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/identity/identity_provider.dart';
import '../../providers/app_providers.dart';
import '../video_platform/video_repository.dart';
import 'onboarding_models.dart';
import 'onboarding_repository.dart';
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

  void toggleCategory(String category) {
    final next = state.selectedCategories.toSet();
    if (!next.add(category)) {
      next.remove(category);
    }
    state = state.copyWith(selectedCategories: next.toList(growable: false));
  }

  void updateLocationMode(bool useCurrentLocation) {
    state = state.copyWith(useCurrentLocation: useCurrentLocation);
  }

  void updateCity(String city) => state = state.copyWith(city: city);

  void updateRegion(String region) => state = state.copyWith(region: region);

  void setDiscoveryMode(DiscoveryMode mode) => state = state.copyWith(discoveryMode: mode);

  Future<void> finish() async {
    final identityStore = await ref.read(identityStoreProvider.future);
    final location = ref.read(locationControllerProvider).effectiveLocation;
    final apiClient = await ref.read(apiClientProvider.future);
    final videoRepository = VideoRepository(apiClient: apiClient);
    final onboardingRepository = OnboardingRepository(apiClient: apiClient, videoRepository: videoRepository);

    await identityStore.setOnboardingCategories(state.selectedCategories);
    await onboardingRepository.savePreferences(
      OnboardingPreferences(
        onboardingCompleted: true,
        city: state.city.trim().isEmpty ? null : state.city.trim(),
        region: state.region.trim().isEmpty ? null : state.region.trim(),
        lat: state.useCurrentLocation ? location?.lat : null,
        lng: state.useCurrentLocation ? location?.lng : null,
        locationSource: state.useCurrentLocation ? 'device' : 'manual',
        interestCategoryIds: state.selectedCategories,
        discoveryMode: state.discoveryMode,
        creatorContentMode: 'balanced',
      ),
    );
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
