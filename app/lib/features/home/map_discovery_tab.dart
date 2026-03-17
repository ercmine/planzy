import "dart:math";

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../../providers/app_providers.dart';
import '../video_platform/video_providers.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'place_preview_card.dart';

class MapViewportState {
  const MapViewportState({
    required this.viewport,
    this.selectedPlaceId,
    this.pins = const [],
    this.categories = const <String>{},
    this.pendingViewportSearch = false,
    this.loading = false,
    this.discoveryError,
    this.areaLabel,
    this.geoStatus,
  });

  final MapViewport viewport;
  final String? selectedPlaceId;
  final List<MapPin> pins;
  final Set<String> categories;
  final bool pendingViewportSearch;
  final bool loading;
  final String? discoveryError;
  final String? areaLabel;
  final String? geoStatus;

  MapViewportState copyWith({
    MapViewport? viewport,
    String? selectedPlaceId,
    bool clearSelectedPlace = false,
    List<MapPin>? pins,
    Set<String>? categories,
    bool? pendingViewportSearch,
    bool? loading,
    String? discoveryError,
    String? areaLabel,
    String? geoStatus,
    bool clearGeoStatus = false,
  }) {
    return MapViewportState(
      viewport: viewport ?? this.viewport,
      selectedPlaceId: clearSelectedPlace ? null : (selectedPlaceId ?? this.selectedPlaceId),
      pins: pins ?? this.pins,
      categories: categories ?? this.categories,
      pendingViewportSearch: pendingViewportSearch ?? this.pendingViewportSearch,
      loading: loading ?? this.loading,
      discoveryError: discoveryError,
      areaLabel: areaLabel ?? this.areaLabel,
      geoStatus: clearGeoStatus ? null : (geoStatus ?? this.geoStatus),
    );
  }
}

final mapGeoClientProvider = FutureProvider<MapGeoClient>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return RemoteMapGeoClient(apiClient);
});

final placeDiscoveryClientProvider = FutureProvider<PlaceDiscoveryClient>((ref) async {
  final repository = await ref.watch(videoRepositoryProvider.future);
  return BackendPlaceDiscoveryClient(repository);
});

class MapDiscoveryController extends StateNotifier<MapViewportState> {
  MapDiscoveryController(this._ref)
      : super(const MapViewportState(viewport: MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 12)));

  final Ref _ref;
  int _searchRequestId = 0;
  String? _lastSearchKey;

  Future<void> initialize() async {
    if (state.pins.isNotEmpty) return;
    await searchThisArea(mode: 'nearby');
    await refreshAreaLabel();
  }

  void toggleCategory(String category) {
    final next = {...state.categories};
    if (!next.add(category)) next.remove(category);
    state = state.copyWith(categories: next, pendingViewportSearch: true);
  }

  void selectPlace(String placeId) => state = state.copyWith(selectedPlaceId: placeId);

  Future<void> refreshAreaLabel() async {
    try {
      final geoClient = await _ref.read(mapGeoClientProvider.future);
      final area = await geoClient.reverseGeocode(lat: state.viewport.centerLat, lng: state.viewport.centerLng);
      if (area == null) return;
      final label = [area.city, area.region].whereType<String>().where((value) => value.isNotEmpty).join(', ');
      if (label.isNotEmpty) state = state.copyWith(areaLabel: label, clearGeoStatus: true);
    } catch (_) {
      state = state.copyWith(geoStatus: 'Area labeling is temporarily unavailable.', clearGeoStatus: false);
    }
  }

  Future<void> searchThisArea({String mode = 'search_this_area'}) async {
    final viewport = state.viewport;
    final queryKey = [viewport.north, viewport.south, viewport.east, viewport.west, viewport.zoom, mode, state.categories.join(',')].join('|');
    if (!state.pendingViewportSearch && _lastSearchKey == queryKey && state.pins.isNotEmpty) return;

    final requestId = ++_searchRequestId;
    state = state.copyWith(loading: true, discoveryError: null);
    try {
      final discoveryClient = await _ref.read(placeDiscoveryClientProvider.future);
      final pins = await discoveryClient.searchByViewport(SearchAreaContext(viewport: viewport, categories: state.categories.toList(growable: false), mode: mode));
      if (requestId != _searchRequestId) return;
      _lastSearchKey = queryKey;
      state = state.copyWith(loading: false, pins: pins, pendingViewportSearch: false, discoveryError: null);
    } catch (_) {
      if (requestId != _searchRequestId) return;
      state = state.copyWith(loading: false, pendingViewportSearch: false, discoveryError: 'Could not load place pins. Retry to refresh this area.');
    }
  }
}

final mapDiscoveryControllerProvider = StateNotifierProvider<MapDiscoveryController, MapViewportState>((ref) => MapDiscoveryController(ref));

class MapDiscoveryTab extends ConsumerStatefulWidget {
  const MapDiscoveryTab({super.key});

  @override
  ConsumerState<MapDiscoveryTab> createState() => _MapDiscoveryTabState();
}

