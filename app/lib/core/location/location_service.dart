// iOS Info.plist note: NSLocationWhenInUseUsageDescription is required.
import 'package:geolocator/geolocator.dart';

import 'location_models.dart';

class LocationService {
  Future<bool> isLocationServiceEnabled() {
    return Geolocator.isLocationServiceEnabled();
  }

  Future<AppLocation> getCurrentLocation() async {
    Position position;

    try {
      position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
    } catch (_) {
      position = await Geolocator.getCurrentPosition();
    }

    return AppLocation(
      lat: position.latitude,
      lng: position.longitude,
      capturedAt: position.timestamp ?? DateTime.now(),
      accuracyMeters: position.accuracy,
      speedMps: position.speed,
      isMocked: position.isMocked,
    );
  }

  Stream<AppLocation> getLocationStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 8,
      ),
    ).map(
      (position) => AppLocation(
        lat: position.latitude,
        lng: position.longitude,
        capturedAt: position.timestamp ?? DateTime.now(),
        accuracyMeters: position.accuracy,
        speedMps: position.speed,
        isMocked: position.isMocked,
      ),
    );
  }
}
