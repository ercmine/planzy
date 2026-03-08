class FoursquareLocation {
  const FoursquareLocation({
    required this.lat,
    required this.lng,
    this.formattedAddress,
    this.locality,
    this.region,
    this.country,
    this.neighborhood,
  });

  final double lat;
  final double lng;
  final String? formattedAddress;
  final String? locality;
  final String? region;
  final String? country;
  final String? neighborhood;
}

class FoursquareCategory {
  const FoursquareCategory({required this.id, required this.name});

  final int id;
  final String name;
}

class FoursquarePhoto {
  const FoursquarePhoto({
    required this.id,
    required this.prefix,
    required this.suffix,
    this.width,
    this.height,
  });

  final String id;
  final String prefix;
  final String suffix;
  final int? width;
  final int? height;

  String get originalUrl => '${prefix}original$suffix';
}

class FoursquarePlace {
  const FoursquarePlace({
    required this.fsqId,
    required this.name,
    required this.categories,
    required this.location,
    this.distanceMeters,
    this.rating,
    this.price,
    this.description,
    this.tel,
    this.website,
    this.primaryPhoto,
    this.photos = const <FoursquarePhoto>[],
  });

  final String fsqId;
  final String name;
  final List<FoursquareCategory> categories;
  final FoursquareLocation location;
  final int? distanceMeters;
  final double? rating;
  final int? price;
  final String? description;
  final String? tel;
  final String? website;
  final FoursquarePhoto? primaryPhoto;
  final List<FoursquarePhoto> photos;
}