class _MapDiscoveryTabState extends ConsumerState<MapDiscoveryTab> {
  static const _categories = ['food', 'coffee', 'nightlife', 'parks', 'museums', 'shopping'];

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(mapDiscoveryControllerProvider.notifier).initialize();
      if (mounted) await _checkVisitReviewPrompt();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mapDiscoveryControllerProvider);
    final controller = ref.read(mapDiscoveryControllerProvider.notifier);
    final location = ref.watch(locationControllerProvider).effectiveLocation;
    MapPin? selected;
    for (final p in state.pins) {
      if (p.canonicalPlaceId == state.selectedPlaceId) {
        selected = p;
        break;
      }
    }
    selected ??= state.pins.isEmpty ? null : state.pins.first;

    PlaceProximityState proximityFor(MapPin place) {
      final distance = _distanceMeters(location?.lat, location?.lng, place.latitude, place.longitude);
      if (distance == null) return PlaceProximityState.unknown;
      if (distance <= 90) return PlaceProximityState.here;
      if (distance <= 240) return PlaceProximityState.nearby;
      return PlaceProximityState.unknown;
    }

    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Row(children: [
          Expanded(child: TextField(readOnly: true, decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search neighborhood or place'))),
          const SizedBox(width: 8),
          IconButton.filledTonal(onPressed: () => controller.searchThisArea(mode: 'nearby'), icon: const Icon(Icons.my_location)),
        ]),
      ),
      if (state.areaLabel != null)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Align(alignment: Alignment.centerLeft, child: Text('Area: ${state.areaLabel}')),
        ),
      SizedBox(
        height: 44,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          children: _categories
              .map((category) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip.elevated(label: Text(category), selected: state.categories.contains(category), onSelected: (_) => controller.toggleCategory(category)),
                  ))
              .toList(growable: false),
        ),
      ),
      const SizedBox(height: 10),
      Expanded(
        child: Stack(children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF1F2A4F), Color(0xFF0A1026)]),
                border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.35)),
              ),
              child: const Center(child: Text('Map canvas placeholder')),
            ),
          ),
          if (state.loading) const Positioned(top: 12, left: 12, right: 12, child: LinearProgressIndicator()),
        ]),
      ),
      const SizedBox(height: 10),
      if (selected != null)
        PlacePreviewCard(
          place: selected,
          proximityState: proximityFor(selected),
          distanceMeters: _distanceMeters(location?.lat, location?.lng, selected.latitude, selected.longitude),
          onOpenDetails: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Open detail and review flow for ${selected?.name ?? 'this place'}.'))),
          onOpenMaps: () {},
          onSave: () {},
          onShare: () {},
        ),
      const SizedBox(height: 8),
      Align(
        alignment: Alignment.centerLeft,
        child: FilledButton.tonalIcon(onPressed: state.pendingViewportSearch || state.loading ? null : () => controller.searchThisArea(), icon: const Icon(Icons.travel_explore), label: const Text('Search this area')),
      ),
      const SizedBox(height: 8),
      SizedBox(
        height: 108,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: state.pins.length,
          separatorBuilder: (_, __) => const SizedBox(width: 10),
          itemBuilder: (context, index) {
            final place = state.pins[index];
            final distance = _distanceMeters(location?.lat, location?.lng, place.latitude, place.longitude);
            return SizedBox(
              width: 240,
              child: Card(
                color: selected?.canonicalPlaceId == place.canonicalPlaceId ? Theme.of(context).colorScheme.primaryContainer.withOpacity(0.35) : null,
                child: ListTile(
                  onTap: () => controller.selectPlace(place.canonicalPlaceId),
                  title: Text(place.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('${place.categoryLabel} • ${distance != null && distance < 95 ? 'You’re here' : place.neighborhoodLabel}'),
                ),
              ),
            );
          },
        ),
      ),
    ]);
  }


  Future<void> _checkVisitReviewPrompt() async {
    final location = ref.read(locationControllerProvider).effectiveLocation;
    if (location == null) return;
    final service = ref.read(reviewPromptServiceProvider);
    final decision = await service.evaluate(lat: location.lat, lng: location.lng, reviewedPlaceIds: const []);
    if (!decision.shouldPrompt || !mounted || decision.match?.canonicalPlaceId == null) return;

    final match = decision.match!;
    await service.markPromptSent(match.canonicalPlaceId!);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Looks like you're at ${match.placeName ?? 'this place'} — want to leave a quick review?"),
        action: SnackBarAction(label: 'Review', onPressed: () {}),
      ),
    );
  }

  double? _distanceMeters(double? fromLat, double? fromLng, double toLat, double toLng) {
    if (fromLat == null || fromLng == null) return null;
    const earthRadiusMeters = 6371000.0;
    final dLat = _toRadians(toLat - fromLat);
    final dLng = _toRadians(toLng - fromLng);
    final a =
        (sin(dLat / 2) * sin(dLat / 2)) + cos(_toRadians(fromLat)) * cos(_toRadians(toLat)) * (sin(dLng / 2) * sin(dLng / 2));
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  double _toRadians(double value) => value * 3.1415926535897932 / 180;
}
