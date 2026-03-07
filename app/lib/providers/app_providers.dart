import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../api/api_client.dart';
import '../core/cache/local_store.dart';
import '../core/contacts/contacts_controller.dart';
import '../core/contacts/contacts_service.dart';
import '../core/env/env.dart';
import '../core/identity/identity_provider.dart';
import '../core/links/link_launcher.dart';
import '../core/location/location_controller.dart';
import '../core/location/location_service.dart';
import '../core/permissions/permission_service.dart';
import '../core/sharing/share_service.dart';
import '../core/store/sessions_store.dart';
import '../features/deck/deck_controller.dart';
import '../features/deck/deck_state.dart';
import '../features/sessions/create_session/create_session_controller.dart';
import '../features/sessions/join_session/join_session_controller.dart';
import '../features/sessions/session_settings/session_settings_controller.dart';
import '../features/sessions/sessions_controller.dart';
import '../models/session.dart';
import '../repositories/deck_repository.dart';
import '../repositories/ideas_repository.dart';
import '../repositories/sessions_repository.dart';
import '../repositories/telemetry_repository.dart';

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final localStoreProvider = FutureProvider<LocalStore>((ref) async {
  return LocalStore.create();
});

final apiClientProvider = FutureProvider<ApiClient>((ref) async {
  final envConfig = ref.watch(envConfigProvider);
  final httpClient = ref.watch(httpClientProvider);

  return ApiClient(
    httpClient: httpClient,
    envConfig: envConfig,
    userIdResolver: () => ref.read(userIdProvider.future),
  );
});

final deckRepositoryProvider = FutureProvider<DeckRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  final localStore = await ref.watch(localStoreProvider.future);

  return DeckRepository(
    apiClient: apiClient,
    localStore: localStore,
  );
});

final ideasRepositoryProvider = FutureProvider<IdeasRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return IdeasRepository(apiClient: apiClient);
});

final telemetryRepositoryProvider = FutureProvider<TelemetryRepository>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return TelemetryRepository(apiClient: apiClient);
});

final permissionServiceProvider = Provider<PermissionService>((ref) {
  return PermissionService();
});

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

final locationControllerProvider =
    StateNotifierProvider<LocationController, LocationControllerState>((ref) {
  return LocationController(
    permissionService: ref.watch(permissionServiceProvider),
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

final shareServiceProvider = Provider<ShareService>((ref) {
  return ShareService();
});

final linkLauncherProvider = Provider<LinkLauncher>((ref) {
  return LinkLauncher();
});

final sessionsStoreProvider = Provider<SessionsStore>((ref) {
  return SessionsStore();
});

final sessionsRepositoryProvider = Provider<SessionsRepository>((ref) {
  return SessionsRepository(
    sessionsStore: ref.watch(sessionsStoreProvider),
  );
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

final deckControllerProvider = StateNotifierProvider.family<DeckController, DeckState, String>(
  (ref, sessionId) {
    return DeckController(
      ref: ref,
      sessionId: sessionId,
      sessionsRepository: ref.watch(sessionsRepositoryProvider),
    );
  },
);
