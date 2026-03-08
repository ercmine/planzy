import '../../core/json_parsers.dart';
import '../../core/validation/url.dart';
import '../../models/plan.dart';

class PlaceSourceAttribution {
  const PlaceSourceAttribution({
    required this.provider,
    this.label,
    this.url,
    this.isPrimary = false,
  });

  final String provider;
  final String? label;
  final String? url;
  final bool isPrimary;
}

class PlaceDetailPhoto {
  const PlaceDetailPhoto({
    required this.url,
    this.token,
    this.width,
    this.height,
    this.provider,
  });

  final String url;
  final String? token;
  final int? width;
  final int? height;
  final String? provider;
}

class PlaceDetailHoursRow {
  const PlaceDetailHoursRow({required this.label, this.isToday = false});

  final String label;
  final bool isToday;
}

class PlaceDetailRelatedItem {
  const PlaceDetailRelatedItem({
    required this.id,
    required this.sourceId,
    required this.title,
    required this.category,
    required this.source,
    this.address,
    this.rating,
    this.distanceMeters,
    this.photoUrl,
    this.lat,
    this.lng,
  });

  final String id;
  final String sourceId;
  final String title;
  final String category;
  final String source;
  final String? address;
  final double? rating;
  final double? distanceMeters;
  final String? photoUrl;
  final double? lat;
  final double? lng;
}

class PlaceDetailViewData {
  const PlaceDetailViewData({
    required this.id,
    required this.sourceId,
    required this.name,
    required this.category,
    required this.source,
    this.subcategory,
    this.shortDescription,
    this.longDescription,
    this.address,
    this.phone,
    this.website,
    this.rating,
    this.reviewCount,
    this.priceLevel,
    this.distanceMeters,
    this.openNow,
    this.hours = const <PlaceDetailHoursRow>[],
    this.photos = const <PlaceDetailPhoto>[],
    this.attribution = const <PlaceSourceAttribution>[],
    this.related = const <PlaceDetailRelatedItem>[],
    this.lat,
    this.lng,
    this.serviceOptions = const <String>[],
    this.amenities = const <String>[],
  });

  final String id;
  final String sourceId;
  final String name;
  final String category;
  final String source;
  final String? subcategory;
  final String? shortDescription;
  final String? longDescription;
  final String? address;
  final String? phone;
  final String? website;
  final double? rating;
  final int? reviewCount;
  final int? priceLevel;
  final double? distanceMeters;
  final bool? openNow;
  final List<PlaceDetailHoursRow> hours;
  final List<PlaceDetailPhoto> photos;
  final List<PlaceSourceAttribution> attribution;
  final List<PlaceDetailRelatedItem> related;
  final double? lat;
  final double? lng;
  final List<String> serviceOptions;
  final List<String> amenities;

  String? get effectiveDescription {
    final long = longDescription?.trim();
    if (long != null && long.isNotEmpty) return long;
    final short = shortDescription?.trim();
    if (short != null && short.isNotEmpty) return short;
    return null;
  }
}

