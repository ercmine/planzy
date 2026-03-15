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
          padding: const EdgeInsets.all(12),
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
              IconButton(onPressed: () => controller.searchThisArea(mode: 'nearby'), icon: const Icon(Icons.my_location)),
            ],
          ),
        ),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: _categories
                .map((category) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(category),
                        selected: state.categories.contains(category),
                        onSelected: (_) => controller.toggleCategory(category),
                      ),
                    ))
                .toList(growable: false),
          ),
        ),
        Expanded(
          child: Stack(
            children: [
              GestureDetector(
                onPanUpdate: (details) => controller.pan(-details.delta.dy * 0.00012, details.delta.dx * 0.00012),
                onDoubleTap: () => controller.zoom(1),
                child: Container(
                  margin: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    gradient: const LinearGradient(colors: [Color(0xFF1D2A44), Color(0xFF2A4E8A)]),
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return Stack(
                        children: [
                          for (final place in state.places)
                            Positioned(
                              left: ((place.longitude - state.west) / (state.east - state.west) * constraints.maxWidth).clamp(8, constraints.maxWidth - 40),
                              top: ((state.north - place.latitude) / (state.north - state.south) * constraints.maxHeight).clamp(8, constraints.maxHeight - 40),
                              child: GestureDetector(
                                onTap: () => controller.selectPlace(place.placeId),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: state.selectedPlaceId == place.placeId ? Colors.orange : Colors.white,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(place.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                                ),
                              ),
                            ),
                          if (state.loading) const Center(child: CircularProgressIndicator()),
                        ],
                      );
                    },
                  ),
                ),
              ),
              Positioned(
                top: 22,
                right: 20,
                child: Column(
                  children: [
                    FloatingActionButton.small(heroTag: 'zoom-in', onPressed: () => controller.zoom(1), child: const Icon(Icons.add)),
                    const SizedBox(height: 8),
                    FloatingActionButton.small(heroTag: 'zoom-out', onPressed: () => controller.zoom(-1), child: const Icon(Icons.remove)),
                  ],
                ),
              ),
              if (state.pendingViewportSearch)
                Positioned(
                  top: 22,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: FilledButton.icon(
                      onPressed: () => controller.searchThisArea(),
                      icon: const Icon(Icons.travel_explore),
                      label: const Text('Search this area'),
                    ),
                  ),
                ),
              if (selected != null)
                Positioned(
                  bottom: 18,
                  left: 18,
                  right: 18,
                  child: Card(
                    child: Builder(
                      builder: (context) {
                        final place = selected;
                        if (place == null) return const SizedBox.shrink();
                        return ListTile(
                          leading: const Icon(Icons.place),
                          title: Text(place.name),
                          subtitle: Text('${place.category} • ${place.city ?? place.region ?? 'Local'}'),
                          trailing: Text('${((place.distanceMeters ?? 0) / 1000).toStringAsFixed(1)} km'),
                          onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => _MapPlaceDetailPage(place: place))),
                        );
                      },
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MapPlaceDetailPage extends StatelessWidget {
  const _MapPlaceDetailPage({required this.place});

  final MapDiscoveryPlace place;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(place.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(place.name, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text('${place.category} • ${place.city ?? place.region ?? 'Local area'}'),
          const SizedBox(height: 12),
          Text(place.descriptionSnippet ?? 'Creator-reviewed place detail is available from the canonical place profile.'),
          const SizedBox(height: 18),
          FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.bookmark_border), label: const Text('Save place')),
        ],
      ),
    );
  }
}
