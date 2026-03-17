import '../../api/api_client.dart';
import '../video_platform/video_models.dart';
import '../video_platform/video_repository.dart';
import 'map_discovery_models.dart';

abstract class MapGeoClient {
  Future<List<GeocodeResult>> geocode(String query);
  Future<ReverseGeocodeResult?> reverseGeocode({required double lat, required double lng});
}

class RemoteMapGeoClient implements MapGeoClient {
  RemoteMapGeoClient(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<List<GeocodeResult>> geocode(String query) async {
    if (query.trim().isEmpty) return const [];
    final response = await _apiClient.postJson('/v1/geocode', body: {'query': query, 'limit': 5});
    final rows = response['results'];
    if (rows is! List) return const [];
    return rows.whereType<Map<String, dynamic>>().map((row) {
      return GeocodeResult(
        displayName: (row['displayName'] ?? '').toString(),
        lat: (row['lat'] as num?)?.toDouble() ?? 0,
        lng: (row['lng'] as num?)?.toDouble() ?? 0,
        city: row['city']?.toString(),
        region: row['state']?.toString(),
      );
    }).toList(growable: false);
  }

  @override
  Future<ReverseGeocodeResult?> reverseGeocode({required double lat, required double lng}) async {
    final response = await _apiClient.postJson('/v1/reverse-geocode', body: {'lat': lat, 'lng': lng});
    final row = response['result'];
    if (row is! Map<String, dynamic>) return null;
    return ReverseGeocodeResult(
      displayName: (row['displayName'] ?? '').toString(),
      city: row['city']?.toString(),
      region: row['state']?.toString(),
    );
  }
}

abstract class PlaceDiscoveryClient {
  Future<List<MapPin>> searchByViewport(SearchAreaContext context);
}

class BackendPlaceDiscoveryClient implements PlaceDiscoveryClient {
  BackendPlaceDiscoveryClient(this._repository);

  final VideoRepository _repository;

  @override
  Future<List<MapPin>> searchByViewport(SearchAreaContext context) async {
    final places = await _repository.fetchMapDiscovery(
      north: context.viewport.north,
      south: context.viewport.south,
      east: context.viewport.east,
      west: context.viewport.west,
      centerLat: context.viewport.centerLat,
      centerLng: context.viewport.centerLng,
      zoom: context.viewport.zoom,
      categories: context.categories,
      mode: context.mode,
    );
    return places.map(_toMapPin).toList(growable: false);
  }

  MapPin _toMapPin(MapDiscoveryPlace place) {
    return MapPin(
      canonicalPlaceId: place.placeId,
      name: place.name,
      category: place.category,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating,
      city: place.city,
      region: place.region,
      descriptionSnippet: place.descriptionSnippet,
    );
  }
}
