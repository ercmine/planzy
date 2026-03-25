import '../../api/api_client.dart';
import 'map_discovery_models.dart';

abstract class MapGeoClient {
  Future<List<GeocodeResult>> geocode(String query);
  Future<List<GeocodeResult>> autocomplete(String query);
  Future<List<MapPin>> nearby({required SearchAreaContext context});
  Future<ReverseGeocodeResult?> reverseGeocode({required double lat, required double lng});
}

class RemoteMapGeoClient implements MapGeoClient {
  RemoteMapGeoClient(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<List<GeocodeResult>> geocode(String query) async {
    if (query.trim().isEmpty) return const [];
    final response = await _requestWithFallback(
      primaryPath: '/api/geo/search',
      fallbackPath: '/v1/geocode',
      queryParameters: {'q': query, 'limit': '5'},
    );
    return _parseGeocodeRows(response['results']);
  }


  @override
  Future<List<GeocodeResult>> autocomplete(String query) async {
    if (query.trim().isEmpty) return const [];
    final response = await _requestWithFallback(
      primaryPath: '/api/geo/autocomplete',
      fallbackPath: '/v1/autocomplete',
      queryParameters: {'q': query, 'limit': '8'},
    );
    return _parseGeocodeRows(response['suggestions']);
  }

  @override
  Future<List<MapPin>> nearby({required SearchAreaContext context}) async {
    final viewport = context.viewport;
    final response = await _requestWithFallback(
      primaryPath: '/api/geo/nearby',
      fallbackPath: '/v1/discovery/nearby',
      queryParameters: {
        'lat': viewport.centerLat.toString(),
        'lng': viewport.centerLng.toString(),
        'radius': _radiusMetersFromViewport(viewport).toStringAsFixed(0),
        'limit': '80',
        if (context.categories.isNotEmpty) 'categories': context.categories.join(','),
        'mode': context.mode,
      },
    );
    final rows = response['places'] ?? response['items'];
    if (rows is! List) return const [];
    return rows.whereType<Map<String, dynamic>>().map(_toMapPin).where((pin) => pin.latitude != 0 && pin.longitude != 0).toList(growable: false);
  }

  double _radiusMetersFromViewport(MapViewport viewport) {
    final latMeters = (viewport.north - viewport.south).abs() * 111000;
    final lngMeters = (viewport.east - viewport.west).abs() * 111000;
    final radius = ((latMeters + lngMeters) / 4).clamp(500, 25000);
    return radius.toDouble();
  }

  MapPin _toMapPin(Map<String, dynamic> row) {
    final match = row['match'] is Map<String, dynamic> ? row['match'] as Map<String, dynamic> : const <String, dynamic>{};
    final location = row['location'] is Map<String, dynamic> ? row['location'] as Map<String, dynamic> : const <String, dynamic>{};
    final id = (match['internalPlaceId'] ?? row['placeId'] ?? row['id'] ?? '').toString();
    final name = (row['name'] ?? row['title'] ?? row['displayName'] ?? '').toString();
    final lat = (row['lat'] as num?)?.toDouble() ?? (location['lat'] as num?)?.toDouble() ?? 0;
    final lng = (row['lon'] as num?)?.toDouble() ?? (row['lng'] as num?)?.toDouble() ?? (location['lng'] as num?)?.toDouble() ?? 0;
    return MapPin(
      canonicalPlaceId: id.isEmpty ? name : id,
      name: name,
      category: (row['category'] ?? row['primaryCategory'] ?? 'place').toString(),
      latitude: lat,
      longitude: lng,
      rating: (row['importance'] as num?)?.toDouble() ?? (row['score'] as num?)?.toDouble() ?? 0,
      city: row['city']?.toString(),
      region: row['region']?.toString(),
      neighborhood: row['neighborhood']?.toString(),
      distanceMeters: (row['distanceMeters'] as num?)?.toDouble(),
      thumbnailUrl: row['thumbnailUrl']?.toString(),
      descriptionSnippet: row['shortAddress']?.toString(),
      hasCreatorMedia: match['hasReviews'] == true,
      hasReviews: match['hasReviews'] == true,
      reviewCount: match['hasReviews'] == true ? 1 : 0,
      openNow: row['openNow'] as bool?,
      creatorVideoCount: 0,
    );
  }

  @override
  Future<ReverseGeocodeResult?> reverseGeocode({required double lat, required double lng}) async {
    final response = await _requestWithFallback(
      primaryPath: '/api/geo/reverse',
      fallbackPath: '/v1/reverse-geocode',
      queryParameters: {'lat': lat.toString(), 'lon': lng.toString(), 'lng': lng.toString()},
    );
    final row = response['result'];
    if (row is! Map<String, dynamic>) return null;
    return ReverseGeocodeResult(
      displayName: (row['displayName'] ?? '').toString(),
      city: row['city']?.toString(),
      region: row['region']?.toString(),
    );
  }

  Future<Map<String, dynamic>> _requestWithFallback({
    required String primaryPath,
    required String fallbackPath,
    required Map<String, String> queryParameters,
  }) async {
    try {
      return await _apiClient.getJson(primaryPath, queryParameters: queryParameters);
    } catch (_) {
      return _apiClient.getJson(fallbackPath, queryParameters: queryParameters);
    }
  }

  List<GeocodeResult> _parseGeocodeRows(Object? rows) {
    if (rows is! List) return const [];
    return rows
        .whereType<Map<String, dynamic>>()
        .map((row) {
          return GeocodeResult(
            displayName: (row['displayName'] ?? row['name'] ?? '').toString(),
            lat: (row['lat'] as num?)?.toDouble() ?? 0,
            lng: (row['lon'] as num?)?.toDouble() ?? (row['lng'] as num?)?.toDouble() ?? 0,
            city: row['city']?.toString() ?? row['town']?.toString(),
            region: row['region']?.toString() ?? row['state']?.toString(),
          );
        })
        .where((item) => item.lat != 0 && item.lng != 0)
        .toList(growable: false);
  }
}

abstract class PlaceDiscoveryClient {
  Future<List<MapPin>> searchByViewport(SearchAreaContext context);
}

class BackendPlaceDiscoveryClient implements PlaceDiscoveryClient {
  BackendPlaceDiscoveryClient(this._geoClient);

  final MapGeoClient _geoClient;

  @override
  Future<List<MapPin>> searchByViewport(SearchAreaContext context) {
    return _geoClient.nearby(context: context);
  }
}
