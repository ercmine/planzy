import 'package:dryad/core/location/location_models.dart';
import 'package:dryad/core/location/location_permission_service.dart';
import 'package:dryad/core/location/location_service.dart';
import 'package:dryad/features/home/map_discovery_clients.dart';
import 'package:dryad/features/home/map_discovery_models.dart';
import 'package:dryad/features/home/map_discovery_tab.dart' show mapGeoClientProvider;
import 'package:dryad/features/home/perbug_game_page.dart';
import 'package:dryad/providers/app_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeGeoClient implements MapGeoClient {
  _FakeGeoClient({required this.pins});

  final List<MapPin> pins;

  @override
  Future<List<GeocodeResult>> autocomplete(String query) async => const [];

  @override
  Future<List<GeocodeResult>> geocode(String query) async => const [];

  @override
  Future<List<MapPin>> nearby({required SearchAreaContext context}) async => pins;

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

class _DeniedLocationService extends LocationService {
  @override
  Future<AppLocation> getCurrentLocation() async {
    throw StateError('Location unavailable');
  }
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget buildHarness(
    _FakeLocationPermissionService permissionService, {
    LocationService? locationService,
  }) {
    return ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWith((ref) async => await SharedPreferences.getInstance()),
        locationPermissionServiceProvider.overrideWithValue(permissionService),
        locationServiceProvider.overrideWithValue(locationService ?? _FakeLocationService()),
        mapGeoClientProvider.overrideWith((ref) async => _FakeGeoClient(pins: const [])),
      ],
      child: const MaterialApp(home: Scaffold(body: PerbugGamePage())),
    );
  }

  testWidgets('shows explicit location entry choice before map generation', (tester) async {
    final permissionService = _FakeLocationPermissionService(outcome: LocationPermissionOutcome.denied);
    await tester.pumpWidget(buildHarness(permissionService));
    await tester.pumpAndSettle();

    expect(find.text('Choose your world anchor'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Use My Location'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Continue Demo Mode'), findsOneWidget);
  });

  testWidgets('denied location keeps the player on a clear demo fallback path', (tester) async {
    final permissionService = _FakeLocationPermissionService(outcome: LocationPermissionOutcome.denied);
    await tester.pumpWidget(buildHarness(permissionService));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Use My Location'));
    await tester.pumpAndSettle();

    expect(permissionService.ensureCalls, 1);
    expect(find.text('Location denied'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Continue Demo Mode'), findsOneWidget);
  });

  testWidgets('continue demo mode loads fallback map flow without blocking', (tester) async {
    final permissionService = _FakeLocationPermissionService(outcome: LocationPermissionOutcome.denied);
    await tester.pumpWidget(buildHarness(permissionService));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue Demo Mode'));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(FilledButton, 'Switch to Real World'), findsOneWidget);
    expect(find.text('World board: fixed tactical zoom 13'), findsOneWidget);
  });

  testWidgets('demo HUD location button retries permission and switches to live mode when granted', (tester) async {
    final permissionService = _FakeLocationPermissionService(outcome: LocationPermissionOutcome.granted);
    await tester.pumpWidget(buildHarness(permissionService, locationService: _DeniedLocationService()));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue Demo Mode'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(FilledButton, 'Switch to Real World'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Switch to Real World'));
    await tester.pumpAndSettle();

    expect(permissionService.ensureCalls, 1);
    expect(find.textContaining('Live location anchor'), findsOneWidget);
  });

  testWidgets('denied retry keeps demo mode active and leaves HUD location button visible', (tester) async {
    final permissionService = _FakeLocationPermissionService(outcome: LocationPermissionOutcome.denied);
    await tester.pumpWidget(buildHarness(permissionService, locationService: _DeniedLocationService()));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue Demo Mode'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Switch to Real World'));
    await tester.pumpAndSettle();

    expect(permissionService.ensureCalls, 1);
    expect(find.widgetWithText(FilledButton, 'Switch to Real World'), findsOneWidget);
    expect(find.textContaining('Demo mode anchor'), findsOneWidget);
  });
}
