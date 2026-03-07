import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

enum LocationPermissionOutcome {
  granted,
  denied,
  deniedForever,
  servicesOff,
  error,
}

class LocationPermissionResult {
  const LocationPermissionResult({
    required this.outcome,
    required this.rawPermission,
  });

  final LocationPermissionOutcome outcome;
  final LocationPermission rawPermission;

  bool get isGranted => outcome == LocationPermissionOutcome.granted;
  bool get canOpenAppSettings => outcome == LocationPermissionOutcome.deniedForever;
  bool get canOpenLocationSettings => outcome == LocationPermissionOutcome.servicesOff;
}

class LocationPermissionService {
  Future<LocationPermissionResult> checkPermissionStatus() async {
    final servicesEnabled = await Geolocator.isLocationServiceEnabled();
    if (!servicesEnabled) {
      return const LocationPermissionResult(
        outcome: LocationPermissionOutcome.servicesOff,
        rawPermission: LocationPermission.denied,
      );
    }

    final permission = await Geolocator.checkPermission();
    return _mapPermission(permission);
  }

  Future<LocationPermissionResult> ensureLocationPermission() async {
    _debugLog('Checking location services and permission.');

    final servicesEnabled = await Geolocator.isLocationServiceEnabled();
    if (!servicesEnabled) {
      _debugLog('Location services are disabled.');
      return const LocationPermissionResult(
        outcome: LocationPermissionOutcome.servicesOff,
        rawPermission: LocationPermission.denied,
      );
    }

    var permission = await Geolocator.checkPermission();
    _debugLog('Current permission: $permission');

    if (permission == LocationPermission.denied) {
      _debugLog('Requesting location permission (When In Use).');
      permission = await Geolocator.requestPermission();
      _debugLog('Permission after request: $permission');
    }

    return _mapPermission(permission);
  }

  Future<bool> openAppSettings() {
    return Geolocator.openAppSettings();
  }

  Future<bool> openLocationSettings() {
    return Geolocator.openLocationSettings();
  }

  LocationPermissionResult _mapPermission(LocationPermission permission) {
    switch (permission) {
      case LocationPermission.always:
      case LocationPermission.whileInUse:
        return LocationPermissionResult(
          outcome: LocationPermissionOutcome.granted,
          rawPermission: permission,
        );
      case LocationPermission.deniedForever:
        return LocationPermissionResult(
          outcome: LocationPermissionOutcome.deniedForever,
          rawPermission: permission,
        );
      case LocationPermission.denied:
      default:
        return LocationPermissionResult(
          outcome: LocationPermissionOutcome.denied,
          rawPermission: permission,
        );
    }
  }

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[LocationPermissionService] $message');
    }
  }
}
