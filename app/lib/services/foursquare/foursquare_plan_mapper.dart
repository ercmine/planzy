import '../../models/plan.dart';
import 'foursquare_models.dart';

class FoursquarePlanMapper {
  const FoursquarePlanMapper._();

  static Plan toPlan(FoursquarePlace place) {
    final gallery = <PlanPhoto>[
      if (place.primaryPhoto != null) _toPhoto(place.primaryPhoto!),
      ...place.photos.map(_toPhoto),
    ];
    final dedupedPhotos = <String, PlanPhoto>{for (final p in gallery) p.url: p}.values.toList(growable: false);
    final categories = place.categories.map((c) => c.name).where((name) => name.trim().isNotEmpty).toList(growable: false);

    return Plan(
      id: 'fsq-${place.fsqId}',
      source: 'foursquare',
      sourceId: place.fsqId,
      title: place.name,
      category: categories.isNotEmpty ? categories.first : 'Place',
      description: _buildDescription(place),
      location: PlanLocation(
        lat: place.location.lat,
        lng: place.location.lng,
        address: place.location.formattedAddress,
      ),
      distanceMeters: place.distanceMeters?.toDouble(),
      rating: place.rating,
      priceLevel: place.price,
      phone: place.tel,
      photos: dedupedPhotos.isEmpty ? null : dedupedPhotos,
      deepLinks: PlanDeepLinks(
        mapsLink: 'https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}',
        websiteLink: place.website,
        callLink: place.tel,
      ),
      metadata: {
        'source': 'foursquare',
        'photoUrl': dedupedPhotos.isNotEmpty ? dedupedPhotos.first.url : null,
        'categories': categories,
        'fullDescription': place.description,
      },
    );
  }

  static PlanPhoto _toPhoto(FoursquarePhoto photo) => PlanPhoto(
        url: photo.originalUrl,
        token: photo.id,
        width: photo.width,
        height: photo.height,
        thumbnailUrl: photo.originalUrl,
        mediumUrl: photo.originalUrl,
        largeUrl: photo.originalUrl,
        fullUrl: photo.originalUrl,
        provider: 'foursquare',
        sourceType: 'provider',
      );

  static String _buildDescription(FoursquarePlace place) {
    final explicit = place.description?.trim();
    if (explicit != null && explicit.isNotEmpty) {
      return explicit;
    }

    final categoryText = place.categories.isEmpty ? 'A local place' : place.categories.first.name;
    final area = [
      place.location.neighborhood,
      place.location.locality,
      place.location.region,
    ].whereType<String>().where((value) => value.trim().isNotEmpty).join(', ');

    if (area.isNotEmpty) {
      return '$categoryText in $area with map location and contact details on Dryad.';
    }

    final address = place.location.formattedAddress;
    if (address != null && address.trim().isNotEmpty) {
      return '$categoryText near $address with map location and contact details on Dryad.';
    }

    return '$categoryText with map location and business details on Dryad.';
  }
}
