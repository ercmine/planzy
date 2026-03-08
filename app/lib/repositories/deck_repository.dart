import '../api/api_client.dart';
import '../api/api_error.dart';
import '../api/endpoints.dart';
import '../core/logging/log.dart';
import '../core/cache/local_store.dart';
import '../core/cache/memory_cache.dart';
import '../core/utils/hashing.dart';
import '../models/deck_batch.dart';
import '../models/deep_links.dart';
import '../models/plan.dart';

class DeckQueryParams {
  static const int _defaultMaxResults = 20;
  static const int _minMaxResults = 1;
  static const int _maxMaxResults = 20;

  const DeckQueryParams({
    this.cursor,
    this.maxResults,
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
  final int? maxResults;
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
        'maxResults': _clampedMaxResults,
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
      'maxResults': _clampedMaxResults.toString(),
      'lat': lat == null ? null : lat!.toStringAsFixed(6),
      'lng': lng == null ? null : lng!.toStringAsFixed(6),
      'radiusMeters': radiusMeters?.toString(),
      'categories': categories?.join(','),
      'openNow': openNow?.toString(),
      'priceLevelMax': priceLevelMax?.toString(),
      'timeStart': timeStart,
      'timeEnd': timeEnd,
      'locale': locale ?? defaultLocale,
    };
  }

  int get _clampedMaxResults =>
      (maxResults ?? _defaultMaxResults).clamp(_minMaxResults, _maxMaxResults);
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

    if (params.lat == null || params.lng == null) {
      throw const FormatException('Missing required lat/lng query params for /plans');
    }

    try {
      final response = await apiClient.getDecoded(
        ApiEndpoints.plans,
        queryParameters: params.toQueryMap(defaultLocale: 'en-US'),
      );
      final responseList = _extractPlansList(response);
      final plans = responseList
          .map((item) {
            if (item is! Map<String, dynamic>) {
              throw ApiError.decoding(
                'Parse error: expected plan object but got ${item.runtimeType}',
                details: item,
              );
            }
            return _planFromApi(item);
          })
          .toList(growable: false);

      Log.info(
        '/plans status=${apiClient.lastPlansStatus ?? '-'} bodySnippet="${apiClient.lastPlansBodySnippet ?? '-'}" parsedCount=${plans.length} fallbackUsed=false reason=none',
      );

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
    } on ApiError catch (error) {
      Log.warn('/plans status=${apiClient.lastPlansStatus ?? '-'} bodySnippet="${apiClient.lastPlansBodySnippet ?? '-'}" fallbackUsed=true reason=api-error kind=${error.kind}');
      return _fallbackDeck(sessionId, cacheKey, params, reason: 'api-error:${error.kind}');
    } on FormatException catch (error) {
      Log.warn('/plans status=${apiClient.lastPlansStatus ?? '-'} bodySnippet="${apiClient.lastPlansBodySnippet ?? '-'}" fallbackUsed=true reason=format-exception message=${error.message}');
      return _fallbackDeck(sessionId, cacheKey, params, reason: 'format-exception');
    }
  }

  Future<DeckBatchResponse> _fallbackDeck(
    String sessionId,
    String cacheKey,
    DeckQueryParams params, {
    required String reason,
  }) async {
    Log.warn('/plans fallbackUsed=true reason=$reason');
    final lat = params.lat ?? 44.8620;
    final lng = params.lng ?? -93.5590;
    final plans = <Plan>[
      Plan(
        id: 'debug-fallback-1',
        source: 'debug-fallback',
        sourceId: 'debug-fallback-1',
        title: 'Fallback coffee stop',
        category: 'coffee',
        location: PlanLocation(lat: lat, lng: lng, address: 'Debug fallback'),
        metadata: const {'source': 'debug-fallback'},
      ),
    ];

    final deck = DeckBatchResponse(
      sessionId: sessionId,
      plans: plans,
      nextCursor: null,
      mix: const DeckSourceMix(
        providersUsed: ['debug-fallback'],
        planSourceCounts: {'debug-fallback': 1},
        categoryCounts: {'coffee': 1},
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


List<dynamic> _extractPlansList(Object decoded) {
  if (decoded is List) {
    return decoded;
  }

  if (decoded is Map<String, dynamic>) {
    final plans = decoded['plans'];
    if (plans is List) {
      return plans;
    }

    final results = decoded['results'];
    if (results is List) {
      return results;
    }
  }

  throw ApiError.decoding(
    'Parse error: expected plans array, {plans:[...]}, or {results:[...]}',
    details: decoded,
  );
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

  final rawLocation = json['location'];
  final double? lat = _toDouble(
    rawLocation is Map<String, dynamic> ? rawLocation['lat'] : json['lat'],
  );
  final double? lng = _toDouble(
    rawLocation is Map<String, dynamic> ? rawLocation['lng'] : json['lng'],
  );

  if (lat == null || lng == null) {
    throw const FormatException('Parse error: missing lat/lng');
  }

  final address = (rawLocation is Map<String, dynamic>
          ? rawLocation['address']
          : json['address'])
      ?.toString();

  final photo = json['photo']?.toString();
  final mapsUri = json['googleMapsUri']?.toString();
  final websiteUri = json['websiteUri']?.toString();

  return Plan(
    id: id,
    source: source,
    sourceId: (json['placeId'] ?? json['sourceId'] ?? id).toString(),
    title: title,
    category: category,
    location: PlanLocation(lat: lat, lng: lng, address: address),
    priceLevel: (json['priceLevel'] as num?)?.toInt(),
    rating: _toDouble(json['rating']),
    reviewCount: (json['userRatingCount'] as num?)?.toInt(),
    photos: photo == null || photo.isEmpty ? null : [PlanPhoto(url: photo)],
    deepLinks: (mapsUri != null && mapsUri.isNotEmpty) ||
            (websiteUri != null && websiteUri.isNotEmpty)
        ? DeepLinks(mapsLink: mapsUri, websiteLink: websiteUri)
        : null,
    metadata: {
      'source': 'api.perbug.com',
      'placeId': json['placeId']?.toString(),
      'address': address,
    },
  );
}

double? _toDouble(Object? value) {
  if (value == null) {
    return null;
  }
  if (value is num) {
    return value.toDouble();
  }
  return double.tryParse(value.toString());
}
