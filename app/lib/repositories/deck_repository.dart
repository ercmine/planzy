import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../core/cache/local_store.dart';
import '../core/cache/memory_cache.dart';
import '../core/utils/hashing.dart';
import '../models/deck_batch.dart';

class DeckQueryParams {
  const DeckQueryParams({
    this.cursor,
    this.limit,
    this.lat,
    this.lng,
    this.radiusMeters,
    this.categories,
    this.openNow,
    this.priceLevelMax,
    this.timeStart,
    this.timeEnd,
    this.locale,
  });

  final String? cursor;
  final int? limit;
  final double? lat;
  final double? lng;
  final int? radiusMeters;
  final List<String>? categories;
  final bool? openNow;
  final int? priceLevelMax;
  final String? timeStart;
  final String? timeEnd;
  final String? locale;

  Map<String, dynamic> toCacheMap() => <String, dynamic>{
        'cursor': cursor,
        'limit': limit,
        'lat': lat,
        'lng': lng,
        'radiusMeters': radiusMeters,
        'categories': categories,
        'openNow': openNow,
        'priceLevelMax': priceLevelMax,
        'timeStart': timeStart,
        'timeEnd': timeEnd,
        'locale': locale,
      };

  Map<String, String?> toQueryMap({required String defaultLocale}) {
    return <String, String?>{
      'cursor': cursor,
      'limit': limit?.toString(),
      'lat': lat?.toString(),
      'lng': lng?.toString(),
      'radiusMeters': radiusMeters?.toString(),
      'categories': categories?.join(','),
      'openNow': openNow?.toString(),
      'priceLevelMax': priceLevelMax?.toString(),
      'timeStart': timeStart,
      'timeEnd': timeEnd,
      'locale': locale ?? defaultLocale,
    };
  }
}

class DeckRepository {
  DeckRepository({
    required this.apiClient,
    required this.localStore,
    MemoryCache<String, DeckBatchResponse>? deckBatchCache,
  }) : _deckBatchCache = deckBatchCache ??
            MemoryCache<String, DeckBatchResponse>(ttl: const Duration(seconds: 30));

  final ApiClient apiClient;
  final LocalStore localStore;
  final MemoryCache<String, DeckBatchResponse> _deckBatchCache;

  Future<DeckBatchResponse> fetchDeckBatch(
    String sessionId,
    DeckQueryParams params, {
    bool forceRefresh = false,
  }) async {
    final filtersHash = hashForCacheKey(params.toCacheMap());
    final cacheKey = '$sessionId::${params.cursor ?? ''}::$filtersHash';

    if (!forceRefresh) {
      final cached = _deckBatchCache.get(cacheKey);
      if (cached != null) {
        return cached;
      }
    }

    final response = await apiClient.getJson(
      ApiEndpoints.sessionDeck(sessionId),
      queryParameters: params.toQueryMap(defaultLocale: 'en-US'),
    );

    final deck = DeckBatchResponse.fromJson(response);
    _deckBatchCache.set(cacheKey, deck);

    await localStore.saveLastSessionId(sessionId);
    await localStore.saveLastCursor(sessionId, deck.nextCursor);
    await localStore.saveLastSeenDeckKey(sessionId, cacheKey);

    return deck;
  }
}
