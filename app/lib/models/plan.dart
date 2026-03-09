import '../core/json_parsers.dart';
import 'special.dart';

List<String>? parseOpeningHoursText(Object? value) {
  if (value is String) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : <String>[trimmed];
  }
  return parseStringList(value);
}

double? parseNullableDouble(Object? value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value.trim());
  return null;
}

double parseRequiredDouble(Object? value) {
  final parsed = parseNullableDouble(value);
  if (parsed == null) {
    throw const FormatException('Expected a non-null double value.');
  }
  return parsed;
}

class PlanLocation {
  const PlanLocation({required this.lat, required this.lng, this.address});

  final double lat;
  final double lng;
  final String? address;

  PlanLocation copyWith({double? lat, double? lng, String? address}) =>
      PlanLocation(lat: lat ?? this.lat, lng: lng ?? this.lng, address: address ?? this.address);

  factory PlanLocation.fromJson(Map<String, dynamic> json) => PlanLocation(
        lat: parseRequiredDouble(json['lat'] ?? json['latitude']),
        lng: parseRequiredDouble(json['lng'] ?? json['longitude'] ?? json['lon']),
        address: (json['address'] ?? json['formattedAddress'])?.toString(),
      );

  Map<String, dynamic> toJson() => {'lat': lat, 'lng': lng, 'address': address};
}

class PlanPhoto {
  const PlanPhoto({
    required this.url,
    this.token,
    this.width,
    this.height,
    this.thumbnailUrl,
    this.mediumUrl,
    this.largeUrl,
    this.fullUrl,
    this.provider,
    this.sourceType,
    this.attributionText,
  });

  final String url;
  final String? token;
  final int? width;
  final int? height;
  final String? thumbnailUrl;
  final String? mediumUrl;
  final String? largeUrl;
  final String? fullUrl;
  final String? provider;
  final String? sourceType;
  final String? attributionText;

  factory PlanPhoto.fromJson(Map<String, dynamic> json) => PlanPhoto(
        url: (json['url'] ?? json['photoUrl'] ?? '').toString(),
        token: json['token']?.toString(),
        width: parseInt(json['width']),
        height: parseInt(json['height']),
        thumbnailUrl: json['thumbnailUrl']?.toString(),
        mediumUrl: json['mediumUrl']?.toString(),
        largeUrl: json['largeUrl']?.toString(),
        fullUrl: json['fullUrl']?.toString(),
        provider: json['provider']?.toString(),
        sourceType: json['sourceType']?.toString(),
        attributionText: json['attributionText']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'url': url,
        'token': token,
        'width': width,
        'height': height,
        'thumbnailUrl': thumbnailUrl,
        'mediumUrl': mediumUrl,
        'largeUrl': largeUrl,
        'fullUrl': fullUrl,
        'provider': provider,
        'sourceType': sourceType,
        'attributionText': attributionText,
      };
}

class PlanHours {
  const PlanHours({this.openNow, this.weekdayText, this.rows});

  final bool? openNow;
  final List<String>? weekdayText;
  final List<String>? rows;

  factory PlanHours.fromJson(Map<String, dynamic> json) => PlanHours(
        openNow: parseBool(json['openNow']),
        weekdayText: parseStringList(json['weekdayText']),
        rows: parseStringList(json['rows']),
      );

  Map<String, dynamic> toJson() => {'openNow': openNow, 'weekdayText': weekdayText, 'rows': rows};
}

class PlanDeepLinks {
  const PlanDeepLinks({this.mapsLink, this.websiteLink, this.callLink, this.bookingLink, this.ticketLink});

  final String? mapsLink;
  final String? websiteLink;
  final String? callLink;
  final String? bookingLink;
  final String? ticketLink;

  factory PlanDeepLinks.fromJson(Map<String, dynamic> json) => PlanDeepLinks(
        mapsLink: json['mapsLink']?.toString(),
        websiteLink: json['websiteLink']?.toString(),
        callLink: json['callLink']?.toString(),
        bookingLink: json['bookingLink']?.toString(),
        ticketLink: json['ticketLink']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'mapsLink': mapsLink,
        'websiteLink': websiteLink,
        'callLink': callLink,
        'bookingLink': bookingLink,
        'ticketLink': ticketLink,
      };
}

class Plan {
  const Plan({
    required this.id,
    required this.source,
    required this.sourceId,
    required this.title,
    required this.category,
    required this.location,
    this.description,
    this.distanceMeters,
    this.hours,
    this.openingHoursText,
    this.phone,
    this.deepLinks,
    this.photos,
    this.priceLevel,
    this.rating,
    this.reviewCount,
    this.metadata,
  });

  final String id;
  final String source;
  final String sourceId;
  final String title;
  final String category;
  final PlanLocation location;
  final String? description;
  final double? distanceMeters;
  final PlanHours? hours;
  final List<String>? openingHoursText;
  final String? phone;
  final PlanDeepLinks? deepLinks;
  final List<PlanPhoto>? photos;
  final int? priceLevel;
  final double? rating;
  final int? reviewCount;
  final Map<String, dynamic>? metadata;