PlaceDetailViewData normalizePlaceDetail({
  required Plan basePlan,
  required Map<String, dynamic>? details,
  required String? Function(String? token) buildPhotoUrl,
  List<PlaceDetailRelatedItem> seedRelated = const <PlaceDetailRelatedItem>[],
}) {
  final raw = details ?? const <String, dynamic>{};
  final photos = normalizeDetailPhotos(basePlan: basePlan, details: raw, buildPhotoUrl: buildPhotoUrl);
  final description = _pickDetailDescription(raw) ?? basePlan.description;
  final shortDescription = _pickString(raw, const ['summary', 'editorialSummary.text']);

  final lat = parseDouble(raw['lat']) ?? basePlan.location.lat;
  final lng = parseDouble(raw['lng']) ?? basePlan.location.lng;

  final rows = normalizeHoursRows(raw, fallback: basePlan.openingHoursText);
  final related = selectRelatedPlaces(
    currentPlaceId: basePlan.id,
    currentSourceId: basePlan.sourceId,
    apiRelated: raw['relatedPlaces'],
    seed: seedRelated,
    buildPhotoUrl: buildPhotoUrl,
  );

  return PlaceDetailViewData(
    id: basePlan.id,
    sourceId: basePlan.sourceId,
    name: _pickString(raw, const ['name']) ?? basePlan.title,
    category: basePlan.category,
    source: basePlan.source,
    subcategory: _pickString(raw, const ['subcategory', 'providerCategory']),
    shortDescription: shortDescription,
    longDescription: description,
    address: _pickString(raw, const ['address', 'formattedAddress']) ?? basePlan.location.address,
    phone: _pickString(raw, const ['phone', 'formattedPhoneNumber']) ?? basePlan.phone,
    website: _pickString(raw, const ['websiteUri', 'website', 'url']) ?? basePlan.deepLinks?.websiteLink,
    rating: parseDouble(raw['rating']) ?? basePlan.rating,
    reviewCount: parseInt(raw['userRatingCount'] ?? raw['reviewCount']) ?? basePlan.reviewCount,
    priceLevel: parseInt(raw['priceLevel']) ?? basePlan.priceLevel,
    distanceMeters: basePlan.distanceMeters,
    openNow: _parseOpenNow(raw, basePlan.hours),
    hours: rows,
    photos: photos,
    attribution: _composeAttribution(basePlan: basePlan, details: raw),
    related: related,
    lat: lat,
    lng: lng,
    serviceOptions: _parseStringList(raw['serviceOptions']),
    amenities: _parseStringList(raw['amenities']),
  );
}

List<PlaceDetailPhoto> normalizeDetailPhotos({
  required Plan basePlan,
  required Map<String, dynamic> details,
  required String? Function(String? token) buildPhotoUrl,
}) {
  final out = <PlaceDetailPhoto>[];
  final dedupe = <String>{};

  void addPhoto(String? token, {String? url, int? width, int? height, String? provider}) {
    final resolved = url ?? buildPhotoUrl(token);
    if (resolved == null || !isHttpUrl(resolved) || dedupe.contains(resolved)) {
      return;
    }
    dedupe.add(resolved);
    out.add(PlaceDetailPhoto(url: resolved, token: token, width: width, height: height, provider: provider));
  }

  final photos = details['photos'];
  if (photos is List) {
    for (final item in photos) {
      if (item is Map<String, dynamic>) {
        addPhoto(
          item['name']?.toString() ?? item['photoReference']?.toString() ?? item['token']?.toString(),
          url: item['url']?.toString(),
          width: parseInt(item['width']),
          height: parseInt(item['height']),
          provider: item['provider']?.toString(),
        );
      } else {
        addPhoto(item?.toString());
      }
    }
  }

  addPhoto(details['photo']?.toString(), url: details['photoUrl']?.toString(), provider: details['source']?.toString());

  for (final photo in basePlan.photos ?? const <PlanPhoto>[]) {
    addPhoto(photo.token, url: photo.url, width: photo.width, height: photo.height, provider: basePlan.source);
  }

  return out;
}

List<PlaceDetailHoursRow> normalizeHoursRows(Map<String, dynamic> details, {List<String>? fallback}) {
  final rows = parseOpeningHoursText(details['openingHoursText'] ?? details['openingHours']) ?? fallback;
  if (rows == null || rows.isEmpty) {
    return const <PlaceDetailHoursRow>[];
  }

  final today = DateTime.now().weekday - 1;
  return rows
      .asMap()
      .entries
      .map((entry) => PlaceDetailHoursRow(label: entry.value, isToday: entry.key == today))
      .toList(growable: false);
}

