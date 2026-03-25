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
      neighborhood: place.neighborhood,
      distanceMeters: place.distanceMeters,
      thumbnailUrl: place.thumbnailUrl,
      hasCreatorMedia: place.creatorVideoCount > 0,
      hasReviews: place.reviewCount > 0,
      openNow: place.openNow,
      reviewCount: place.reviewCount,
      creatorVideoCount: place.creatorVideoCount,
    );
  }
}
