import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/identity/identity_provider.dart';
import '../../core/location/location_models.dart';
import '../../providers/app_providers.dart';
import '../home/home_controller.dart';
import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';
import '../video_platform/video_repository.dart';
import 'onboarding_models.dart';
import 'onboarding_repository.dart';
import 'onboarding_state.dart';

class OnboardingFinishResult {
  const OnboardingFinishResult._({required this.isSuccess, required this.message});

  factory OnboardingFinishResult.success() => const OnboardingFinishResult._(isSuccess: true, message: null);

  factory OnboardingFinishResult.failure(String message) => OnboardingFinishResult._(isSuccess: false, message: message);

  final bool isSuccess;
  final String? message;
}

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
    await finishAndBootstrapFeed();
  }

  Future<OnboardingFinishResult> finishAndBootstrapFeed() async {
    if (state.isFinishing) {
      return OnboardingFinishResult.failure('Finishing onboarding already in progress.');
    }

    final locationState = ref.read(locationControllerProvider);
    final validationError = _validate(state, locationState.effectiveLocation);
    if (validationError != null) {
      debugPrint('[OnboardingFinish] Validation failed: $validationError');
      state = state.copyWith(errorMessage: validationError);
      return OnboardingFinishResult.failure(validationError);
    }

    state = state.copyWith(isFinishing: true, clearError: true);
    debugPrint('[OnboardingFinish] Finish tapped; beginning completion flow.');

    try {
      final identityStore = await ref.read(identityStoreProvider.future);
      final apiClient = await ref.read(apiClientProvider.future);
      final videoRepository = VideoRepository(apiClient: apiClient);
      final onboardingRepository = OnboardingRepository(apiClient: apiClient, videoRepository: videoRepository);
      final location = locationState.effectiveLocation;
      final payload = OnboardingPreferences(
        onboardingCompleted: true,
        city: state.city.trim().isEmpty ? null : state.city.trim(),
        region: state.region.trim().isEmpty ? null : state.region.trim(),
        lat: state.useCurrentLocation ? location?.lat : null,
        lng: state.useCurrentLocation ? location?.lng : null,
        locationSource: state.useCurrentLocation ? 'device' : 'manual',
        locationPermissionOutcome: locationState.lastPermissionResult?.outcome.name,
        interestCategoryIds: state.selectedCategories,
        discoveryMode: state.discoveryMode,
        creatorContentMode: 'balanced',
      );

      debugPrint('[OnboardingFinish] Persisting onboarding payload: ${payload.toJson()}');
      await identityStore.setOnboardingCategories(state.selectedCategories);
      await onboardingRepository.savePreferences(payload);
      await identityStore.setOnboardingCompleted(true);
      debugPrint('[OnboardingFinish] Backend and local onboarding completion persisted.');

      state = state.copyWith(
        step: OnboardingStep.done,
        hasCompleted: true,
        isFinishing: false,
        clearError: true,
      );

      ref.invalidate(onboardingCompletedProvider);
      ref.invalidate(homeSnapshotProvider);
      ref.invalidate(feedBootstrapProvider);
      ref.invalidate(videoFeedProvider(FeedScope.local));
      ref.invalidate(videoFeedProvider(FeedScope.regional));
      ref.invalidate(videoFeedProvider(FeedScope.global));
      debugPrint('[OnboardingFinish] Feed bootstrap invalidated; route target=/');

      return OnboardingFinishResult.success();
    } catch (error, stackTrace) {
      debugPrint('[OnboardingFinish] Completion failed: $error\n$stackTrace');
      state = state.copyWith(
        isFinishing: false,
        errorMessage: 'Could not finish onboarding. Please try again.',
      );
      return OnboardingFinishResult.failure(state.errorMessage!);
    }
  }

  String? _validate(OnboardingState onboarding, AppLocation? effectiveLocation) {
    if (onboarding.selectedCategories.isEmpty) {
      return 'Pick at least one interest to personalize your feed.';
    }

    final hasManualLocation = onboarding.city.trim().isNotEmpty || onboarding.region.trim().isNotEmpty;
    if (onboarding.useCurrentLocation && effectiveLocation == null && !hasManualLocation) {
      return 'Enable location or enter a city/region to continue.';
    }

    if (!onboarding.useCurrentLocation && !hasManualLocation) {
      return 'Enter a city or region to continue.';
    }

    return null;
  }
}

final onboardingControllerProvider =
    NotifierProvider<OnboardingController, OnboardingState>(() {
  return OnboardingController();
});
