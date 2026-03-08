import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../../core/json_parsers.dart';
import 'foursquare_models.dart';

class FoursquareClient {
  FoursquareClient({
    required this.httpClient,
    required this.apiKey,
    this.timeout = const Duration(seconds: 15),
  });

  final http.Client httpClient;
  final String apiKey;
  final Duration timeout;

  static const String _baseUrl = 'https://api.foursquare.com/v3/places';

  bool get isConfigured => apiKey.trim().isNotEmpty && apiKey.trim() != 'REPLACE_ME';

  Future<List<FoursquarePlace>> searchPlaces({
    required String query,
    double? lat,
    double? lng,
    int? radius,
    List<String>? categories,
    int limit = 20,
  }) async {
    final params = <String, String>{
      'query': query,
      'limit': limit.clamp(1, 50).toString(),
    };
    if (lat != null && lng != null) {
      params['ll'] = '${lat.toStringAsFixed(6)},${lng.toStringAsFixed(6)}';
    }
    if (radius != null) {
      params['radius'] = radius.clamp(100, 100000).toString();
    }
    if (categories != null && categories.isNotEmpty) {
      params['categories'] = categories.join(',');
    }

    final jsonMap = await _getJson('$_baseUrl/search', params);
    final results = jsonMap['results'];
    if (results is! List) {
      return const <FoursquarePlace>[];
    }

    return results
        .whereType<Map<String, dynamic>>()
        .map(_parsePlace)
        .whereType<FoursquarePlace>()
        .toList(growable: false);
  }

  Future<FoursquarePlace?> getPlaceDetails(String fsqId) async {
    final jsonMap = await _getJson('$_baseUrl/$fsqId', const <String, String>{});
    return _parsePlace(jsonMap);
  }

  Future<List<FoursquarePhoto>> getPlacePhotos(String fsqId, {int limit = 10}) async {
    final jsonList = await _getJsonList('$_baseUrl/$fsqId/photos', {
      'limit': limit.clamp(1, 50).toString(),
    });

    return jsonList
        .whereType<Map<String, dynamic>>()
        .map(_parsePhoto)
        .whereType<FoursquarePhoto>()
        .toList(growable: false);
  }

  Future<Map<String, dynamic>> _getJson(String url, Map<String, String> query) async {
    final uri = Uri.parse(url).replace(queryParameters: query.isEmpty ? null : query);
    final response = await httpClient
        .get(uri, headers: _headers)
        .timeout(timeout);
    if (kDebugMode) {
      debugPrint('[FSQ] GET $uri -> ${response.statusCode}');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('Foursquare request failed (${response.statusCode}).');
    }
    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Unexpected Foursquare response payload');
    }
    return decoded;
  }

  Future<List<dynamic>> _getJsonList(String url, Map<String, String> query) async {
    final uri = Uri.parse(url).replace(queryParameters: query.isEmpty ? null : query);
    final response = await httpClient
        .get(uri, headers: _headers)
        .timeout(timeout);
    if (kDebugMode) {
      debugPrint('[FSQ] GET $uri -> ${response.statusCode}');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError('Foursquare request failed (${response.statusCode}).');
    }
    final decoded = jsonDecode(response.body);
    if (decoded is! List) {
      throw const FormatException('Unexpected Foursquare photo response payload');
    }
    return decoded;
  }

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        'Authorization': apiKey,
      };

  FoursquarePlace? _parsePlace(Map<String, dynamic> json) {
    final fsqId = json['fsq_id']?.toString() ?? json['id']?.toString();
    final name = json['name']?.toString();
    final geocodes = json['geocodes'];
    final main = geocodes is Map<String, dynamic> ? geocodes['main'] : null;
    final lat = parseDouble(main is Map<String, dynamic> ? main['latitude'] : json['latitude']);
    final lng = parseDouble(main is Map<String, dynamic> ? main['longitude'] : json['longitude']);
    if (fsqId == null || name == null || lat == null || lng == null) {
      return null;
    }

    final location = json['location'] as Map<String, dynamic>?;
    final categories = (json['categories'] as List?)
            ?.whereType<Map<String, dynamic>>()
            .map((item) => FoursquareCategory(
                  id: parseInt(item['id']) ?? 0,
                  name: item['name']?.toString() ?? 'Place',
                ))
            .where((item) => item.id != 0)
            .toList(growable: false) ??
        const <FoursquareCategory>[];

    final photo = _parsePhoto(json['photos'] is List && (json['photos'] as List).isNotEmpty
        ? (json['photos'] as List).first
        : json['photo']);

    return FoursquarePlace(
      fsqId: fsqId,
      name: name,
      categories: categories,
      location: FoursquareLocation(
        lat: lat,
        lng: lng,
        formattedAddress: location?['formatted_address']?.toString(),
        locality: location?['locality']?.toString(),
        region: location?['region']?.toString(),
        country: location?['country']?.toString(),
        neighborhood: (() { final neighborhoods = (location?['neighborhood'] as List?)?.whereType<String>().toList(growable:false); return (neighborhoods != null && neighborhoods.isNotEmpty) ? neighborhoods.first : null; })(),
      ),
      distanceMeters: parseInt(json['distance']),
      rating: parseDouble(json['rating']),
      price: parseInt(json['price']),
      description: json['description']?.toString(),
      tel: json['tel']?.toString(),
      website: json['website']?.toString(),
      primaryPhoto: photo,
      photos: (json['photos'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(_parsePhoto)
              .whereType<FoursquarePhoto>()
              .toList(growable: false) ??
          const <FoursquarePhoto>[],
    );
  }

  FoursquarePhoto? _parsePhoto(Object? raw) {
    if (raw is! Map<String, dynamic>) {
      return null;
    }
    final prefix = raw['prefix']?.toString();
    final suffix = raw['suffix']?.toString();
    final id = raw['id']?.toString() ?? raw['created_at']?.toString();
    if (prefix == null || suffix == null || id == null) {
      return null;
    }
    return FoursquarePhoto(
      id: id,
      prefix: prefix,
      suffix: suffix,
      width: parseInt(raw['width']),
      height: parseInt(raw['height']),
    );
  }
}