List<PlaceDetailRelatedItem> selectRelatedPlaces({
  required String currentPlaceId,
  required String currentSourceId,
  required Object? apiRelated,
  required List<PlaceDetailRelatedItem> seed,
  required String? Function(String? token) buildPhotoUrl,
}) {
  final out = <PlaceDetailRelatedItem>[];
  final seen = <String>{currentPlaceId, currentSourceId};

  void push(PlaceDetailRelatedItem item) {
    if (seen.contains(item.id) || seen.contains(item.sourceId)) return;
    seen.add(item.id);
    seen.add(item.sourceId);
    out.add(item);
  }

  for (final item in seed) {
    push(item);
  }

  if (apiRelated is List) {
    for (final raw in apiRelated.whereType<Map<String, dynamic>>()) {
      final id = raw['id']?.toString() ?? raw['sourceId']?.toString();
      final sourceId = raw['sourceId']?.toString() ?? raw['id']?.toString();
      final title = raw['title']?.toString() ?? raw['name']?.toString();
      if (id == null || sourceId == null || title == null) continue;
      push(
        PlaceDetailRelatedItem(
          id: id,
          sourceId: sourceId,
          title: title,
          category: raw['category']?.toString() ?? 'place',
          source: raw['source']?.toString() ?? 'unknown',
          address: raw['address']?.toString(),
          rating: parseDouble(raw['rating']),
          distanceMeters: parseDouble(raw['distanceMeters']),
          photoUrl: buildPhotoUrl(raw['photo']?.toString() ?? raw['photoUrl']?.toString()),
          lat: parseDouble(raw['lat']),
          lng: parseDouble(raw['lng']),
        ),
      );
    }
  }

  return out.take(12).toList(growable: false);
}

bool? _parseOpenNow(Map<String, dynamic> details, PlanHours? fallback) {
  final value = details['openNow'] ?? details['hours']?['openNow'];
  if (value is bool) return value;
  if (value is String) {
    final normalized = value.toLowerCase().trim();
    if (normalized == 'open' || normalized == 'true') return true;
    if (normalized == 'closed' || normalized == 'false') return false;
  }
  return fallback?.openNow;
}

List<PlaceSourceAttribution> _composeAttribution({
  required Plan basePlan,
  required Map<String, dynamic> details,
}) {
  final out = <PlaceSourceAttribution>[];
  out.add(PlaceSourceAttribution(provider: basePlan.source, label: 'Data from ${basePlan.source}', isPrimary: true));

  final providers = details['providers'];
  if (providers is List) {
    for (final provider in providers) {
      final value = provider?.toString().trim();
      if (value == null || value.isEmpty || value.toLowerCase() == basePlan.source.toLowerCase()) continue;
      out.add(PlaceSourceAttribution(provider: value, label: 'Enriched with $value'));
    }
  }

  final explicit = details['attribution'];
  if (explicit is List) {
    for (final item in explicit.whereType<Map<String, dynamic>>()) {
      final provider = item['provider']?.toString();
      if (provider == null || provider.isEmpty) continue;
      out.add(PlaceSourceAttribution(
        provider: provider,
        label: item['label']?.toString() ?? 'Data from $provider',
        url: item['url']?.toString(),
      ));
    }
  }

  final deduped = <String>{};
  return out.where((item) => deduped.add('${item.provider.toLowerCase()}|${item.label ?? ''}')).toList(growable: false);
}

String? _pickDetailDescription(Map<String, dynamic> details) {
  return _pickString(details, const ['description', 'editorialSummary.text', 'editorialSummary', 'summary', 'about']);
}

String? _pickString(Map<String, dynamic> details, List<String> keys) {
  for (final key in keys) {
    final value = _resolveKeyPath(details, key)?.toString().trim();
    if (value != null && value.isNotEmpty) {
      return value;
    }
  }
  return null;
}

Object? _resolveKeyPath(Map<String, dynamic> map, String path) {
  final parts = path.split('.');
  Object? current = map;
  for (final part in parts) {
    if (current is Map<String, dynamic>) {
      current = current[part];
    } else {
      return null;
    }
  }
  return current;
}

List<String> _parseStringList(Object? value) {
  return parseStringList(value)?.where((item) => item.trim().isNotEmpty).toList(growable: false) ?? const <String>[];
}
