import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../core/cache/local_store.dart';
import '../core/cache/memory_cache.dart';
import '../core/utils/hashing.dart';
import '../models/deck_batch.dart';
import '../models/plan.dart';

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

  DeckBatchResponse? getCachedDeckBatch(
    String sessionId,
    DeckQueryParams params,
  ) {
    final filtersHash = hashForCacheKey(params.toCacheMap());
    return _deckBatchCache.get(_cacheKey(sessionId, params, filtersHash));
  }

  Future<DeckBatchResponse> fetchDeckBatch(
    String sessionId,
    DeckQueryParams params, {
    bool forceRefresh = false,
  }) async {
    final filtersHash = hashForCacheKey(params.toCacheMap());
    final cacheKey = _cacheKey(sessionId, params, filtersHash);

    if (!forceRefresh) {
      final cached = _deckBatchCache.get(cacheKey);
      if (cached != null) {
        return cached;
      }
    }

    final response = await apiClient.getDecoded(ApiEndpoints.plans);
    if (response is! List) {
      throw FormatException('Parse error: expected list but got ${response.runtimeType}');
    }

    final plans = response
        .whereType<Map<String, dynamic>>()
        .map(_planFromApi)
        .toList(growable: false);

    final deck = DeckBatchResponse(
      sessionId: sessionId,
      plans: plans,
      nextCursor: null,
      mix: DeckSourceMix(
        providersUsed: plans.map((p) => p.source).toSet().toList(growable: false),
        planSourceCounts: _sourceCounts(plans),
        categoryCounts: _categoryCounts(plans),
        sponsoredCount: 0,
      ),
    );
    _deckBatchCache.set(cacheKey, deck);

    await localStore.saveLastSessionId(sessionId);
    await localStore.saveLastCursor(sessionId, deck.nextCursor);
    await localStore.saveLastSeenDeckKey(sessionId, cacheKey);

    return deck;
  }

  String _cacheKey(String sessionId, DeckQueryParams params, String filtersHash) {
    return '$sessionId::${params.cursor ?? ''}::$filtersHash';
  }
}

Map<String, int> _sourceCounts(List<Plan> plans) {
  final out = <String, int>{};
  for (final plan in plans) {
    out.update(plan.source, (value) => value + 1, ifAbsent: () => 1);
  }
  return out;
}

Map<String, int> _categoryCounts(List<Plan> plans) {
  final out = <String, int>{};
  for (final plan in plans) {
    out.update(plan.category, (value) => value + 1, ifAbsent: () => 1);
  }
  return out;
}

Plan _planFromApi(Map<String, dynamic> json) {
  final id = (json['id'] ?? '').toString();
  final title = (json['title'] ?? '').toString();
  final category = (json['category'] ?? '').toString();
  final source = (json['source'] ?? 'api').toString();
  if (id.isEmpty || title.isEmpty || category.isEmpty) {
    throw const FormatException('Parse error: missing required plan fields');
  }

  return Plan(
    id: id,
    source: source,
    sourceId: id,
    title: title,
    category: category,
    location: const PlanLocation(lat: 0, lng: 0),
    metadata: const {'source': 'api.perbug.com'},
  );
}
