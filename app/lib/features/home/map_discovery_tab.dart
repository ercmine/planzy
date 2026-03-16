import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../video_platform/video_models.dart';
import '../video_platform/video_providers.dart';

class MapViewportState {
  const MapViewportState({
    required this.centerLat,
    required this.centerLng,
    required this.zoom,
    this.selectedPlaceId,
    this.places = const [],
    this.categories = const <String>{},
    this.pendingViewportSearch = false,
    this.loading = false,
  });

  final double centerLat;
  final double centerLng;
  final double zoom;
  final String? selectedPlaceId;
  final List<MapDiscoveryPlace> places;
  final Set<String> categories;
  final bool pendingViewportSearch;
  final bool loading;

  double get latSpan => 0.35 / (zoom / 10);
  double get lngSpan => 0.45 / (zoom / 10);
  double get north => centerLat + latSpan / 2;
  double get south => centerLat - latSpan / 2;
  double get east => centerLng + lngSpan / 2;
  double get west => centerLng - lngSpan / 2;

  MapViewportState copyWith({
    double? centerLat,
    double? centerLng,
    double? zoom,
    String? selectedPlaceId,
    bool clearSelectedPlace = false,
    List<MapDiscoveryPlace>? places,
    Set<String>? categories,
    bool? pendingViewportSearch,
    bool? loading,
  }) {
    return MapViewportState(
      centerLat: centerLat ?? this.centerLat,
      centerLng: centerLng ?? this.centerLng,
      zoom: zoom ?? this.zoom,
      selectedPlaceId: clearSelectedPlace ? null : (selectedPlaceId ?? this.selectedPlaceId),
      places: places ?? this.places,
      categories: categories ?? this.categories,
      pendingViewportSearch: pendingViewportSearch ?? this.pendingViewportSearch,
      loading: loading ?? this.loading,
    );
  }
}

class MapDiscoveryController extends StateNotifier<MapViewportState> {
  MapDiscoveryController(this._ref)
      : super(const MapViewportState(centerLat: 30.2672, centerLng: -97.7431, zoom: 12));

  final Ref _ref;
  int _searchRequestId = 0;
  String? _lastSearchKey;

  Future<void> initialize() async {
    if (state.places.isNotEmpty) return;
    await searchThisArea(mode: 'nearby');
  }

  void pan(double dLat, double dLng) {
    state = state.copyWith(
      centerLat: state.centerLat + dLat,
      centerLng: state.centerLng + dLng,
      pendingViewportSearch: true,
    );
  }

  void zoom(double delta) {
    state = state.copyWith(
      zoom: (state.zoom + delta).clamp(8, 18),
      pendingViewportSearch: true,
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

  Future<void> searchThisArea({String mode = 'search_this_area'}) async {
    final queryKey = [
      state.north.toStringAsFixed(3),
      state.south.toStringAsFixed(3),
      state.east.toStringAsFixed(3),
      state.west.toStringAsFixed(3),
      state.zoom.toStringAsFixed(2),
      mode,
      state.categories.join(','),
    ].join('|');
    if (!state.pendingViewportSearch && _lastSearchKey == queryKey && state.places.isNotEmpty) {
      return;
    }

    final requestId = ++_searchRequestId;
    state = state.copyWith(loading: true);
    final repo = await _ref.read(videoRepositoryProvider.future);
    final places = await repo.fetchMapDiscovery(
      north: state.north,
      south: state.south,
      east: state.east,
      west: state.west,
      centerLat: state.centerLat,
      centerLng: state.centerLng,
      zoom: state.zoom,
      categories: state.categories.toList(growable: false),
      mode: mode,
    );
    if (requestId != _searchRequestId) {
      return;
    }
    _lastSearchKey = queryKey;
    state = state.copyWith(loading: false, places: places, pendingViewportSearch: false);
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
    MapDiscoveryPlace? selected;
    for (final place in state.places) {
      if (place.placeId == state.selectedPlaceId) {
        selected = place;
        break;
      }
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  readOnly: true,
                  decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search neighborhood or place'),
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Map text search plugs into /v1/places/autocomplete.'))),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: () => controller.searchThisArea(mode: 'nearby'),
                icon: const Icon(Icons.my_location),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: _categories
                .map(
                  (category) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip.elevated(
                      label: Text(category),
                      selected: state.categories.contains(category),
                      onSelected: (_) => controller.toggleCategory(category),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFF1F2A4F), Color(0xFF0A1026)],
                    ),
                    border: Border.all(color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.35)),
                  ),
                  child: Center(
                    child: Text(
                      'Map Preview\n${state.centerLat.toStringAsFixed(3)}, ${state.centerLng.toStringAsFixed(3)}\nZoom ${state.zoom.toStringAsFixed(1)}',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
              if (state.loading) const Positioned(top: 12, left: 12, right: 12, child: LinearProgressIndicator()),
              Positioned(
                right: 16,
                bottom: 16,
                child: Column(
                  children: [
                    FloatingActionButton.small(
                      heroTag: 'zoom-in',
                      onPressed: () => controller.zoom(1),
                      child: const Icon(Icons.add),
                    ),
                    const SizedBox(height: 8),
                    FloatingActionButton.small(
                      heroTag: 'zoom-out',
                      onPressed: () => controller.zoom(-1),
                      child: const Icon(Icons.remove),
                    ),
                  ],
                ),
              ),
            ],
          ),
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
            itemCount: state.places.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final place = state.places[index];
              return SizedBox(
                width: 230,
                child: Card(
                  color: selected?.placeId == place.placeId ? Theme.of(context).colorScheme.primaryContainer.withOpacity(0.35) : null,
                  child: ListTile(
                    onTap: () => controller.selectPlace(place.placeId),
                    title: Text(place.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text('${place.category} • ${place.city ?? place.region ?? 'Nearby'}\n⭐ ${place.rating.toStringAsFixed(1)}'),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
