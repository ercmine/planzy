import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'location_models.dart';
import 'location_permission_service.dart';
import 'location_service.dart';

class LocationControllerState {
  const LocationControllerState({
    required this.status,
    this.location,
    this.errorMessage,
    this.manualOverride,
    this.lastPermissionResult,
  });

  factory LocationControllerState.initial() {
    return const LocationControllerState(status: LocationStatus.loading);
  }

  final LocationStatus status;
  final AppLocation? location;
  final String? errorMessage;
  final AppLocation? manualOverride;
  final LocationPermissionResult? lastPermissionResult;

  AppLocation? get effectiveLocation => manualOverride ?? location;

  LocationControllerState copyWith({
    LocationStatus? status,
    AppLocation? location,
    String? errorMessage,
    AppLocation? manualOverride,
    LocationPermissionResult? lastPermissionResult,
    bool clearError = false,
    bool clearManualOverride = false,
  }) {
    return LocationControllerState(
      status: status ?? this.status,
      location: location ?? this.location,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      manualOverride:
          clearManualOverride ? null : (manualOverride ?? this.manualOverride),
      lastPermissionResult: lastPermissionResult ?? this.lastPermissionResult,
    );
  }
}

class LocationController extends StateNotifier<LocationControllerState> {
  LocationController({
    required LocationPermissionService locationPermissionService,
    required LocationService locationService,
  })  : _locationPermissionService = locationPermissionService,
        _locationService = locationService,
        super(LocationControllerState.initial());

  final LocationPermissionService _locationPermissionService;
  final LocationService _locationService;

  Future<void> requestPermissionAndLoad() async {
    state = state.copyWith(status: LocationStatus.loading, clearError: true);

    final permissionResult =
        await _locationPermissionService.ensureLocationPermission();
    state = state.copyWith(lastPermissionResult: permissionResult);

    if (!permissionResult.isGranted) {
      state = state.copyWith(
        status: permissionResult.outcome == LocationPermissionOutcome.servicesOff
            ? LocationStatus.serviceDisabled
            : LocationStatus.permissionDenied,
        errorMessage: _errorForPermission(permissionResult),
      );
      return;
    }

    await loadCurrentLocation(skipPermissionCheck: true);
  }

  Future<void> loadCurrentLocation({bool skipPermissionCheck = false}) async {
    state = state.copyWith(status: LocationStatus.loading, clearError: true);

    if (!skipPermissionCheck) {
      final permissionResult =
          await _locationPermissionService.checkPermissionStatus();
      state = state.copyWith(lastPermissionResult: permissionResult);

      if (!permissionResult.isGranted) {
        state = state.copyWith(
          status:
              permissionResult.outcome == LocationPermissionOutcome.servicesOff
                  ? LocationStatus.serviceDisabled
                  : LocationStatus.permissionDenied,
          errorMessage: _errorForPermission(permissionResult),
        );
        return;
      }
    }

    try {
      final liveLocation = await _locationService.getCurrentLocation();
      state = state.copyWith(
        status: LocationStatus.ready,
        location: liveLocation,
        clearError: true,
      );
    } catch (error) {
      state = state.copyWith(
        status: LocationStatus.error,
        errorMessage: error.toString(),
      );
    }
  }

  void setManualOverride(double lat, double lng) {
    final override = AppLocation(
      lat: lat,
      lng: lng,
      capturedAt: DateTime.now(),
      isOverride: true,
    );

    state = state.copyWith(
      manualOverride: override,
      status: LocationStatus.ready,
      clearError: true,
    );

    // TODO(permissions): persist manual override in LocalStore when key helpers exist.
  }

  void clearOverride() {
    state = state.copyWith(
      clearManualOverride: true,
      status: state.location != null ? LocationStatus.ready : state.status,
    );
  }

  String _errorForPermission(LocationPermissionResult result) {
    return switch (result.outcome) {
      LocationPermissionOutcome.servicesOff =>
        'Location services are off. Turn on Location Services in Settings.',
      LocationPermissionOutcome.deniedForever =>
        'Location access is blocked for this app. Open Settings to allow access.',
      LocationPermissionOutcome.denied =>
        'Location permission was denied. Tap Enable location to try again.',
      LocationPermissionOutcome.error =>
        'Could not determine location permission. Please try again.',
      LocationPermissionOutcome.granted => 'Location permission granted.',
    };
  }
}
