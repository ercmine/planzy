import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../api/api_client.dart';
import '../core/ads/ad_deck_injector.dart';
import '../core/ads/ad_policy.dart';
import '../core/ads/ads_config.dart';
import '../core/ads/ads_diagnostics.dart';
import '../core/ads/ads_manager.dart';
import '../core/ads/ads_service.dart';
import '../core/ads/ads_visibility.dart';
import '../core/cache/local_store.dart';
import '../core/connectivity/connectivity_controller.dart';
import '../core/connectivity/connectivity_state.dart';
import '../core/contacts/contacts_controller.dart';
import '../core/contacts/contacts_service.dart';
import '../core/env/env.dart';
import '../core/identity/identity_provider.dart';
import '../core/links/link_launcher.dart';
import '../core/logging/log_settings.dart';
import '../core/location/location_controller.dart';
import '../core/location/location_permission_service.dart';
import '../core/location/location_service.dart';
import '../core/permissions/permission_service.dart';
import '../core/sharing/share_service.dart';
import '../core/store/sessions_store.dart';
import '../core/store/swipes_store.dart';
import '../core/telemetry/telemetry_dispatcher.dart';
import '../core/telemetry/telemetry_queue_store.dart';
import '../features/deck/deck_controller.dart';
import '../features/deck/deck_state.dart';
import '../features/ideas/ideas_controller.dart';
import '../features/ideas/ideas_state.dart';
import '../features/premium/premium_models.dart';
import '../features/premium/premium_repository.dart';
import '../features/results/results_controller.dart';
import '../features/results/results_state.dart';
import '../features/settings/settings_controller.dart';
import '../features/home/review_prompt_service.dart';
import '../features/accomplishments/accomplishment_repository.dart';
import '../features/challenges/challenge_repository.dart';
import '../features/settings/settings_state.dart';
import '../features/sessions/create_session/create_session_controller.dart';
import '../features/sessions/join_session/join_session_controller.dart';
import '../features/sessions/session_settings/session_settings_controller.dart';
import '../features/sessions/sessions_controller.dart';
import '../models/entitlement_summary.dart';
import '../models/rollout_summary.dart';
import '../models/session.dart';
import '../repositories/deck_repository.dart';
import '../repositories/ideas_repository.dart';
import '../repositories/live_results_repository.dart';
import '../repositories/reviews_repository.dart';
import '../repositories/reward_repository.dart';
import '../repositories/sessions_repository.dart';
import '../repositories/swipes_repository.dart';
import '../repositories/telemetry_repository.dart';
import '../services/foursquare/foursquare_client.dart';


final adsConfigProvider = Provider<AdsConfig>((ref) {
  return ref.watch(envConfigProvider).adsConfig;
});

final adsServiceProvider = Provider<AdsService>((ref) {
  return AdsService();
});

final adDeckInjectorProvider = Provider<AdDeckInjector>((ref) {
  return AdDeckInjector(visibility: ref.watch(adsVisibilityProvider));
});


final adsDiagnosticsProvider = Provider<AdsDiagnostics>((ref) {
  return const AdsDiagnostics();
});

final entitlementSummaryProvider = FutureProvider<EntitlementSummary>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return apiClient.fetchEntitlementSummary();
});

final entitlementSummaryFamilyProvider = FutureProvider.family<EntitlementSummary, String>((ref, family) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return apiClient.fetchEntitlementSummary(targetType: family);
});

final rolloutSummaryProvider = FutureProvider<RolloutSummary>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return apiClient.fetchRolloutSummary();
});

final featureRolloutProvider = Provider.family<AsyncValue<RolloutDecision>, String>((ref, featureKey) {
  final summary = ref.watch(rolloutSummaryProvider);
  return summary.whenData((value) => value.feature(featureKey));
});

final premiumRepositoryProvider = FutureProvider<PremiumRepository>((ref) async {
  final client = await ref.watch(apiClientProvider.future);
  return PremiumRepository(apiClient: client);
});

final premiumPlansProvider = FutureProvider.family<List<PremiumPlan>, String>((ref, family) async {
  final repository = await ref.watch(premiumRepositoryProvider.future);
  return repository.fetchPlans(family: family);
});

final subscriptionOverviewProvider = FutureProvider<SubscriptionOverview>((ref) async {
  final repository = await ref.watch(premiumRepositoryProvider.future);
  return repository.fetchSubscriptionOverview();
});

final adEntitlementSnapshotProvider = Provider<AdEntitlementSnapshot>((ref) {
  final entitlementAsync = ref.watch(entitlementSummaryProvider);

  return entitlementAsync.when(
    data: (_) => const AdEntitlementSnapshot(
      isAnonymous: false,
      isResolved: true,
      serverTierOverride: AdEntitlementTier.free,
    ),
    loading: () => const AdEntitlementSnapshot(isAnonymous: false, isResolved: false),
    error: (_, __) => const AdEntitlementSnapshot(isAnonymous: false, isResolved: false),
  );
});

