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
    final response = await _apiClient.getJson('/api/geo/search', queryParameters: {
      'q': query,
      'limit': '5',
    });
    final rows = response['results'];
    if (rows is! List) return const [];
    return rows.whereType<Map<String, dynamic>>().map((row) {
      return GeocodeResult(
        displayName: (row['displayName'] ?? '').toString(),
        lat: (row['lat'] as num?)?.toDouble() ?? 0,
        lng: (row['lon'] as num?)?.toDouble() ?? (row['lng'] as num?)?.toDouble() ?? 0,
        city: row['city']?.toString(),
        region: row['region']?.toString(),
      );
    }).toList(growable: false);
  }


  @override
  Future<List<GeocodeResult>> autocomplete(String query) async {
    if (query.trim().isEmpty) return const [];
    final response = await _apiClient.getJson('/api/geo/autocomplete', queryParameters: {
      'q': query,
      'limit': '8',
    });
    final rows = response['suggestions'];
    if (rows is! List) return const [];
    return rows.whereType<Map<String, dynamic>>().map((row) {
      return GeocodeResult(
        displayName: (row['displayName'] ?? '').toString(),
        lat: (row['lat'] as num?)?.toDouble() ?? 0,
        lng: (row['lon'] as num?)?.toDouble() ?? (row['lng'] as num?)?.toDouble() ?? 0,
        city: row['city']?.toString(),
        region: row['region']?.toString(),
      );
    }).where((item) => item.lat != 0 && item.lng != 0).toList(growable: false);
  }

  @override
  Future<List<MapPin>> nearby({required SearchAreaContext context}) async {
    final viewport = context.viewport;
    final response = await _apiClient.getJson('/api/geo/nearby', queryParameters: {
      'lat': viewport.centerLat.toString(),
      'lng': viewport.centerLng.toString(),
      'radius': _radiusMetersFromViewport(viewport).toStringAsFixed(0),
      'limit': '80',
      if (context.categories.isNotEmpty) 'categories': context.categories.join(','),
      'mode': context.mode,
    });
    final rows = response['places'];
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
    return MapPin(
      canonicalPlaceId: (match['internalPlaceId'] ?? row['id'] ?? '').toString(),
      name: (row['name'] ?? row['displayName'] ?? '').toString(),
      category: (row['category'] ?? 'place').toString(),
      latitude: (row['lat'] as num?)?.toDouble() ?? 0,
      longitude: (row['lon'] as num?)?.toDouble() ?? (row['lng'] as num?)?.toDouble() ?? 0,
      rating: (row['importance'] as num?)?.toDouble() ?? 0,
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
    final response = await _apiClient.getJson('/api/geo/reverse', queryParameters: {
      'lat': lat.toString(),
      'lon': lng.toString(),
    });
    final row = response['result'];
    if (row is! Map<String, dynamic>) return null;
    return ReverseGeocodeResult(
      displayName: (row['displayName'] ?? '').toString(),
      city: row['city']?.toString(),
      region: row['region']?.toString(),
    );
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
