import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../api/api_client.dart';
import '../core/cache/local_store.dart';
import '../core/env/env.dart';
import '../core/identity/identity_provider.dart';
import '../repositories/deck_repository.dart';
import '../repositories/ideas_repository.dart';
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
