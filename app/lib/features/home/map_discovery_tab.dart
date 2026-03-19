import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../core/connectivity/connectivity_state.dart';
import '../../core/links/link_launcher.dart';
import '../../core/links/link_types.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../core/location/location_permission_service.dart';
import '../../providers/app_providers.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'place_preview_card.dart';
import 'place_video_detail_page.dart';
import '../video_platform/video_providers.dart';

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

  Future<void> initialize({AppLocation? initialLocation}) async {
    if (initialLocation != null) {
      setViewport(
        MapViewport(
          centerLat: initialLocation.lat,
          centerLng: initialLocation.lng,
          zoom: max(state.viewport.zoom, 14),
        ),
        markPendingSearch: false,
      );
    }

    await searchThisArea(mode: 'nearby');
    await refreshAreaLabel();
  }

  void toggleCategory(String category) {
    final next = {...state.categories};
    if (!next.add(category)) next.remove(category);
    state = state.copyWith(categories: next, pendingViewportSearch: true);
  }

  void selectPlace(String placeId) => state = state.copyWith(selectedPlaceId: placeId);

  void clearSelectedPlace() => state = state.copyWith(clearSelectedPlace: true);

  void setViewport(MapViewport viewport, {bool markPendingSearch = true}) {
    state = state.copyWith(viewport: viewport, pendingViewportSearch: markPendingSearch);
  }

  Future<void> centerOnUserLocation(AppLocation location) async {
    setViewport(
      MapViewport(centerLat: location.lat, centerLng: location.lng, zoom: max(state.viewport.zoom, 15)),
      markPendingSearch: false,
    );
    await refreshAreaLabel();
    await searchThisArea(mode: 'nearby');
  }

  Future<GeocodeResult?> searchLocation(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return null;

    try {
      final geoClient = await _ref.read(mapGeoClientProvider.future);
      final results = await geoClient.geocode(trimmed);
      final match = results.isEmpty ? null : results.first;
      if (match == null) {
        state = state.copyWith(geoStatus: 'No matching places were found for “$trimmed”.');
        return null;
      }

      setViewport(
        MapViewport(centerLat: match.lat, centerLng: match.lng, zoom: max(state.viewport.zoom, 14)),
        markPendingSearch: false,
      );
      state = state.copyWith(geoStatus: null);
      await refreshAreaLabel();
      await searchThisArea(mode: 'search_this_area');
      return match;
    } catch (_) {
      state = state.copyWith(geoStatus: 'Search is temporarily unavailable.');
      return null;
    }
  }

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
      state = state.copyWith(
        loading: false,
        pins: pins,
        pendingViewportSearch: false,
        discoveryError: null,
        selectedPlaceId: pins.any((pin) => pin.canonicalPlaceId == state.selectedPlaceId)
            ? state.selectedPlaceId
            : (pins.isEmpty ? null : pins.first.canonicalPlaceId),
      );
    } catch (_) {
      if (requestId != _searchRequestId) return;
      state = state.copyWith(loading: false, pendingViewportSearch: false, discoveryError: 'Could not load nearby places. Retry to refresh this area.');
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
  static const _defaultTileTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const _defaultTileAttribution = '© OpenStreetMap contributors';

  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();
  bool _mapReady = false;
  bool _didInitialize = false;
  bool _hasFollowedUserLocation = false;
  LatLng? _lastMapCenter;
  double? _lastMapZoom;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final initialLocation = ref.read(locationControllerProvider).effectiveLocation;
      await ref.read(mapDiscoveryControllerProvider.notifier).initialize(initialLocation: initialLocation);
      _didInitialize = true;
      if (initialLocation != null) {
        _hasFollowedUserLocation = true;
      }
      if (mounted) await _checkVisitReviewPrompt();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mapDiscoveryControllerProvider);
    final controller = ref.read(mapDiscoveryControllerProvider.notifier);
    final theme = Theme.of(context);
    final locationState = ref.watch(locationControllerProvider);
    final location = locationState.effectiveLocation;
    final connectivityState = ref.watch(connectivityControllerProvider);
    final permissionService = ref.read(locationPermissionServiceProvider);
    final linkLauncher = ref.read(linkLauncherProvider);

    if (!_hasFollowedUserLocation && _didInitialize && location != null) {
      _hasFollowedUserLocation = true;
      Future.microtask(() async {
        await controller.centerOnUserLocation(location);
        if (mounted) {
          _moveMap(state: ref.read(mapDiscoveryControllerProvider));
          await _checkVisitReviewPrompt();
        }
      });
    }

    _maybeSyncMapViewport(state.viewport);

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

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: BrandHeroCard(
            child: Column(
              children: [
                const AppSectionHeader(
                  title: 'Map discovery',
                  subtitle: 'Pulse through nearby places, creator clips, and real-world momentum.',
                ),
                const SizedBox(height: AppSpacing.s),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        textInputAction: TextInputAction.search,
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.search),
                          hintText: 'Search neighborhood or place',
                          suffixIcon: IconButton(
                            tooltip: 'Search map',
                            onPressed: state.loading ? null : () => _searchForLocation(controller),
                            icon: const Icon(Icons.arrow_forward_rounded),
                          ),
                        ),
                        onSubmitted: state.loading ? null : (_) => _searchForLocation(controller),
                      ),
                    ),
                    const SizedBox(width: 8),
                    AppIconButton(
                      tooltip: 'Center on my location',
                      onPressed: () => _handleCenterOnUserLocation(locationState, permissionService),
                      icon: Icons.my_location,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (state.areaLabel != null || state.geoStatus != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                state.areaLabel != null ? 'Area: ${state.areaLabel}' : state.geoStatus!,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
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
        const SizedBox(height: 10),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLowest,
                border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.35)),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(
                        initialCenter: state.viewport.toLatLng(),
                        initialZoom: state.viewport.zoom,
                        interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
                        onMapReady: () {
                          if (!mounted) return;
                          setState(() => _mapReady = true);
                          _captureMapViewport();
                        },
                        onTap: (_, __) => controller.clearSelectedPlace(),
                        onPositionChanged: (position, hasGesture) {
                          final center = position.center;
                          if (center == null) return;
                          final nextZoom = position.zoom ?? state.viewport.zoom;
                          _lastMapCenter = center;
                          _lastMapZoom = nextZoom;
                          controller.setViewport(
                            MapViewport(centerLat: center.latitude, centerLng: center.longitude, zoom: nextZoom),
                            markPendingSearch: hasGesture,
                          );
                        },
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: _defaultTileTemplate,
                          userAgentPackageName: 'com.perbug.app',
                          maxZoom: 19,
                        ),
                        MarkerLayer(markers: _buildMarkers(context, state, selected, location)),
                        RichAttributionWidget(
                          attributions: const [
                            TextSourceAttribution(_defaultTileAttribution),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (!_mapReady)
                    const Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: Color(0xE6111729)),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                    ),
                  if (state.loading)
                    const Positioned(top: 12, left: 12, right: 12, child: LinearProgressIndicator()),
                  if (!connectivityState.isOnline)
                    Positioned.fill(child: _MapStatusOverlay(message: 'You appear to be offline. Reconnect to load map tiles and nearby places.', icon: Icons.wifi_off_rounded)),
                  if (_shouldShowPermissionOverlay(locationState))
                    Positioned.fill(
                      child: _MapActionOverlay(
                        title: locationState.status == LocationStatus.serviceDisabled ? 'Turn on location services' : 'Allow location access',
                        body: locationState.errorMessage ?? 'We use your location to center the map and surface nearby places.',
                        icon: locationState.status == LocationStatus.serviceDisabled ? Icons.location_disabled : Icons.location_searching,
                        actions: [
                          FilledButton(
                            onPressed: () => _handleCenterOnUserLocation(locationState, permissionService),
                            child: Text(locationState.status == LocationStatus.serviceDisabled ? 'Open settings' : 'Enable location'),
                          ),
                        ],
                      ),
                    ),
                  if (state.discoveryError != null)
                    Positioned.fill(
                      child: _MapActionOverlay(
                        title: 'Nearby places unavailable',
                        body: state.discoveryError!,
                        icon: Icons.error_outline,
                        actions: [
                          FilledButton.icon(
                            onPressed: () => controller.searchThisArea(mode: 'search_this_area'),
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  if (!_isMapBlocked(connectivityState, locationState, state) && state.pins.isEmpty && !state.loading)
                    const Positioned.fill(
                      child: _MapStatusOverlay(
                        message: 'No nearby places match this area yet. Move the map or change filters to discover more spots.',
                        icon: Icons.travel_explore_outlined,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        if (selected != null)
          PlacePreviewCard(
            place: selected,
            proximityState: proximityFor(selected),
            distanceMeters: _distanceMeters(location?.lat, location?.lng, selected.latitude, selected.longitude),
            onOpenDetails: () => _openPlaceDetails(selected!),
            onOpenMaps: () => _openPlaceInMaps(linkLauncher, selected!),
            onSave: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${selected!.name} saved.'))),
            onShare: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Share ${selected!.name} from the place detail flow.'))),
          ),
        const SizedBox(height: 8),
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
                child: AppCard(
                  glow: selected?.canonicalPlaceId == place.canonicalPlaceId,
                  gradient: selected?.canonicalPlaceId == place.canonicalPlaceId
                      ? LinearGradient(
                          colors: [
                            theme.colorScheme.primary.withOpacity(0.16),
                            theme.colorScheme.secondary.withOpacity(0.12),
                          ],
                        )
                      : null,
                  child: ListTile(
                    onTap: () {
                      controller.selectPlace(place.canonicalPlaceId);
                      _moveMapToPlace(place);
                    },
                    title: Text(place.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text('${place.categoryLabel} • ${distance != null && distance < 95 ? 'You’re here' : place.neighborhoodLabel}'),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Future<void> _searchForLocation(MapDiscoveryController controller) async {
    final result = await controller.searchLocation(_searchController.text);
    if (!mounted || result == null) return;
    _moveMap(state: ref.read(mapDiscoveryControllerProvider));
  }

  Future<void> _handleCenterOnUserLocation(LocationControllerState locationState, LocationPermissionService permissionService) async {
    final controller = ref.read(mapDiscoveryControllerProvider.notifier);
    if (locationState.effectiveLocation != null) {
      await controller.centerOnUserLocation(locationState.effectiveLocation!);
      if (mounted) {
        _moveMap(state: ref.read(mapDiscoveryControllerProvider));
      }
      return;
    }

    if (locationState.status == LocationStatus.serviceDisabled) {
      await permissionService.openLocationSettings();
      return;
    }

    if (locationState.status == LocationStatus.permissionDenied && locationState.lastPermissionResult?.canOpenAppSettings == true) {
      await permissionService.openAppSettings();
      return;
    }

    await ref.read(locationControllerProvider.notifier).requestPermissionAndLoad();
  }

  bool _shouldShowPermissionOverlay(LocationControllerState state) {
    return state.status == LocationStatus.permissionDenied || state.status == LocationStatus.serviceDisabled;
  }

  bool _isMapBlocked(ConnectivityState connectivityState, LocationControllerState locationState, MapViewportState state) {
    return !connectivityState.isOnline || _shouldShowPermissionOverlay(locationState) || state.discoveryError != null;
  }

  void _maybeSyncMapViewport(MapViewport viewport) {
    if (!_mapReady) {
      return;
    }
    final nextCenter = viewport.toLatLng();
    final centerChanged = _lastMapCenter == null || _lastMapCenter!.latitude != nextCenter.latitude || _lastMapCenter!.longitude != nextCenter.longitude;
    final zoomChanged = _lastMapZoom == null || (_lastMapZoom! - viewport.zoom).abs() > 0.01;
    if (!centerChanged && !zoomChanged) {
      return;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _moveMap(state: ref.read(mapDiscoveryControllerProvider));
    });
  }

  void _captureMapViewport() {
    final center = _mapController.camera.center;
    _lastMapCenter = center;
    _lastMapZoom = _mapController.camera.zoom;
  }

  void _moveMap({required MapViewportState state}) {
    if (!_mapReady) return;
    final center = state.viewport.toLatLng();
    _mapController.move(center, state.viewport.zoom);
    _lastMapCenter = center;
    _lastMapZoom = state.viewport.zoom;
  }

  void _moveMapToPlace(MapPin place) {
    final controller = ref.read(mapDiscoveryControllerProvider.notifier);
    controller.setViewport(
      MapViewport(centerLat: place.latitude, centerLng: place.longitude, zoom: max(ref.read(mapDiscoveryControllerProvider).viewport.zoom, 16)),
      markPendingSearch: false,
    );
    _moveMap(state: ref.read(mapDiscoveryControllerProvider));
  }

  List<Marker> _buildMarkers(BuildContext context, MapViewportState state, MapPin? selected, AppLocation? location) {
    final markers = <Marker>[
      for (final pin in state.pins)
        Marker(
          point: LatLng(pin.latitude, pin.longitude),
          width: 72,
          height: 72,
          child: _PlaceMarker(
            label: pin.name,
            rating: pin.rating,
            selected: selected?.canonicalPlaceId == pin.canonicalPlaceId,
            onTap: () {
              ref.read(mapDiscoveryControllerProvider.notifier).selectPlace(pin.canonicalPlaceId);
              _moveMapToPlace(pin);
            },
          ),
        ),
    ];

    if (location != null) {
      markers.add(
        Marker(
          point: LatLng(location.lat, location.lng),
          width: 28,
          height: 28,
          child: const IgnorePointer(child: _UserLocationMarker()),
        ),
      );
    }

    return markers;
  }

  Future<void> _openPlaceInMaps(LinkLauncher linkLauncher, MapPin place) async {
    await linkLauncher.openLink(
      context,
      uri: Uri.parse('https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}'),
      type: LinkType.maps,
      planTitle: place.name,
    );
  }

  void _openPlaceDetails(MapPin place) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PlaceVideoDetailPage(placeId: place.canonicalPlaceId, placeName: place.name),
      ),
    );
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
        action: SnackBarAction(
          label: 'Review',
          onPressed: () => _openPlaceDetails(
            MapPin(
              canonicalPlaceId: match.canonicalPlaceId!,
              name: match.placeName ?? 'Nearby place',
              category: 'place',
              latitude: location.lat,
              longitude: location.lng,
              rating: 0,
            ),
          ),
        ),
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

class _PlaceMarker extends StatelessWidget {
  const _PlaceMarker({
    required this.label,
    required this.rating,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final double rating;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final backgroundColor = selected ? theme.colorScheme.primary : theme.colorScheme.surface;
    final foregroundColor = selected ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface;

    return Align(
      alignment: Alignment.topCenter,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            constraints: const BoxConstraints(minWidth: 52, maxWidth: 120),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.18),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
              border: Border.all(color: theme.colorScheme.outlineVariant),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.place, size: 20, color: foregroundColor),
                const SizedBox(height: 2),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium?.copyWith(color: foregroundColor, fontWeight: FontWeight.w700),
                ),
                if (rating > 0)
                  Text(
                    '★ ${rating.toStringAsFixed(1)}',
                    style: theme.textTheme.labelSmall?.copyWith(color: foregroundColor.withOpacity(0.92)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _UserLocationMarker extends StatelessWidget {
  const _UserLocationMarker();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Theme.of(context).colorScheme.primary,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const [
          BoxShadow(color: Color(0x66000000), blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: const SizedBox.expand(),
    );
  }
}

class _MapStatusOverlay extends StatelessWidget {
  const _MapStatusOverlay({required this.message, required this.icon});

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ColoredBox(
      color: theme.colorScheme.surface.withOpacity(0.78),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 32),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge),
            ],
          ),
        ),
      ),
    );
  }
}

class _MapActionOverlay extends StatelessWidget {
  const _MapActionOverlay({
    required this.title,
    required this.body,
    required this.icon,
    required this.actions,
  });

  final String title;
  final String body;
  final IconData icon;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ColoredBox(
      color: theme.colorScheme.surface.withOpacity(0.82),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 320),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 36),
                  const SizedBox(height: 12),
                  Text(title, textAlign: TextAlign.center, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(body, textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  Wrap(alignment: WrapAlignment.center, spacing: 12, runSpacing: 12, children: actions),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
