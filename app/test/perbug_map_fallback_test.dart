import 'package:dryad/core/location/location_controller.dart';
import 'package:dryad/core/location/location_models.dart';
import 'package:dryad/core/location/location_permission_service.dart';
import 'package:dryad/core/location/location_service.dart';
import 'package:dryad/features/home/map_discovery_clients.dart';
import 'package:dryad/features/home/map_discovery_models.dart';
import 'package:dryad/features/home/map_discovery_tab.dart' show mapGeoClientProvider;
import 'package:dryad/features/home/perbug_game_controller.dart';
import 'package:dryad/providers/app_providers.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeGeoClient implements MapGeoClient {
  _FakeGeoClient({required this.pins, this.throwOnNearby = false});

  final List<MapPin> pins;
  final bool throwOnNearby;

  @override
  Future<List<GeocodeResult>> autocomplete(String query) async => const [];

  @override
  Future<List<GeocodeResult>> geocode(String query) async => const [];

  @override
  Future<List<MapPin>> nearby({required SearchAreaContext context}) async {
    if (throwOnNearby) {
      throw StateError('nearby failed');
    }
    return pins;
  }

  @override
  Future<ReverseGeocodeResult?> reverseGeocode({required double lat, required double lng}) async {
    return const ReverseGeocodeResult(displayName: 'Austin, Texas', city: 'Austin', region: 'Texas');
  }
}

class _FakeLocationPermissionService extends LocationPermissionService {
  _FakeLocationPermissionService({required this.outcome});

  final LocationPermissionOutcome outcome;
  int ensureCalls = 0;

  @override
  Future<LocationPermissionResult> ensureLocationPermission() async {
    ensureCalls += 1;
    return LocationPermissionResult(
      outcome: outcome,
      rawPermission: outcome == LocationPermissionOutcome.granted ? LocationPermission.whileInUse : LocationPermission.denied,
    );
  }

  @override
  Future<LocationPermissionResult> checkPermissionStatus() async {
    return LocationPermissionResult(
      outcome: outcome,
      rawPermission: outcome == LocationPermissionOutcome.granted ? LocationPermission.whileInUse : LocationPermission.denied,
    );
  }
}

class _FakeLocationService extends LocationService {
  @override
  Future<AppLocation> getCurrentLocation() async {
    return AppLocation(lat: 30.2672, lng: -97.7431, capturedAt: DateTime.utc(2026, 1, 1));
  }
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('falls back to deterministic demo nodes when nearby API returns no pins', () async {
    final permissionService = _FakeLocationPermissionService(outcome: LocationPermissionOutcome.denied);
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWith((ref) async => await SharedPreferences.getInstance()),
        locationPermissionServiceProvider.overrideWithValue(permissionService),
        locationServiceProvider.overrideWithValue(_FakeLocationService()),
        mapGeoClientProvider.overrideWith((ref) async => _FakeGeoClient(pins: const [])),
      ],
    );
    addTearDown(container.dispose);

    await container.read(perbugGameControllerProvider.notifier).initialize();
    final state = container.read(perbugGameControllerProvider);

    expect(state.nodes, isNotEmpty);
    expect(state.worldDebug['fallback_active'], true);
    expect(state.worldDebug['generation_status'], 'fallback');
  });

  test('requestLocationAndRefresh triggers permission flow and still keeps map playable on failure', () async {
    final permissionService = _FakeLocationPermissionService(outcome: LocationPermissionOutcome.denied);
    final container = ProviderContainer(
      overrides: [
        sharedPreferencesProvider.overrideWith((ref) async => await SharedPreferences.getInstance()),
        locationPermissionServiceProvider.overrideWithValue(permissionService),
        locationServiceProvider.overrideWithValue(_FakeLocationService()),
        mapGeoClientProvider.overrideWith((ref) async => _FakeGeoClient(pins: const [], throwOnNearby: true)),
      ],
    );
    addTearDown(container.dispose);

    await container.read(perbugGameControllerProvider.notifier).requestLocationAndRefresh();
    final state = container.read(perbugGameControllerProvider);

    expect(permissionService.ensureCalls, 1);
    expect(state.nodes, isNotEmpty);
    expect(state.worldDebug['fallback_active'], true);
    expect(state.error, anyOf(isNull, contains('demo')));
  });
}
