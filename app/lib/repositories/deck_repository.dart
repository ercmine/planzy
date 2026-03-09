import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/api_error.dart';
import '../api/endpoints.dart';
import '../core/json_parsers.dart';
import '../core/validation/url.dart';
import '../core/logging/log.dart';
import '../core/cache/local_store.dart';
import '../core/cache/memory_cache.dart';
import '../core/utils/hashing.dart';
import '../models/deck_batch.dart';
import '../models/plan.dart';
import '../services/foursquare/foursquare_client.dart';

class DeckQueryParams {
  static const int _defaultMaxResults = 20;
  static const int _minMaxResults = 1;
  static const int _maxMaxResults = 20;

  const DeckQueryParams({
    this.cursor,
    this.seed,
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
  final String? seed;
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
        'seed': seed,
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
      'seed': seed,
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
    required this.foursquareClient,
    MemoryCache<String, DeckBatchResponse>? deckBatchCache,
  }) : _deckBatchCache = deckBatchCache ??
            MemoryCache<String, DeckBatchResponse>(ttl: const Duration(seconds: 30));

  final ApiClient apiClient;
  final LocalStore localStore;
  final FoursquareClient foursquareClient;
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

    List<dynamic>? responseList;
    try {
      final response = await apiClient.getDecoded(
        ApiEndpoints.plans,
        queryParameters: params.toQueryMap(defaultLocale: 'en-US'),
      );
      responseList = _extractPlansList(response);
      final nextCursor = _extractNextCursor(response);
      final plans = responseList
          .map((item) {
            if (item is! Map<String, dynamic>) {
              throw ApiError.decoding(
                'Parse error: expected plan object but got ${item.runtimeType}',
                details: item,
              );
            }
            return _planFromApi(item, apiClient: apiClient);
          })
          .toList(growable: false);

      Log.info(
        '/plans status=${apiClient.lastPlansStatus ?? '-'} bodySnippet="${apiClient.lastPlansBodySnippet ?? '-'}" parsedCount=${plans.length} fallbackUsed=false reason=none',
      );

      final deck = DeckBatchResponse(
        sessionId: sessionId,
        plans: plans,
        nextCursor: nextCursor,
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
      if (error.kind == ApiErrorKind.decoding) {
        _logFirstPlanRuntimeTypes(responseList);
      }
      Log.warn('/plans status=${apiClient.lastPlansStatus ?? '-'} bodySnippet="${apiClient.lastPlansBodySnippet ?? '-'}" fallbackUsed=false reason=api-error kind=${error.kind}');
      rethrow;
    } on FormatException catch (error) {
      _logFirstPlanRuntimeTypes(responseList);
      Log.warn('/plans status=${apiClient.lastPlansStatus ?? '-'} bodySnippet="${apiClient.lastPlansBodySnippet ?? '-'}" fallbackUsed=false reason=format-exception message=${error.message}');
      throw ApiError.decoding(error.message);
    }
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

String? _extractNextCursor(Object decoded) {
  if (decoded is! Map<String, dynamic>) {
    return null;
  }

  final cursor = decoded['nextCursor'] ?? decoded['cursor'] ?? decoded['pageToken'];
  if (cursor == null) {
    return null;
  }
  final value = cursor.toString().trim();
  return value.isEmpty ? null : value;
}

void _logFirstPlanRuntimeTypes(List<dynamic>? plans) {
  if (!kDebugMode || plans == null || plans.isEmpty) {
    return;
  }

  final first = plans.first;
  if (first is! Map<String, dynamic>) {
    Log.warn('/plans decode debug firstItemType=${first.runtimeType}');
    return;
  }

  final fieldTypes = first.map(
    (key, value) => MapEntry(key, value == null ? 'null' : value.runtimeType.toString()),
  );
  Log.warn('/plans decode debug firstItemFieldTypes=$fieldTypes');
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

Plan _planFromApi(Map<String, dynamic> json, {required ApiClient apiClient}) {
  final id = (json['id'] ?? '').toString();
  final title = (json['title'] ?? '').toString();
  final category = (json['category'] ?? '').toString();
  final source = (json['source'] ?? 'api').toString();
  if (id.isEmpty || title.isEmpty || category.isEmpty) {
    throw const FormatException('Parse error: missing required plan fields');
  }

  final rawLocation = json['location'];
  final double? lat = parseDouble(
    rawLocation is Map<String, dynamic> ? rawLocation['lat'] : json['lat'],
  );
  final double? lng = parseDouble(
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
  final photoUrl = json['photoUrl']?.toString();
  final mapsUri = json['googleMapsUri']?.toString();
  final websiteUri = json['websiteUri']?.toString();
  final photos = _parsePhotos(json: json, apiClient: apiClient, fallbackPhoto: photo, fallbackPhotoUrl: photoUrl);

  return Plan(
    id: id,
    source: source,
    sourceId: (json['placeId'] ?? json['sourceId'] ?? id).toString(),
    title: title,
    category: category,
    description: json['description']?.toString(),
    location: PlanLocation(lat: lat, lng: lng, address: address),
    priceLevel: parseInt(json['priceLevel']),
    rating: parseDouble(json['rating']),
    reviewCount: parseInt(json['userRatingCount'] ?? json['reviewCount']),
    photos: photos,
    phone: json['phone']?.toString(),
    openingHoursText: parseOpeningHoursText(json['openingHoursText'] ?? json['openingHours']),
    deepLinks: (mapsUri != null && mapsUri.isNotEmpty) ||
            (websiteUri != null && websiteUri.isNotEmpty)
        ? PlanDeepLinks(mapsLink: mapsUri, websiteLink: websiteUri)
        : null,
    metadata: {
      'source': 'api.perbug.com',
      'placeId': json['placeId']?.toString(),
      'address': address,
      'photo': photo,
      'photoUrl': photoUrl,
    },
  );
}

List<PlanPhoto>? _parsePhotos({
  required Map<String, dynamic> json,
  required ApiClient apiClient,
  String? fallbackPhoto,
  String? fallbackPhotoUrl,
}) {
  final out = <PlanPhoto>[];

  final rawPhotos = json['photos'];
  if (rawPhotos is List) {
    for (final raw in rawPhotos) {
      if (raw is Map<String, dynamic>) {
        final token = raw['name']?.toString() ?? raw['photoReference']?.toString() ?? raw['token']?.toString();
        final url = apiClient.buildPhotoUrl(raw['url']?.toString() ?? token);
        if (url != null && isHttpUrl(url)) {
          out.add(
            PlanPhoto(
              url: url,
              width: parseInt(raw['widthPx']),
              height: parseInt(raw['heightPx']),
              token: token,
            ),
          );
        }
        continue;
      }
      final token = raw?.toString();
      final url = apiClient.buildPhotoUrl(token);
      if (url != null && isHttpUrl(url)) {
        out.add(PlanPhoto(url: url, token: token));
      }
    }
  }

  final fallback = apiClient.buildPhotoUrl(fallbackPhotoUrl ?? fallbackPhoto);
  if (fallback != null && isHttpUrl(fallback) && out.every((photo) => photo.url != fallback)) {
    out.insert(0, PlanPhoto(url: fallback, token: fallbackPhoto));
  }

  return out.isEmpty ? null : out;
}
