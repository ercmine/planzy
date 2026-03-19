import 'package:latlong2/latlong.dart';

class MapViewport {
  const MapViewport({
    required this.centerLat,
    required this.centerLng,
    required this.zoom,
  });

  final double centerLat;
  final double centerLng;
  final double zoom;

  double get latSpan => 0.35 / (zoom / 10);
  double get lngSpan => 0.45 / (zoom / 10);
  double get north => centerLat + latSpan / 2;
  double get south => centerLat - latSpan / 2;
  double get east => centerLng + lngSpan / 2;
  double get west => centerLng - lngSpan / 2;

  MapViewport copyWith({double? centerLat, double? centerLng, double? zoom}) {
    return MapViewport(
      centerLat: centerLat ?? this.centerLat,
      centerLng: centerLng ?? this.centerLng,
      zoom: zoom ?? this.zoom,
    );
  }

  LatLng toLatLng() => LatLng(centerLat, centerLng);
}

class SearchAreaContext {
  const SearchAreaContext({
    required this.viewport,
    this.categories = const <String>[],
    this.mode = 'search_this_area',
  });

  final MapViewport viewport;
  final List<String> categories;
  final String mode;
}

class MapPin {
  const MapPin({
    required this.canonicalPlaceId,
    required this.name,
    required this.category,
    required this.latitude,
    required this.longitude,
    required this.rating,
    this.city,
    this.region,
    this.neighborhood,
    this.distanceMeters,
    this.thumbnailUrl,
    this.hasCreatorMedia = false,
    this.hasReviews = false,
    this.descriptionSnippet,
  });

  final String canonicalPlaceId;
  final String name;
  final String category;
  final double latitude;
  final double longitude;
  final double rating;
  final String? city;
  final String? region;
  final String? neighborhood;
  final double? distanceMeters;
  final String? thumbnailUrl;
  final bool hasCreatorMedia;
  final bool hasReviews;
  final String? descriptionSnippet;

  String get categoryLabel => category.replaceAll('-', ' ');
  String get neighborhoodLabel => neighborhood ?? city ?? region ?? 'Nearby';
}

class PlacePreviewSummary {
  const PlacePreviewSummary({
    required this.canonicalPlaceId,
    required this.title,
    required this.category,
    required this.rating,
    this.regionLabel,
  });

  final String canonicalPlaceId;
  final String title;
  final String category;
  final double rating;
  final String? regionLabel;
}

class GeocodeResult {
  const GeocodeResult({
    required this.displayName,
    required this.lat,
    required this.lng,
    this.city,
    this.region,
  });

  final String displayName;
  final double lat;
  final double lng;
  final String? city;
  final String? region;
}

class ReverseGeocodeResult {
  const ReverseGeocodeResult({required this.displayName, this.city, this.region});

  final String displayName;
  final String? city;
  final String? region;
}
