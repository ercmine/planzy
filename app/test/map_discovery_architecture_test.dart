import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/home/map_discovery_clients.dart';
import 'package:perbug/features/home/map_discovery_models.dart';
import 'package:perbug/features/home/map_discovery_tab.dart';

class _FakeGeoClient implements MapGeoClient {
  _FakeGeoClient({this.failReverse = false});

  bool failReverse;
  int reverseCalls = 0;

  @override
  Future<List<GeocodeResult>> geocode(String query) async => const [];

  @override
  Future<ReverseGeocodeResult?> reverseGeocode({required double lat, required double lng}) async {
    reverseCalls += 1;
    if (failReverse) throw Exception('geo down');
    return const ReverseGeocodeResult(displayName: 'Austin, Texas', city: 'Austin', region: 'Texas');
  }
}

class _FakeDiscoveryClient implements PlaceDiscoveryClient {
  _FakeDiscoveryClient({this.fail = false});

  bool fail;
  int calls = 0;

  @override
  Future<List<MapPin>> searchByViewport(SearchAreaContext context) async {
    calls += 1;
    if (fail) throw Exception('discovery down');
    return const [
      MapPin(
        canonicalPlaceId: 'cp_1',
        name: 'Cafe Orbit',
        category: 'coffee',
        latitude: 30.27,
        longitude: -97.74,
        rating: 4.7,
      ),
    ];
  }
}

void main() {
  test('map discovery loads pins even when geo area labeling fails', () async {
    final geo = _FakeGeoClient(failReverse: true);
    final discovery = _FakeDiscoveryClient();
    final container = ProviderContainer(overrides: [
      mapGeoClientProvider.overrideWith((ref) async => geo),
      placeDiscoveryClientProvider.overrideWith((ref) async => discovery),
    ]);
    addTearDown(container.dispose);

    final controller = container.read(mapDiscoveryControllerProvider.notifier);
    await controller.initialize();
    final state = container.read(mapDiscoveryControllerProvider);

    expect(state.pins, isNotEmpty);
    expect(state.geoStatus, isNotNull);
    expect(state.discoveryError, isNull);
  });

  test('search this area uses backend discovery client', () async {
    final geo = _FakeGeoClient();
    final discovery = _FakeDiscoveryClient();
    final container = ProviderContainer(overrides: [
      mapGeoClientProvider.overrideWith((ref) async => geo),
      placeDiscoveryClientProvider.overrideWith((ref) async => discovery),
    ]);
    addTearDown(container.dispose);

    final controller = container.read(mapDiscoveryControllerProvider.notifier);
    await controller.searchThisArea();

    expect(discovery.calls, 1);
    expect(geo.reverseCalls, 0);
  });

  test('map pins expose canonical place ids', () async {
    final container = ProviderContainer(overrides: [
      mapGeoClientProvider.overrideWith((ref) async => _FakeGeoClient()),
      placeDiscoveryClientProvider.overrideWith((ref) async => _FakeDiscoveryClient()),
    ]);
    addTearDown(container.dispose);

    final controller = container.read(mapDiscoveryControllerProvider.notifier);
    await controller.searchThisArea();
    final pin = container.read(mapDiscoveryControllerProvider).pins.first;

    expect(pin.canonicalPlaceId, startsWith('cp_'));
  });

  test('discovery failure does not break map viewport state', () async {
    final discovery = _FakeDiscoveryClient(fail: true);
    final container = ProviderContainer(overrides: [
      mapGeoClientProvider.overrideWith((ref) async => _FakeGeoClient()),
      placeDiscoveryClientProvider.overrideWith((ref) async => discovery),
    ]);
    addTearDown(container.dispose);

    final controller = container.read(mapDiscoveryControllerProvider.notifier);
    final initial = container.read(mapDiscoveryControllerProvider).viewport;
    await controller.searchThisArea();
    final state = container.read(mapDiscoveryControllerProvider);

    expect(state.viewport.centerLat, initial.centerLat);
    expect(state.discoveryError, isNotNull);
  });
}
