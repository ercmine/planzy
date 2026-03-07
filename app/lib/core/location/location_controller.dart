import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../permissions/permission_service.dart';
import '../permissions/permission_state.dart';
import 'location_models.dart';
import 'location_service.dart';

class LocationControllerState {
  const LocationControllerState({
    required this.status,
    this.location,
    this.errorMessage,
    this.manualOverride,
  });

  factory LocationControllerState.initial() {
    return const LocationControllerState(status: LocationStatus.loading);
  }

  final LocationStatus status;
  final AppLocation? location;
  final String? errorMessage;
  final AppLocation? manualOverride;

  AppLocation? get effectiveLocation => manualOverride ?? location;

  LocationControllerState copyWith({
    LocationStatus? status,
    AppLocation? location,
    String? errorMessage,
    AppLocation? manualOverride,
    bool clearError = false,
    bool clearManualOverride = false,
  }) {
    return LocationControllerState(
      status: status ?? this.status,
      location: location ?? this.location,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      manualOverride:
          clearManualOverride ? null : (manualOverride ?? this.manualOverride),
    );
  }
}

class LocationController extends StateNotifier<LocationControllerState> {
  LocationController({
    required PermissionService permissionService,
    required LocationService locationService,
  })  : _permissionService = permissionService,
        _locationService = locationService,
        super(LocationControllerState.initial());

  final PermissionService _permissionService;
  final LocationService _locationService;

  Future<void> requestPermissionAndLoad() async {
    state = state.copyWith(status: LocationStatus.loading, clearError: true);

    final permission = await _permissionService.requestLocation();
    if (permission != PermissionState.granted) {
      state = state.copyWith(status: LocationStatus.permissionDenied);
      return;
    }

    await loadCurrentLocation();
  }

  Future<void> loadCurrentLocation() async {
    state = state.copyWith(status: LocationStatus.loading, clearError: true);

    final hasPermission = await _permissionService.checkLocation();
    if (hasPermission != PermissionState.granted) {
      state = state.copyWith(status: LocationStatus.permissionDenied);
      return;
    }

    final enabled = await _locationService.isLocationServiceEnabled();
    if (!enabled) {
      state = state.copyWith(status: LocationStatus.serviceDisabled);
      return;
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
}