  Plan copyWith({
    String? id,
    String? source,
    String? sourceId,
    String? title,
    String? category,
    PlanLocation? location,
    String? description,
    double? distanceMeters,
    PlanHours? hours,
    List<String>? openingHoursText,
    String? phone,
    PlanDeepLinks? deepLinks,
    List<PlanPhoto>? photos,
    int? priceLevel,
    double? rating,
    int? reviewCount,
    Map<String, dynamic>? metadata,
  }) =>
      Plan(
        id: id ?? this.id,
        source: source ?? this.source,
        sourceId: sourceId ?? this.sourceId,
        title: title ?? this.title,
        category: category ?? this.category,
        location: location ?? this.location,
        description: description ?? this.description,
        distanceMeters: distanceMeters ?? this.distanceMeters,
        hours: hours ?? this.hours,
        openingHoursText: openingHoursText ?? this.openingHoursText,
        phone: phone ?? this.phone,
        deepLinks: deepLinks ?? this.deepLinks,
        photos: photos ?? this.photos,
        priceLevel: priceLevel ?? this.priceLevel,
        rating: rating ?? this.rating,
        reviewCount: reviewCount ?? this.reviewCount,
        metadata: metadata ?? this.metadata,
      );

  factory Plan.fromJson(Map<String, dynamic> json) {
    final sourceId = (json['sourceId'] ?? json['placeId'] ?? json['id'])?.toString() ?? '';
    final source = (json['source'] ?? json['provider'] ?? 'unknown').toString();
    final mapsLink = json['mapsLink'] ?? json['googleMapsUri'];
    final websiteLink = json['websiteLink'] ?? json['websiteUri'] ?? json['website'];
    final callLink = json['callLink'] ?? json['phoneUri'];

    final locationRaw = json['location'];
    final location = locationRaw is Map<String, dynamic>
        ? PlanLocation.fromJson(locationRaw)
        : PlanLocation.fromJson({
            'lat': json['lat'] ?? json['latitude'],
            'lng': json['lng'] ?? json['longitude'] ?? json['lon'],
            'address': json['address'] ?? json['formattedAddress'],
          });

    return Plan(
      id: (json['id'] ?? json['planId'] ?? sourceId).toString(),
      source: source,
      sourceId: sourceId,
      title: (json['title'] ?? json['name'] ?? json['label'] ?? '').toString(),
      category: (json['category'] ?? json['primaryCategory'] ?? json['kind'] ?? 'Place').toString(),
      location: location,
      description: json['description']?.toString(),
      distanceMeters: parseNullableDouble(json['distanceMeters'] ?? json['distance']),
      hours: json['hours'] is Map<String, dynamic> ? PlanHours.fromJson(json['hours'] as Map<String, dynamic>) : null,
      openingHoursText: parseOpeningHoursText(
        json['openingHoursText'] ?? json['openingHours'] ?? (json['hours'] as Map?)?['weekdayText'],
      ),
      phone: json['phone']?.toString(),
      deepLinks: _parseDeepLinks(json, mapsLink, websiteLink, callLink),
      photos: _parsePhotos(json['photos']),
      priceLevel: parseInt(json['priceLevel']),
      rating: parseNullableDouble(json['rating']),
      reviewCount: parseInt(json['reviewCount']),
      metadata: _normalizeMetadata(json['metadata']),
    );
  }

  static PlanDeepLinks? _parseDeepLinks(
    Map<String, dynamic> json,
    Object? mapsLink,
    Object? websiteLink,
    Object? callLink,
  ) {
    final deepLinks = json['deepLinks'];
    if (deepLinks is Map<String, dynamic>) {
      return PlanDeepLinks.fromJson({
        ...deepLinks,
        if (mapsLink != null) 'mapsLink': mapsLink,
        if (websiteLink != null) 'websiteLink': websiteLink,
        if (callLink != null) 'callLink': callLink,
      });
    }
    if (mapsLink != null || websiteLink != null || callLink != null) {
      return PlanDeepLinks(
        mapsLink: mapsLink?.toString(),
        websiteLink: websiteLink?.toString(),
        callLink: callLink?.toString(),
      );
    }
    return null;
  }

  static List<PlanPhoto>? _parsePhotos(Object? value) {
    if (value is! List) return null;
    final photos = value
        .whereType<Map>()
        .map((photo) => PlanPhoto.fromJson(photo.map((k, v) => MapEntry(k.toString(), v))))
        .where((photo) => photo.url.trim().isNotEmpty)
        .toList(growable: false);
    return photos.isEmpty ? null : photos;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'source': source,
        'sourceId': sourceId,
        'title': title,
        'category': category,
        'location': location.toJson(),
        'description': description,
        'distanceMeters': distanceMeters,
        'hours': hours?.toJson(),
        'openingHoursText': openingHoursText,
        'phone': phone,
        'deepLinks': deepLinks?.toJson(),
        'photos': photos?.map((photo) => photo.toJson()).toList(growable: false),
        'priceLevel': priceLevel,
        'rating': rating,
        'reviewCount': reviewCount,
        'metadata': metadata,
      };
}

Map<String, dynamic>? _normalizeMetadata(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.map((key, item) => MapEntry(key.toString(), item));
  return null;
}

extension PlanVenueHooksX on Plan {
  List<Special> get specials => Special.fromPlanMetadata(metadata);

  bool get hasSpecials => specials.isNotEmpty;

  bool get isVenueLike {
    const sources = <String>{'google', 'yelp', 'promoted', 'deduped', 'foursquare'};
    final sourceNormalized = source.toLowerCase();
    final kind = metadata?['kind']?.toString().toLowerCase();
    final hasAddress = location.address?.trim().isNotEmpty == true;

    return hasAddress || sources.contains(sourceNormalized) || kind == 'theater';
  }
}
