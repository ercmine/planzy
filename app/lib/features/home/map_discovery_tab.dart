import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/app_providers.dart';
import '../video_platform/video_providers.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';

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

  void pan(double dLat, double dLng) {
    state = state.copyWith(
      viewport: state.viewport.copyWith(
        centerLat: state.viewport.centerLat + dLat,
        centerLng: state.viewport.centerLng + dLng,
      ),
      pendingViewportSearch: true,
      clearGeoStatus: true,
    );
  }

  void zoom(double delta) {
    state = state.copyWith(
      viewport: state.viewport.copyWith(
        zoom: (state.viewport.zoom + delta).clamp(8, 18),
      ),
      pendingViewportSearch: true,
      clearGeoStatus: true,
    );
  }

  void toggleCategory(String category) {
    final next = {...state.categories};
    if (!next.add(category)) next.remove(category);
    state = state.copyWith(categories: next, pendingViewportSearch: true);
  }

  void selectPlace(String placeId) {
    state = state.copyWith(selectedPlaceId: placeId);
  }

  Future<void> refreshAreaLabel() async {
    try {
      final geoClient = await _ref.read(mapGeoClientProvider.future);
      final area = await geoClient.reverseGeocode(lat: state.viewport.centerLat, lng: state.viewport.centerLng);
      if (area == null) return;
      final label = [area.city, area.region].whereType<String>().where((value) => value.isNotEmpty).join(', ');
      if (label.isNotEmpty) {
        state = state.copyWith(areaLabel: label, clearGeoStatus: true);
      }
    } catch (_) {
      state = state.copyWith(geoStatus: 'Area labeling is temporarily unavailable.', clearGeoStatus: false);
    }
  }

  Future<void> searchThisArea({String mode = 'search_this_area'}) async {
    final viewport = state.viewport;
    final queryKey = [
      viewport.north.toStringAsFixed(3),
      viewport.south.toStringAsFixed(3),
      viewport.east.toStringAsFixed(3),
      viewport.west.toStringAsFixed(3),
      viewport.zoom.toStringAsFixed(2),
      mode,
      state.categories.join(','),
    ].join('|');
    if (!state.pendingViewportSearch && _lastSearchKey == queryKey && state.pins.isNotEmpty) {
      return;
    }

    final requestId = ++_searchRequestId;
    state = state.copyWith(loading: true, discoveryError: null);
    try {
      final discoveryClient = await _ref.read(placeDiscoveryClientProvider.future);
      final pins = await discoveryClient.searchByViewport(SearchAreaContext(
        viewport: viewport,
        categories: state.categories.toList(growable: false),
        mode: mode,
      ));
      if (requestId != _searchRequestId) return;
      _lastSearchKey = queryKey;
      state = state.copyWith(loading: false, pins: pins, pendingViewportSearch: false, discoveryError: null);
    } catch (_) {
      if (requestId != _searchRequestId) return;
      state = state.copyWith(
        loading: false,
        pendingViewportSearch: false,
        discoveryError: 'Could not load place pins. Retry to refresh this area.',
      );
    }
  }
}

final mapDiscoveryControllerProvider = StateNotifierProvider<MapDiscoveryController, MapViewportState>((ref) {
  return MapDiscoveryController(ref);
});

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
    Future.microtask(() => ref.read(mapDiscoveryControllerProvider.notifier).initialize());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mapDiscoveryControllerProvider);
    final controller = ref.read(mapDiscoveryControllerProvider.notifier);
    MapPin? selected;
    for (final place in state.pins) {
      if (place.canonicalPlaceId == state.selectedPlaceId) {
        selected = place;
        break;
      }
    }

    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
        child: Row(children: [
          Expanded(
            child: TextField(
              readOnly: true,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search neighborhood or place'),
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Geo search resolves area context; map pins always come from Perbug canonical discovery.')),
              ),
            ),
          ),
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
                    child: FilterChip.elevated(
                      label: Text(category),
                      selected: state.categories.contains(category),
                      onSelected: (_) => controller.toggleCategory(category),
                    ),
                  ))
              .toList(growable: false),
        ),
      ),
      const SizedBox(height: 12),
      Expanded(
        child: Stack(children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF1F2A4F), Color(0xFF0A1026)]),
                border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.35)),
              ),
              child: Center(
                child: Text(
                  'Map Preview\n${state.viewport.centerLat.toStringAsFixed(3)}, ${state.viewport.centerLng.toStringAsFixed(3)}\nZoom ${state.viewport.zoom.toStringAsFixed(1)}',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
          if (state.loading) const Positioned(top: 12, left: 12, right: 12, child: LinearProgressIndicator()),
        ]),
      ),
      if (state.discoveryError != null)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(state.discoveryError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
        ),
      if (state.geoStatus != null)
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(state.geoStatus!),
        ),
      const SizedBox(height: 12),
      Align(
        alignment: Alignment.centerLeft,
        child: FilledButton.tonalIcon(
          onPressed: state.pendingViewportSearch || state.loading ? null : () => controller.searchThisArea(),
          icon: const Icon(Icons.travel_explore),
          label: const Text('Search this area'),
        ),
      ),
      const SizedBox(height: 8),
      SizedBox(
        height: 150,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: state.pins.length,
          separatorBuilder: (_, __) => const SizedBox(width: 10),
          itemBuilder: (context, index) {
            final place = state.pins[index];
            return SizedBox(
              width: 230,
              child: Card(
                color: selected?.canonicalPlaceId == place.canonicalPlaceId ? Theme.of(context).colorScheme.primaryContainer.withOpacity(0.35) : null,
                child: ListTile(
                  onTap: () => controller.selectPlace(place.canonicalPlaceId),
                  title: Text(place.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('${place.category} • ${place.city ?? place.region ?? 'Nearby'}\n⭐ ${place.rating.toStringAsFixed(1)}'),
                ),
              ),
            );
          },
        ),
      ),
    ]);
  }
}