final adsVisibilityProvider = Provider<AdsVisibility>((ref) {
  return AdsVisibility(
    config: ref.watch(adsConfigProvider),
    entitlement: ref.watch(adEntitlementSnapshotProvider),
  );
});

final adsManagerProvider = Provider<AdsManager>((ref) {
  return AdsManager(
    adsService: ref.watch(adsServiceProvider),
    visibility: ref.watch(adsVisibilityProvider),
    diagnostics: ref.watch(adsDiagnosticsProvider),
  );
});

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final sharedPreferencesProvider = FutureProvider<SharedPreferences>((ref) async {
  return SharedPreferences.getInstance();
});

final localStoreProvider = FutureProvider<LocalStore>((ref) async {
  return LocalStore.create();
});

final apiClientProvider = FutureProvider<ApiClient>((ref) async {
  final envConfig = ref.watch(envConfigProvider);
  final httpClient = ref.watch(httpClientProvider);

  final client = ApiClient(
    httpClient: httpClient,
    envConfig: envConfig,
    userIdResolver: () => ref.read(userIdProvider.future),
  );
  await client.runStartupDebugChecklist();
  return client;
});


final foursquareClientProvider = Provider<FoursquareClient>((ref) {
  final envConfig = ref.watch(envConfigProvider);
  final apiKey = envConfig.fsqApiKey;
  return FoursquareClient(
    httpClient: ref.watch(httpClientProvider),
    apiKey: apiKey ?? '',
  );
});

final deckRepositoryProvider = FutureProvider<DeckRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  final localStore = await ref.watch(localStoreProvider.future);

  return DeckRepository(
    apiClient: apiClient,
    localStore: localStore,
    foursquareClient: ref.watch(foursquareClientProvider),
  );
});

final ideasRepositoryProvider = FutureProvider<IdeasRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return IdeasRepository(apiClient: apiClient);
});


final liveResultsRepositoryProvider = FutureProvider<LiveResultsRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return LiveResultsRepository(apiClient: apiClient);
});


final reviewsRepositoryProvider = FutureProvider<ReviewsRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return ReviewsRepository(apiClient: apiClient);
});

final rewardRepositoryProvider = FutureProvider<RewardRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return RewardRepository(apiClient: apiClient);
});

final rewardDashboardProvider = FutureProvider((ref) async {
  final repository = await ref.watch(rewardRepositoryProvider.future);
  return repository.fetchDashboard();
});


final accomplishmentRepositoryProvider = FutureProvider<AccomplishmentRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return AccomplishmentRepository(apiClient: apiClient);
});


final challengeRepositoryProvider = FutureProvider<ChallengeRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return ChallengeRepository(apiClient: apiClient);
});

final telemetryQueueStoreProvider = FutureProvider<TelemetryQueueStore>((ref) async {
  final prefs = await ref.watch(sharedPreferencesProvider.future);
  return TelemetryQueueStore(sharedPreferences: prefs);
});

final telemetryRepositoryProvider = FutureProvider<TelemetryRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  final queueStore = await ref.watch(telemetryQueueStoreProvider.future);
  return TelemetryRepository(
    apiClient: apiClient,
    queueStore: queueStore,
  );
});

final telemetryDispatcherProvider = Provider<TelemetryDispatcher?>((ref) {
  final telemetryRepository = ref.watch(telemetryRepositoryProvider).valueOrNull;
  if (telemetryRepository == null) {
    return null;
  }

  final dispatcher = TelemetryDispatcher(telemetryRepository: telemetryRepository);
  ref.onDispose(dispatcher.dispose);
  return dispatcher;
});


final permissionServiceProvider = Provider<PermissionService>((ref) {
  return PermissionService();
});

final locationPermissionServiceProvider = Provider<LocationPermissionService>((ref) {
  return LocationPermissionService();
});

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

final locationControllerProvider =
    StateNotifierProvider<LocationController, LocationControllerState>((ref) {
  return LocationController(
    locationPermissionService: ref.watch(locationPermissionServiceProvider),
    locationService: ref.watch(locationServiceProvider),
  );
});

final contactsServiceProvider = Provider<ContactsService>((ref) {
  return ContactsService(
    permissionService: ref.watch(permissionServiceProvider),
  );
});

final contactsControllerProvider =
    StateNotifierProvider<ContactsController, ContactsState>((ref) {
  return ContactsController(
    contactsService: ref.watch(contactsServiceProvider),
  );
});

final connectivityControllerProvider =
    StateNotifierProvider<ConnectivityController, ConnectivityState>((ref) {
  return ConnectivityController();
});


final reviewPromptServiceProvider = Provider<ReviewPromptService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider).valueOrNull;
  final apiClient = ref.watch(apiClientProvider).valueOrNull;
  if (prefs == null || apiClient == null) {
    throw StateError('Review prompt dependencies are not ready yet.');
  }
  return ReviewPromptService(apiClient: apiClient, preferences: prefs);
});

final settingsControllerProvider =
    StateNotifierProvider<SettingsController, SettingsState>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider).valueOrNull;
  if (prefs == null) {
    throw StateError('Settings dependencies are not ready yet.');
  }

  return SettingsController(
    permissionService: ref.watch(permissionServiceProvider),
    preferences: prefs,
    logSettingsController: ref.watch(logSettingsControllerProvider.notifier),
    reviewPromptService: ref.watch(reviewPromptServiceProvider),
  );
});


final logSettingsControllerProvider = StateNotifierProvider<LogSettingsController, bool>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider).valueOrNull;
  if (prefs == null) {
    throw StateError('Log settings dependencies are not ready yet.');
  }

  return LogSettingsController(preferences: prefs);
});

final shareServiceProvider = Provider<ShareService>((ref) {
  return ShareService();
});

final linkLauncherProvider = Provider<LinkLauncher>((ref) {
  return LinkLauncher();
});

final sessionsStoreProvider = Provider<SessionsStore>((ref) {
  return SessionsStore();
});

final swipesStoreProvider = Provider<SwipesStore>((ref) {
  return SwipesStore();
});

final sessionsRepositoryProvider = Provider<SessionsRepository>((ref) {
  return SessionsRepository(
    sessionsStore: ref.watch(sessionsStoreProvider),
  );
});

final swipesRepositoryProvider = Provider<SwipesRepository>((ref) {
  return SwipesRepository(swipesStore: ref.watch(swipesStoreProvider));
});

final sessionsControllerProvider =
    StateNotifierProvider<SessionsController, SessionsState>((ref) {
  return SessionsController(
    sessionsRepository: ref.watch(sessionsRepositoryProvider),
  );
});

final createSessionControllerProvider =
    StateNotifierProvider<CreateSessionController, CreateSessionState>((ref) {
  return CreateSessionController(
    sessionsRepository: ref.watch(sessionsRepositoryProvider),
  );
});

final sessionSettingsControllerProvider = StateNotifierProvider.family<
    SessionSettingsController,
    SessionSettingsState,
    String>((ref, sessionId) {
  return SessionSettingsController(
    sessionId: sessionId,
    repository: ref.watch(sessionsRepositoryProvider),
  );
});

final joinSessionControllerProvider =
    StateNotifierProvider.family<JoinSessionController, JoinSessionState, String>(
  (ref, code) {
    return JoinSessionController(
      code: code,
      repository: ref.watch(sessionsRepositoryProvider),
    );
  },
);

final sessionByIdProvider = FutureProvider.family<Session?, String>((ref, sessionId) {
  return ref.watch(sessionsRepositoryProvider).getById(sessionId);
});

final swipeCountProvider = FutureProvider.family<int, String>((ref, sessionId) {
  return ref.watch(swipesRepositoryProvider).getSwipeCount(sessionId);
});

final deckControllerProvider =
    StateNotifierProvider.family<DeckController, DeckState, String>((ref, sessionId) {
  final deckRepositoryAsync = ref.watch(deckRepositoryProvider);
  final telemetryRepositoryAsync = ref.watch(telemetryRepositoryProvider);
  final telemetryDispatcher = ref.watch(telemetryDispatcherProvider);

  final deckRepository = deckRepositoryAsync.valueOrNull;
  final telemetryRepository = telemetryRepositoryAsync.valueOrNull;

  if (deckRepository == null || telemetryRepository == null || telemetryDispatcher == null) {
    throw StateError('Deck dependencies are not ready yet.');
  }

  return DeckController(
    sessionId: sessionId,
    deckRepository: deckRepository,
    swipesRepository: ref.watch(swipesRepositoryProvider),
    telemetryRepository: telemetryRepository,
    telemetryDispatcher: telemetryDispatcher,
    sessionsRepository: ref.watch(sessionsRepositoryProvider),
    locationController: ref.watch(locationControllerProvider.notifier),
    adDeckInjector: ref.watch(adDeckInjectorProvider),
  );
});

final ideasControllerProvider =
    StateNotifierProvider.family<IdeasController, IdeasState, String>((ref, sessionId) {
  final ideasRepository = ref.watch(ideasRepositoryProvider).valueOrNull;
  if (ideasRepository == null) {
    throw StateError('Ideas dependencies are not ready yet.');
  }

  return IdeasController(
    sessionId: sessionId,
    ideasRepository: ideasRepository,
  );
});

final resultsControllerProvider =
    StateNotifierProvider.family<ResultsController, ResultsState, String>((ref, sessionId) {
  final liveResultsRepository = ref.watch(liveResultsRepositoryProvider).valueOrNull;
  return ResultsController(
    sessionId: sessionId,
    swipesRepository: ref.watch(swipesRepositoryProvider),
    shareService: ref.watch(shareServiceProvider),
    liveResultsRepository: liveResultsRepository,
    locationController: ref.watch(locationControllerProvider.notifier),
    adsVisibility: ref.watch(adsVisibilityProvider),
  );
});
