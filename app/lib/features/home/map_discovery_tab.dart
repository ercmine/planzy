import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/connectivity/connectivity_state.dart';
import '../../core/links/link_launcher.dart';
import '../../core/links/link_types.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../core/location/location_permission_service.dart';
import '../../core/logging/log.dart';
import '../../providers/app_providers.dart';
import '../collections/collection_models.dart';
import '../collections/collection_repository.dart';
import '../economy/economy_models.dart';
import '../video_platform/video_models.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'map_discovery_widgets.dart';
import 'map_game_world.dart';
import 'map_game_world_widgets.dart';
import 'place_detail_page.dart';
import 'place_preview_card.dart';
import '../../api/api_error.dart';
import '../../core/env/env.dart';
import 'perbug_maplibre_view.dart';

class MapViewportState {
  const MapViewportState({
    required this.viewport,
    this.selectedPlaceId,
    this.pins = const [],
    this.selectedFilters = const <String>{},
    this.backendCategories = const <String>{},
    this.pendingViewportSearch = false,
    this.loading = false,
    this.discoveryError,
    this.areaLabel,
    this.geoStatus,
    this.sort = MapDiscoverySort.relevance,
    this.hasInitialized = false,
    this.lastSearchMode = 'nearby',
    this.searchRadiusMeters = 12000,
    this.reviewableOnly = false,
  });

  final MapViewport viewport;
  final String? selectedPlaceId;
  final List<MapPin> pins;
  final Set<String> selectedFilters;
  final Set<String> backendCategories;
  final bool pendingViewportSearch;
  final bool loading;
  final String? discoveryError;
  final String? areaLabel;
  final String? geoStatus;
  final MapDiscoverySort sort;
  final bool hasInitialized;
  final String lastSearchMode;
  final double searchRadiusMeters;
  final bool reviewableOnly;

  MapViewportState copyWith({
    MapViewport? viewport,
    String? selectedPlaceId,
    bool clearSelectedPlace = false,
    List<MapPin>? pins,
    Set<String>? selectedFilters,
    Set<String>? backendCategories,
    bool? pendingViewportSearch,
    bool? loading,
    String? discoveryError,
    String? areaLabel,
    String? geoStatus,
    bool clearGeoStatus = false,
    MapDiscoverySort? sort,
    bool? hasInitialized,
    String? lastSearchMode,
    double? searchRadiusMeters,
    bool? reviewableOnly,
  }) {
    return MapViewportState(
      viewport: viewport ?? this.viewport,
      selectedPlaceId: clearSelectedPlace ? null : (selectedPlaceId ?? this.selectedPlaceId),
      pins: pins ?? this.pins,
      selectedFilters: selectedFilters ?? this.selectedFilters,
      backendCategories: backendCategories ?? this.backendCategories,
      pendingViewportSearch: pendingViewportSearch ?? this.pendingViewportSearch,
      loading: loading ?? this.loading,
      discoveryError: discoveryError,
      areaLabel: areaLabel ?? this.areaLabel,
      geoStatus: clearGeoStatus ? null : (geoStatus ?? this.geoStatus),
      sort: sort ?? this.sort,
      hasInitialized: hasInitialized ?? this.hasInitialized,
      lastSearchMode: lastSearchMode ?? this.lastSearchMode,
      searchRadiusMeters: searchRadiusMeters ?? this.searchRadiusMeters,
      reviewableOnly: reviewableOnly ?? this.reviewableOnly,
    );
  }
}

final mapGeoClientProvider = FutureProvider<MapGeoClient>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  return RemoteMapGeoClient(apiClient);
});

final placeDiscoveryClientProvider = FutureProvider<PlaceDiscoveryClient>((ref) async {
  final geoClient = await ref.watch(mapGeoClientProvider.future);
  final apiClient = await ref.watch(apiClientProvider.future);
  return BackendPlaceDiscoveryClient(geoClient, apiClient);
});

final mapCollectionsProvider = FutureProvider<List<CollectionCardModel>>((ref) async {
  final apiClient = await ref.watch(apiClientProvider.future);
  final repository = CollectionRepository(apiClient);
  return repository.fetchCollections();
});

final sponsoredPlacementsProvider = FutureProvider.family<List<SponsoredPlacement>, ({double lat, double lng})>((ref, args) async {
  final repository = await ref.watch(economyRepositoryProvider.future);
  return repository.fetchSponsoredPlacements(lat: args.lat, lng: args.lng);
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
    state = state.copyWith(hasInitialized: true, lastSearchMode: 'nearby');
  }

  void toggleFilter(MapFilterOption filter) {
    final selectedFilters = {...state.selectedFilters};
    if (!selectedFilters.add(filter.id)) selectedFilters.remove(filter.id);

    final backendCategories = <String>{};
    for (final activeFilterId in selectedFilters) {
      final option = _MapDiscoveryTabState.filterById[activeFilterId];
      if (option != null) backendCategories.addAll(option.discoveryCategories);
    }

    state = state.copyWith(
      selectedFilters: selectedFilters,
      backendCategories: backendCategories,
      pendingViewportSearch: true,
    );
  }

  void setSort(MapDiscoverySort sort) {
    if (state.sort == sort) return;
    state = state.copyWith(sort: sort);
  }

  void setSearchRadiusMeters(double radiusMeters) {
    state = state.copyWith(searchRadiusMeters: radiusMeters.clamp(1000, 50000).toDouble(), pendingViewportSearch: true);
  }

  void setReviewableOnly(bool enabled) {
    state = state.copyWith(reviewableOnly: enabled);
  }

  void selectPlace(String placeId) {
    if (state.selectedPlaceId == placeId) return;
    state = state.copyWith(selectedPlaceId: placeId);
  }

  void clearSelectedPlace() {
    if (state.selectedPlaceId == null) return;
    state = state.copyWith(clearSelectedPlace: true);
  }

  void setViewport(MapViewport viewport, {bool markPendingSearch = true}) {
    final pendingViewportSearch = markPendingSearch || state.pendingViewportSearch;
    final viewportUnchanged = state.viewport.isSimilarTo(viewport, centerThreshold: 0.0003, zoomThreshold: 0.01);
    if (viewportUnchanged && pendingViewportSearch == state.pendingViewportSearch) return;
    state = state.copyWith(viewport: viewport, pendingViewportSearch: pendingViewportSearch);
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
    } on ApiError catch (error) {
      final message = error.statusCode == 503
          ? 'Search service is unavailable right now.'
          : error.statusCode == 502
          ? 'Search is temporarily unavailable.'
          : error.statusCode == 429
              ? 'Search is temporarily busy. Please retry in a moment.'
              : error.kind == ApiErrorKind.decoding
                  ? 'Search returned an invalid response. Please update the app or retry.'
              : 'Search failed. Please retry.';
      state = state.copyWith(geoStatus: message);
      return null;
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
    final queryKey = [
      viewport.north.toStringAsFixed(4),
      viewport.south.toStringAsFixed(4),
      viewport.east.toStringAsFixed(4),
      viewport.west.toStringAsFixed(4),
      viewport.zoom.toStringAsFixed(2),
      mode,
      state.backendCategories.join(','),
    ].join('|');
    if (!state.pendingViewportSearch && _lastSearchKey == queryKey && state.pins.isNotEmpty) return;

    final requestId = ++_searchRequestId;
    Log.d('map.overlay tree data fetch started mode=$mode requestId=$requestId');
    Log.d('map.lifecycle loading flag set true source=search_this_area');
    state = state.copyWith(loading: true, discoveryError: null, lastSearchMode: mode);
    try {
      final discoveryClient = await _ref.read(placeDiscoveryClientProvider.future);
      final pins = await discoveryClient.searchByViewport(
        SearchAreaContext(
          viewport: viewport,
          categories: state.backendCategories.toList(growable: false),
          mode: mode,
          radiusMeters: state.searchRadiusMeters,
        ),
      );
      final location = _ref.read(locationControllerProvider).effectiveLocation;
      final eligibilityByPlace = location == null
          ? const <String, ReviewEligibilityStatus>{}
          : await discoveryClient.checkReviewEligibility(
              lat: location.lat,
              lng: location.lng,
              accuracyMeters: location.accuracyMeters,
              capturedAt: location.capturedAt,
              isMocked: location.isMocked,
              placeIds: pins.map((item) => item.canonicalPlaceId).toList(growable: false),
            );
      final enrichedPins = pins
          .map((pin) => MapPin(
                canonicalPlaceId: pin.canonicalPlaceId,
                name: pin.name,
                category: pin.category,
                latitude: pin.latitude,
                longitude: pin.longitude,
                rating: pin.rating,
                city: pin.city,
                region: pin.region,
                neighborhood: pin.neighborhood,
                distanceMeters: pin.distanceMeters,
                thumbnailUrl: pin.thumbnailUrl,
                hasCreatorMedia: pin.hasCreatorMedia,
                hasReviews: pin.hasReviews,
                descriptionSnippet: pin.descriptionSnippet,
                openNow: pin.openNow,
                reviewCount: pin.reviewCount,
                creatorVideoCount: pin.creatorVideoCount,
                reviewEligibility: eligibilityByPlace[pin.canonicalPlaceId],
              ))
          .toList(growable: false);
      if (requestId != _searchRequestId) return;
      _lastSearchKey = queryKey;
      Log.d('map.overlay tree data fetch succeeded mode=$mode requestId=$requestId pins=${enrichedPins.length}');
      Log.d('map.overlay nft marker generation succeeded mode=$mode requestId=$requestId');
      Log.d('map.lifecycle loading flag set false source=search_this_area_success');
      state = state.copyWith(
        loading: false,
        pins: enrichedPins,
        pendingViewportSearch: false,
        discoveryError: null,
        selectedPlaceId: enrichedPins.any((pin) => pin.canonicalPlaceId == state.selectedPlaceId)
            ? state.selectedPlaceId
            : (enrichedPins.isEmpty ? null : enrichedPins.first.canonicalPlaceId),
      );
    } on ApiError catch (error) {
      if (requestId != _searchRequestId) return;
      Log.warn('map.overlay tree data fetch failed mode=$mode requestId=$requestId status=${error.statusCode} kind=${error.kind}');
      Log.d('map.lifecycle loading flag set false source=search_this_area_api_error');
      final message = error.statusCode == 503
          ? 'Nearby service is unavailable right now.'
          : error.statusCode == 502
          ? 'Nearby places are temporarily unavailable.'
          : error.statusCode == 429
              ? 'Nearby search is busy. Please retry shortly.'
              : error.kind == ApiErrorKind.decoding
                  ? 'Nearby service returned an invalid response.'
              : 'Could not load nearby places. Retry to refresh this area.';
      state = state.copyWith(loading: false, pendingViewportSearch: false, discoveryError: message);
    } catch (_) {
      if (requestId != _searchRequestId) return;
      Log.warn('map.overlay tree data fetch failed mode=$mode requestId=$requestId error=unknown');
      Log.d('map.lifecycle loading flag set false source=search_this_area_error');
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
  static const List<MapFilterOption> filters = [
    MapFilterOption(id: 'cuisine', label: 'Cuisine', icon: Icons.restaurant_rounded, discoveryCategories: ['food']),
    MapFilterOption(id: 'coffee', label: 'Coffee', icon: Icons.local_cafe_rounded, discoveryCategories: ['coffee']),
    MapFilterOption(id: 'nightlife', label: 'Nightlife', icon: Icons.nightlife_rounded, discoveryCategories: ['nightlife']),
    MapFilterOption(id: 'bars', label: 'Bars', icon: Icons.wine_bar_rounded, discoveryCategories: ['nightlife']),
    MapFilterOption(id: 'brunch', label: 'Brunch', icon: Icons.brunch_dining_rounded, discoveryCategories: ['food']),
    MapFilterOption(id: 'attractions', label: 'Attractions', icon: Icons.museum_rounded, discoveryCategories: ['museums']),
    MapFilterOption(id: 'outdoor', label: 'Outdoor', icon: Icons.park_rounded, discoveryCategories: ['parks']),
    MapFilterOption(id: 'shopping', label: 'Shopping', icon: Icons.shopping_bag_rounded, discoveryCategories: ['shopping']),
    MapFilterOption(id: 'hidden_gems', label: 'Hidden gems', icon: Icons.diamond_outlined, highlyRatedOnly: true, minimumReviewCount: 1, badge: 'Hidden gem'),
    MapFilterOption(id: 'cheap_eats', label: 'Cheap eats', icon: Icons.sell_outlined, discoveryCategories: ['food']),
    MapFilterOption(id: 'date_spots', label: 'Date spots', icon: Icons.favorite_border_rounded, highlyRatedOnly: true),
    MapFilterOption(id: 'scenic', label: 'Scenic', icon: Icons.landscape_outlined, discoveryCategories: ['parks'], badge: 'Scenic'),
    MapFilterOption(id: 'open_now', label: 'Open now', icon: Icons.schedule_rounded, openNowOnly: true),
    MapFilterOption(id: 'highly_rated', label: 'Highly rated', icon: Icons.star_rounded, highlyRatedOnly: true),
    MapFilterOption(id: 'trending', label: 'Trending', icon: Icons.local_fire_department_outlined, trendingOnly: true),
  ];
  static final Map<String, MapFilterOption> filterById = {for (final filter in filters) filter.id: filter};

  final TextEditingController _searchController = TextEditingController();
  final Set<String> _savedPlaceIds = <String>{};
  bool _mapReady = false;
  String? _mapLoadError;
  bool _didInitialize = false;
  bool _hasFollowedUserLocation = false;
  bool _isSyncingMapViewport = false;
  bool _topOverlayCollapsed = false;
  bool _statsOverlayCollapsed = false;
  bool _searchAreaOverlayCollapsed = false;
  bool _is3dMode = false;
  ({double lat, double lng})? _lastMapCenter;
  double? _lastMapZoom;
  Timer? _viewportDebounce;
  Timer? _threeDLoadFallbackTimer;
  int _mapReloadNonce = 0;
  MapViewport? _lastAutoSearchViewport;
  late final ProviderSubscription<MapViewportState> _mapStateSubscription;
  late final ProviderSubscription<LocationControllerState> _locationSubscription;
  late final ProviderSubscription<ConnectivityState> _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    _mapStateSubscription = ref.listenManual<MapViewportState>(
      mapDiscoveryControllerProvider,
      (previous, next) => _handleMapStateChanged(previous: previous, next: next),
    );
    _locationSubscription = ref.listenManual<LocationControllerState>(
      locationControllerProvider,
      (previous, next) => _handleLocationStateChanged(previous: previous, next: next),
    );
    _connectivitySubscription = ref.listenManual<ConnectivityState>(
      connectivityControllerProvider,
      (previous, next) => _handleConnectivityChanged(previous: previous, next: next),
    );
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
    _viewportDebounce?.cancel();
    _threeDLoadFallbackTimer?.cancel();
    _mapStateSubscription.close();
    _locationSubscription.close();
    _connectivitySubscription.close();
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
    final economy = ref.watch(economyDashboardProvider).valueOrNull;
    final sponsoredPlacements = ref.watch(
      sponsoredPlacementsProvider((lat: state.viewport.centerLat, lng: state.viewport.centerLng)),
    ).valueOrNull ?? const <SponsoredPlacement>[];
    final sponsoredPlaceIds = sponsoredPlacements.map((item) => item.placeId).toSet();
    final questPlaceIds = (economy?.activeQuests ?? const <EconomyQuest>[]).map((item) => item.placeId).toSet();
    final collectionPlaceIds = (economy?.collections ?? const <EconomyCollection>[])
        .expand((item) => item.placeIds)
        .toSet();

    final visiblePlaces = _sortedAndFilteredPlaces(state.pins, state: state, location: location);
    final selected = _resolveSelectedPlace(state, visiblePlaces);
    final world = const MapWorldEngine().build(pins: visiblePlaces, viewport: state.viewport, location: location);
    final permissionBlocked = _shouldShowPermissionOverlay(locationState);
    final showSearchArea = state.pendingViewportSearch;

    final screenSize = MediaQuery.sizeOf(context);
    final overlayWidth = min(max(screenSize.width - 24, 0.0), 360.0);
    final overlayMaxHeight = max(screenSize.height - 210, 260.0);

    return LayoutBuilder(
      builder: (context, constraints) {
        final boundedWidth = constraints.hasBoundedWidth && constraints.maxWidth.isFinite;
        final boundedHeight = constraints.hasBoundedHeight && constraints.maxHeight.isFinite;
        final resolvedWidth = boundedWidth ? constraints.maxWidth : screenSize.width;
        final resolvedHeight = boundedHeight ? constraints.maxHeight : max(screenSize.height - 120, 520.0);

        return SizedBox(
          width: resolvedWidth,
          height: resolvedHeight,
          child: Stack(
            children: [
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerLowest,
                      border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.35)),
                    ),
                    child: Stack(
                      children: [
                  Positioned.fill(
                    child: PerbugMapLibreView(
                      key: ValueKey<String>('map-mode-${_is3dMode ? '3d' : '2d'}-reload-$_mapReloadNonce'),
                      viewport: state.viewport,
                      pins: visiblePlaces,
                      selectedPlaceId: selected?.canonicalPlaceId,
                      userLocation: location == null ? null : (lat: location.lat, lng: location.lng),
                      world: world,
                      sponsoredPlaceIds: sponsoredPlaceIds,
                      questPlaceIds: questPlaceIds,
                      collectionPlaceIds: collectionPlaceIds,
                      is3dMode: _is3dMode,
                      config: ref.watch(envConfigProvider).mapStack,
                      onMapLoadStarted: () {
                        if (!mounted) return;
                        Log.d('map.lifecycle loading flag set true source=map_created');
                        setState(() {
                          _mapReady = false;
                          _mapLoadError = null;
                        });
                      },
                      onMapReady: () {
                        if (!mounted) return;
                        _threeDLoadFallbackTimer?.cancel();
                        Log.d('map.lifecycle loading flag set false source=style_loaded');
                        setState(() {
                          _mapReady = true;
                          _mapLoadError = null;
                        });
                      },
                      onMapLoadError: (message) {
                        if (!mounted) return;
                        _threeDLoadFallbackTimer?.cancel();
                        Log.error('map.lifecycle style load failed error=$message');
                        setState(() {
                          _mapReady = false;
                          _mapLoadError = message;
                        });
                      },
                      onTapEmpty: () => controller.clearSelectedPlace(),
                      onLongPress: (lat, lng) {
                        controller.setViewport(
                          MapViewport(centerLat: lat, centerLng: lng, zoom: max(state.viewport.zoom, 15)),
                          markPendingSearch: true,
                        );
                      },
                      onViewportChanged: (nextViewport, {required hasGesture}) {
                        _lastMapCenter = (lat: nextViewport.centerLat, lng: nextViewport.centerLng);
                        _lastMapZoom = nextViewport.zoom;
                        if (_isSyncingMapViewport && !hasGesture) {
                          final targetViewport = ref.read(mapDiscoveryControllerProvider).viewport;
                          if (nextViewport.isSimilarTo(targetViewport, centerThreshold: 0.0003, zoomThreshold: 0.01)) {
                            _isSyncingMapViewport = false;
                            return;
                          }
                        }
                        controller.setViewport(nextViewport, markPendingSearch: hasGesture);
                        if (!hasGesture) _isSyncingMapViewport = false;
                      },
                      onPlaceSelected: (placeId) {
                        controller.selectPlace(placeId);
                        final pin = visiblePlaces.where((item) => item.canonicalPlaceId == placeId).firstOrNull;
                        if (pin != null) _moveMapToPlace(pin);
                      },
                    ),
                  ),
                  Positioned.fill(
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              const Color(0xFF60A5FA).withOpacity(0.08),
                              const Color(0xFF6C5CE7).withOpacity(0.14),
                              const Color(0xFFFFC857).withOpacity(0.08),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: SizedBox(
                      width: overlayWidth,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(maxHeight: overlayMaxHeight),
                        child: ScrollConfiguration(
                          behavior: const MaterialScrollBehavior().copyWith(scrollbars: false),
                          child: SingleChildScrollView(
                            padding: EdgeInsets.zero,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CollapsibleMapOverlay(
                                  title: 'Discovery controls',
                                  icon: Icons.tune_rounded,
                                  iconOnlyWhenCollapsed: true,
                                  isCollapsed: _topOverlayCollapsed,
                                  onToggle: () => setState(() => _topOverlayCollapsed = !_topOverlayCollapsed),
                                  child: Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Column(
                                      children: [
                                        DiscoverySearchBar(
                                          controller: _searchController,
                                          onSubmit: () => _searchForLocation(controller),
                                          onRecenter: () => _handleCenterOnUserLocation(locationState, permissionService),
                                          onOpenSortSheet: _openSortSheet,
                                          isLoading: state.loading,
                                          locationEnabled: location != null,
                                          areaLabel: state.areaLabel ?? state.geoStatus,
                                        ),
                                        const SizedBox(height: 10),
                                        DiscoveryFilterChips(
                                          filters: filters,
                                          selectedIds: state.selectedFilters,
                                          onToggle: (filterId) => controller.toggleFilter(filterById[filterId]!),
                                        ),
                                        const SizedBox(height: 10),
                                        Align(
                                          alignment: Alignment.centerLeft,
                                          child: FilterChip(
                                            selected: _is3dMode,
                                            label: const Text('3D map mode (beta)'),
                                            avatar: const Icon(Icons.view_in_ar_rounded, size: 18),
                                            onSelected: _set3dMode,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                !_mapReady
                                    ? IgnorePointer(
                                        child: DecoratedBox(
                                          decoration: BoxDecoration(
                                            color: theme.colorScheme.surface.withOpacity(0.9),
                                            borderRadius: BorderRadius.circular(999),
                                            boxShadow: const [
                                              BoxShadow(color: Color(0x33000000), blurRadius: 12, offset: Offset(0, 6)),
                                            ],
                                          ),
                                          child: Padding(
                                            padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                                                SizedBox(width: 10),
                                                Text(_mapLoadError == null ? 'Loading map' : 'Map load failed'),
                                              ],
                                            ),
                                          ),
                                        ),
                                      )
                                    : CollapsibleMapOverlay(
                                        title: 'Search area',
                                        icon: Icons.travel_explore_rounded,
                                        iconOnlyWhenCollapsed: true,
                                        isCollapsed: _searchAreaOverlayCollapsed,
                                        onToggle: () => setState(() => _searchAreaOverlayCollapsed = !_searchAreaOverlayCollapsed),
                                        child: Padding(
                                          padding: const EdgeInsets.only(top: 6),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  IconButton.filledTonal(
                                                    onPressed: () => _openNearbyPlacesList(
                                                      state: state,
                                                      visiblePlaces: visiblePlaces,
                                                      locationState: locationState,
                                                      connectivityState: connectivityState,
                                                      location: location,
                                                    ),
                                                    tooltip: 'Open nearby places list',
                                                    icon: const Icon(Icons.format_list_bulleted_rounded),
                                                  ),
                                                  const SizedBox(width: 10),
                                                  Expanded(
                                                    child: SearchAreaButton(
                                                      visible: showSearchArea,
                                                      onPressed: () => controller.searchThisArea(mode: 'search_this_area'),
                                                      isLoading: state.loading,
                                                      resultCount: visiblePlaces.length,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 10),
                                              Text(
                                                'Search radius: ${_radiusLabel(state.searchRadiusMeters)}',
                                                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                                              ),
                                              Slider(
                                                value: state.searchRadiusMeters.clamp(1000, 50000),
                                                min: 1000,
                                                max: 50000,
                                                divisions: 49,
                                                label: _radiusLabel(state.searchRadiusMeters),
                                                onChanged: (value) => controller.setSearchRadiusMeters(value),
                                                onChangeEnd: (value) => _handleRadiusChanged(
                                                  value,
                                                  location: location,
                                                  controller: controller,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                const SizedBox(height: 12),
                                CollapsibleMapOverlay(
                                  title: 'Nearby places',
                                  icon: Icons.format_list_bulleted_rounded,
                                  iconOnlyWhenCollapsed: true,
                                  isCollapsed: _statsOverlayCollapsed,
                                  onToggle: () => setState(() => _statsOverlayCollapsed = !_statsOverlayCollapsed),
                                  child: Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        DiscoveryCountPill(
                                          count: visiblePlaces.length,
                                          label: visiblePlaces.length == 1 ? 'place in view' : 'places in view',
                                        ),
                                        const SizedBox(height: 10),
                                        SizedBox(
                                          width: double.infinity,
                                          child: FilledButton.icon(
                                            onPressed: () => _openNearbyPlacesList(
                                              state: state,
                                              visiblePlaces: visiblePlaces,
                                              locationState: locationState,
                                              connectivityState: connectivityState,
                                              location: location,
                                            ),
                                            icon: const Icon(Icons.map_outlined),
                                            label: const Text('Open nearby places list screen'),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        DistrictLegendCard(
                                          world: world,
                                          onSelectDistrict: _handleDistrictSelected,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (state.loading)
                    const Positioned(top: 0, left: 0, right: 0, child: LinearProgressIndicator(minHeight: 3)),
                  if (!connectivityState.isOnline)
                    Positioned.fill(
                      child: DiscoveryStateCard(
                        icon: Icons.wifi_off_rounded,
                        title: 'You are offline',
                        body: 'Reconnect to refresh nearby places and map tiles. Cached results will stay visible while you get back online.',
                      ),
                    ),
                  if (permissionBlocked)
                    Positioned.fill(
                      child: DiscoveryStateCard(
                        icon: locationState.status == LocationStatus.serviceDisabled ? Icons.location_disabled : Icons.location_searching,
                        title: locationState.status == LocationStatus.serviceDisabled ? 'Turn on location services' : 'Allow location access',
                        body: locationState.errorMessage ?? 'Perbug uses your location to center the map, surface what is close, and power recenter + nearby discovery.',
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
                      child: DiscoveryStateCard(
                        icon: Icons.error_outline,
                        title: 'Nearby places unavailable',
                        body: state.discoveryError!,
                        actions: [
                          FilledButton.icon(
                            onPressed: () => controller.searchThisArea(mode: state.lastSearchMode),
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  if (_mapLoadError != null)
                    Positioned.fill(
                      child: DiscoveryStateCard(
                        icon: Icons.map_outlined,
                        title: 'Map unavailable',
                        body: _mapLoadError!,
                        actions: [
                          FilledButton.icon(
                            onPressed: _retryMapLoad,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry map'),
                          ),
                        ],
                      ),
                    ),
                  if (location == null && _mapReady && _mapLoadError == null)
                    Positioned(
                      right: 16,
                      bottom: 156,
                      child: FilledButton.icon(
                        onPressed: () => _handleCenterOnUserLocation(locationState, permissionService),
                        icon: const Icon(Icons.location_searching_rounded),
                        label: const Text('Enable location'),
                      ),
                    ),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 16,
                bottom: 96,
                child: IgnorePointer(
                  ignoring: !_mapReady,
                  child: PulsingSearchAreaButton(
                    isLoading: state.loading,
                    onPressed: () async {
                      await controller.searchThisArea(mode: 'search_this_area');
                      await controller.refreshAreaLabel();
                    },
                  ),
                ),
              ),
              Positioned(
                left: 16,
                bottom: 48,
                child: FilterChip(
                  label: const Text('Can review now'),
                  selected: state.reviewableOnly,
                  onSelected: (value) => ref.read(mapDiscoveryControllerProvider.notifier).setReviewableOnly(value),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _set3dMode(bool enabled) {
    if (_is3dMode == enabled) return;
    _threeDLoadFallbackTimer?.cancel();
    setState(() {
      _is3dMode = enabled;
      _mapReady = false;
      _mapLoadError = null;
    });
    if (!enabled) return;
    _threeDLoadFallbackTimer = Timer(const Duration(seconds: 10), () {
      if (!mounted || !_is3dMode || _mapReady) return;
      Log.warn('map.lifecycle timeout triggered: 3d mode fallback to 2d');
      setState(() => _is3dMode = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('3D map timed out. Switched back to 2D map.')),
      );
    });
  }

  void _retryMapLoad() {
    Log.d('map.lifecycle retry requested by user');
    setState(() {
      _mapLoadError = null;
      _mapReady = false;
      _mapReloadNonce++;
    });
  }

  Widget? _emptyStateFor({
    required MapViewportState state,
    required LocationControllerState locationState,
    required ConnectivityState connectivityState,
    required bool noLocationAvailable,
    required List<MapPin> visiblePlaces,
  }) {
    if (!connectivityState.isOnline || _shouldShowPermissionOverlay(locationState) || state.discoveryError != null) {
      return null;
    }
    if (state.loading) {
      return const DiscoveryStateCard(
        icon: Icons.radar_rounded,
        title: 'Refreshing nearby places',
        body: 'Scanning the visible area for the strongest nearby spots, creator activity, and recent reviews.',
      );
    }
    if (noLocationAvailable && visiblePlaces.isEmpty) {
      return const DiscoveryStateCard(
        icon: Icons.my_location_outlined,
        title: 'Location unavailable',
        body: 'We could not get your current position yet. You can still pan the map and search any area manually.',
      );
    }
    if (visiblePlaces.isEmpty && state.selectedFilters.isNotEmpty) {
      return const DiscoveryStateCard(
        icon: Icons.filter_alt_off_outlined,
        title: 'No places match these filters',
        body: 'Try removing a few filters or move the map to a busier part of town to widen discovery.',
      );
    }
    if (visiblePlaces.isEmpty && _searchController.text.trim().isNotEmpty) {
      return const DiscoveryStateCard(
        icon: Icons.search_off_rounded,
        title: 'No search results here',
        body: 'That search did not surface any places in the visible area yet. Try another neighborhood or search this area after moving the map.',
      );
    }
    if (visiblePlaces.isEmpty) {
      return const DiscoveryStateCard(
        icon: Icons.travel_explore_outlined,
        title: 'No places found in this area',
        body: 'Move the map, zoom out, or use a broader filter mix to discover more places around you.',
      );
    }
    return null;
  }

  Future<void> _searchForLocation(MapDiscoveryController controller) async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      await controller.searchThisArea(mode: 'search_this_area');
      await controller.refreshAreaLabel();
      if (!mounted) return;
      _moveMap(state: ref.read(mapDiscoveryControllerProvider));
      return;
    }

    final result = await controller.searchLocation(query);
    if (!mounted) return;
    if (result == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No matching location found. Try a nearby neighborhood or city.')),
      );
      return;
    }
    final cityLevelQuery = query.split(RegExp(r'\s+')).length <= 3;
    if (cityLevelQuery) {
      controller.setSearchRadiusMeters(40000);
      final current = ref.read(mapDiscoveryControllerProvider).viewport;
      controller.setViewport(
        current.copyWith(zoom: min(current.zoom, 11.2)),
        markPendingSearch: true,
      );
      await controller.searchThisArea(mode: 'city_exploration');
    }
    _moveMap(state: ref.read(mapDiscoveryControllerProvider));
  }

  Future<void> _handleRadiusChanged(
    double radiusMeters, {
    required AppLocation? location,
    required MapDiscoveryController controller,
  }) async {
    final target = location;
    if (target != null) {
      controller.setViewport(
        MapViewport(
          centerLat: target.lat,
          centerLng: target.lng,
          zoom: _zoomForRadius(radiusMeters),
        ),
        markPendingSearch: true,
      );
      _moveMap(state: ref.read(mapDiscoveryControllerProvider));
    }
    await controller.searchThisArea(mode: 'search_this_area');
    await controller.refreshAreaLabel();
  }

  Future<void> _openNearbyPlacesList({
    required MapViewportState state,
    required List<MapPin> visiblePlaces,
    required LocationControllerState locationState,
    required ConnectivityState connectivityState,
    required AppLocation? location,
  }) async {
    final placesForList = visiblePlaces.isNotEmpty ? visiblePlaces : state.pins;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NearbyPlacesPage(
          places: placesForList,
          selectedPlaceId: state.selectedPlaceId,
          onPlaceSelected: (place) {
            ref.read(mapDiscoveryControllerProvider.notifier).selectPlace(place.canonicalPlaceId);
            _moveMapToPlace(place);
          },
          onOpenPlace: _openPlaceDetails,
          onToggleSave: _toggleSave,
          onReview: _startReviewFromMap,
          onDirections: (place) => _openPlaceInMaps(ref.read(linkLauncherProvider), place),
          onShare: _sharePlace,
          savedPlaceIds: _savedPlaceIds,
          countLabel: _countLabel(placesForList, state: state),
          sort: state.sort,
          onOpenSortSheet: _openSortSheet,
          loading: state.loading,
          emptyState: _emptyStateFor(
            state: state,
            locationState: locationState,
            connectivityState: connectivityState,
            noLocationAvailable: location == null,
            visiblePlaces: placesForList,
          ),
          permissionState: _shouldShowPermissionOverlay(locationState)
              ? const DiscoveryStateCard(
                  icon: Icons.location_searching_rounded,
                  title: 'Location required',
                  body: 'Enable location to improve nearby ranking and distance estimates.',
                )
              : null,
          errorState: state.discoveryError == null
              ? null
              : DiscoveryStateCard(
                  icon: Icons.error_outline,
                  title: 'Nearby places unavailable',
                  body: state.discoveryError!,
                ),
          collectionSummary: null,
        ),
      ),
    );
  }

  String _radiusLabel(double radiusMeters) {
    if (radiusMeters < 1000) return '${radiusMeters.round()} m';
    return '${(radiusMeters / 1000).toStringAsFixed(0)} km';
  }

  double _zoomForRadius(double radiusMeters) {
    final computed = 222000 / radiusMeters;
    return computed.clamp(9.5, 16.5).toDouble();
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

  void _handleMapStateChanged({required MapViewportState? previous, required MapViewportState next}) {
    if (!_mapReady) return;
    if (previous == null || !next.viewport.isSimilarTo(previous.viewport, centerThreshold: 0.0003, zoomThreshold: 0.01)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _moveMap(state: ref.read(mapDiscoveryControllerProvider));
      });
    }
    _scheduleViewportRefresh();
  }

  void _handleLocationStateChanged({
    required LocationControllerState? previous,
    required LocationControllerState next,
  }) {
    if (!_didInitialize) return;
    final nextLocation = next.effectiveLocation;
    final previousLocation = previous?.effectiveLocation;
    final locationJustBecameAvailable = nextLocation != null && previousLocation == null;
    if (!_hasFollowedUserLocation && locationJustBecameAvailable) {
      _hasFollowedUserLocation = true;
      Future.microtask(() async {
        await ref.read(mapDiscoveryControllerProvider.notifier).centerOnUserLocation(nextLocation!);
        if (mounted) await _checkVisitReviewPrompt();
      });
    }
    _scheduleViewportRefresh();
  }

  void _handleConnectivityChanged({
    required ConnectivityState? previous,
    required ConnectivityState next,
  }) {
    if (next.isOnline && previous?.isOnline != true) {
      _scheduleViewportRefresh();
    }
  }

  void _scheduleViewportRefresh() {
    final state = ref.read(mapDiscoveryControllerProvider);
    final connectivityState = ref.read(connectivityControllerProvider);
    final permissionBlocked = _shouldShowPermissionOverlay(ref.read(locationControllerProvider));
    if (!state.pendingViewportSearch || state.loading || !connectivityState.isOnline || permissionBlocked) return;
    if (_lastAutoSearchViewport != null && _lastAutoSearchViewport!.isSimilarTo(state.viewport)) return;
    _viewportDebounce?.cancel();
    _viewportDebounce = Timer(const Duration(milliseconds: 550), () async {
      if (!mounted) return;
      final latestState = ref.read(mapDiscoveryControllerProvider);
      final latestConnectivity = ref.read(connectivityControllerProvider);
      final latestPermissionBlocked = _shouldShowPermissionOverlay(ref.read(locationControllerProvider));
      if (!latestState.pendingViewportSearch || latestState.loading || !latestConnectivity.isOnline || latestPermissionBlocked) return;
      _lastAutoSearchViewport = latestState.viewport;
      await ref.read(mapDiscoveryControllerProvider.notifier).searchThisArea(mode: 'search_this_area');
      if (mounted) await ref.read(mapDiscoveryControllerProvider.notifier).refreshAreaLabel();
    });
  }

  void _moveMap({required MapViewportState state}) {
    if (!_mapReady) return;
    final center = (lat: state.viewport.centerLat, lng: state.viewport.centerLng);
    final alreadyAligned = _lastMapCenter != null &&
        (_lastMapCenter!.lat - center.lat).abs() <= 0.0003 &&
        (_lastMapCenter!.lng - center.lng).abs() <= 0.0003 &&
        _lastMapZoom != null &&
        (_lastMapZoom! - state.viewport.zoom).abs() <= 0.01;
    if (alreadyAligned) {
      _isSyncingMapViewport = false;
      return;
    }
    _isSyncingMapViewport = true;
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

  Future<void> _handleDistrictSelected(DistrictZone zone) async {
    if (!mounted) return;
    final controller = ref.read(mapDiscoveryControllerProvider.notifier);
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (context) => _DistrictInsightsPage(
          zone: zone,
          onOpenExploration: () async {
            controller.setViewport(
              MapViewport(
                centerLat: zone.centerLat,
                centerLng: zone.centerLng,
                zoom: max(ref.read(mapDiscoveryControllerProvider).viewport.zoom, 14.5),
              ),
              markPendingSearch: true,
            );
            _moveMap(state: ref.read(mapDiscoveryControllerProvider));
            await controller.searchThisArea(mode: 'district_exploration');
          },
          onCenterMap: () {
            controller.setViewport(
              MapViewport(
                centerLat: zone.centerLat,
                centerLng: zone.centerLng,
                zoom: max(ref.read(mapDiscoveryControllerProvider).viewport.zoom, 14),
              ),
              markPendingSearch: true,
            );
            _moveMap(state: ref.read(mapDiscoveryControllerProvider));
          },
        ),
      ),
    );
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
        builder: (_) => PlaceDetailPage(
          place: place,
          onLeaveReview: () => _startReviewFromMap(place),
          onOpenMaps: () async {
            final launcher = ref.read(linkLauncherProvider);
            await _openPlaceInMaps(launcher, place);
          },
          onShare: () => _sharePlace(place),
        ),
      ),
    );
  }

  void _startReviewFromMap(MapPin place) {
    final eligibility = place.reviewEligibility;
    if (eligibility?.allowed != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(eligibility?.message ?? eligibility?.shortLabel ?? 'Move closer to this place to review.')),
      );
      return;
    }
    context.pushNamed(
      'place-review-editor',
      extra: _toPlaceSearchResult(place),
    );
  }

  PlaceSearchResult _toPlaceSearchResult(MapPin place) {
    return PlaceSearchResult(
      placeId: place.canonicalPlaceId,
      name: place.name,
      category: place.categoryLabel,
      regionLabel: place.neighborhoodLabel,
      addressSnippet: [place.neighborhood, place.city, place.region].whereType<String>().where((item) => item.isNotEmpty).join(', '),
      distanceKm: place.distanceMeters == null ? null : place.distanceMeters! / 1000,
      thumbnailUrl: place.thumbnailUrl,
    );
  }

  void _toggleSave(MapPin place) {
    setState(() {
      if (!_savedPlaceIds.add(place.canonicalPlaceId)) {
        _savedPlaceIds.remove(place.canonicalPlaceId);
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(_savedPlaceIds.contains(place.canonicalPlaceId) ? '${place.name} saved.' : '${place.name} removed from saved places.')),
    );
  }

  Future<void> _sharePlace(MapPin place) async {
    await Share.share('Check out ${place.name} on Perbug: https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}');
  }

  Future<void> _openSortSheet() async {
    final currentSort = ref.read(mapDiscoveryControllerProvider).sort;
    final result = await showModalBottomSheet<MapDiscoverySort>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final sort in MapDiscoverySort.values)
                RadioListTile<MapDiscoverySort>(
                  value: sort,
                  groupValue: currentSort,
                  title: Text(_sortLabel(sort)),
                  subtitle: Text(_sortDescription(sort)),
                  onChanged: (value) => Navigator.of(context).pop(value),
                ),
            ],
          ),
        );
      },
    );
    if (result != null) {
      ref.read(mapDiscoveryControllerProvider.notifier).setSort(result);
    }
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

  MapPin? _resolveSelectedPlace(MapViewportState state, List<MapPin> visiblePlaces) {
    for (final place in visiblePlaces) {
      if (place.canonicalPlaceId == state.selectedPlaceId) return place;
    }
    return visiblePlaces.isEmpty ? null : visiblePlaces.first;
  }

  List<MapPin> _sortedAndFilteredPlaces(List<MapPin> pins, {required MapViewportState state, required AppLocation? location}) {
    Iterable<MapPin> filtered = pins;
    if (state.reviewableOnly) {
      filtered = filtered.where((pin) => pin.reviewEligibility?.allowed == true);
    }
    for (final filterId in state.selectedFilters) {
      final filter = filterById[filterId];
      if (filter == null) continue;
      filtered = filtered.where((pin) {
        if (filter.openNowOnly && pin.openNow != true) return false;
        if (filter.highlyRatedOnly && pin.rating < 0.72) return false;
        if (filter.trendingOnly && !_isTrending(pin)) return false;
        if (filter.minimumReviewCount != null && pin.reviewCount < filter.minimumReviewCount!) return false;
        return true;
      });
    }

    final places = filtered.toList(growable: false);
    final sorted = [...places];
    if (state.sort == MapDiscoverySort.distance) {
      sorted.sort((a, b) => _distanceForSort(a, location).compareTo(_distanceForSort(b, location)));
    } else if (state.sort == MapDiscoverySort.rating) {
      sorted.sort((a, b) => b.rating.compareTo(a.rating));
    } else if (state.sort == MapDiscoverySort.trending) {
      sorted.sort((a, b) => _trendScore(b).compareTo(_trendScore(a)));
    } else if (state.sort == MapDiscoverySort.activity) {
      sorted.sort((a, b) => _activityScore(b).compareTo(_activityScore(a)));
    } else {
      sorted.sort((a, b) => _relevanceScore(b, location).compareTo(_relevanceScore(a, location)));
    }
    return sorted;
  }

  List<PlaceBadge> _badgesFor(MapPin place) {
    final badges = <PlaceBadge>[];
    if (_isTrending(place)) badges.add(const PlaceBadge(label: 'Trending', tone: MapBadgeTone.warning));
    if (place.rating >= 0.82) badges.add(const PlaceBadge(label: 'Must try', tone: MapBadgeTone.brand));
    if (place.reviewCount <= 6 && place.rating >= 0.75) badges.add(const PlaceBadge(label: 'Hidden gem', tone: MapBadgeTone.info));
    if ((place.category.contains('park') || place.category.contains('museum')) && place.thumbnailUrl != null) {
      badges.add(const PlaceBadge(label: 'Scenic', tone: MapBadgeTone.success));
    }
    if (place.reviewCount >= 10) badges.add(const PlaceBadge(label: 'Local favorite', tone: MapBadgeTone.brand));
    if (place.hasCreatorMedia) badges.add(const PlaceBadge(label: 'Recent reviews nearby', tone: MapBadgeTone.info));
    return badges;
  }

  bool _isTrending(MapPin place) => place.reviewCount >= 8 || place.creatorVideoCount >= 1;

  double _relevanceScore(MapPin place, AppLocation? location) {
    return place.rating * 0.55 + _activityScore(place) * 0.25 + (1 / max(_distanceForSort(place, location), 1)) * 1200;
  }

  double _activityScore(MapPin place) => place.reviewCount + (place.creatorVideoCount * 5) + (place.openNow == true ? 2 : 0);

  double _trendScore(MapPin place) => (place.creatorVideoCount * 8) + place.reviewCount + (place.openNow == true ? 4 : 0) + place.rating * 5;

  double _distanceForSort(MapPin place, AppLocation? location) {
    return _distanceMeters(location?.lat, location?.lng, place.latitude, place.longitude) ?? (place.distanceMeters ?? 999999);
  }

  String _countLabel(List<MapPin> visiblePlaces, {required MapViewportState state}) {
    final sortLabel = _sortLabel(state.sort);
    final filterCount = state.selectedFilters.length + (state.reviewableOnly ? 1 : 0);
    final filterText = filterCount == 0 ? 'All places' : '$filterCount filters active';
    return '${visiblePlaces.length} places in this area • Sorted by $sortLabel • $filterText';
  }

  PlaceProximityState _proximityFor(MapPin place, AppLocation? location) {
    final distance = _distanceMeters(location?.lat, location?.lng, place.latitude, place.longitude);
    if (distance == null) return PlaceProximityState.unknown;
    if (distance <= 90) return PlaceProximityState.here;
    if (distance <= 240) return PlaceProximityState.nearby;
    return PlaceProximityState.unknown;
  }

  String? _distanceSummary(MapPin place, AppLocation? location) {
    final distance = _distanceMeters(location?.lat, location?.lng, place.latitude, place.longitude) ?? place.distanceMeters;
    if (distance == null) return null;
    if (distance < 120) return 'Here now';
    if (distance < 1000) return '${distance.round()} m';
    return '${(distance / 1000).toStringAsFixed(1)} km';
  }

  static String _sortLabel(MapDiscoverySort sort) {
    switch (sort) {
      case MapDiscoverySort.distance:
        return 'distance';
      case MapDiscoverySort.rating:
        return 'rating';
      case MapDiscoverySort.trending:
        return 'trending';
      case MapDiscoverySort.activity:
        return 'activity';
      case MapDiscoverySort.relevance:
        return 'relevance';
    }
  }

  static String _sortDescription(MapDiscoverySort sort) {
    switch (sort) {
      case MapDiscoverySort.distance:
        return 'Prioritize what is closest to you or the current map center.';
      case MapDiscoverySort.rating:
        return 'Push the strongest-rated places to the top first.';
      case MapDiscoverySort.trending:
        return 'Highlight places with fresh activity and creator momentum.';
      case MapDiscoverySort.activity:
        return 'Surface the busiest places with reviews and recent content.';
      case MapDiscoverySort.relevance:
        return 'Blend quality, proximity, and activity for the best overall discovery.';
    }
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

class _DistrictInsightsPage extends StatelessWidget {
  const _DistrictInsightsPage({
    required this.zone,
    required this.onOpenExploration,
    required this.onCenterMap,
  });

  final DistrictZone zone;
  final Future<void> Function() onOpenExploration;
  final VoidCallback onCenterMap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Map insight details')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(zone.name, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text(
                '${zone.scene} • ${(zone.completion * 100).round()}% discovered',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 6),
              Text(
                'Energy ${(zone.energy * 100).round()} • Radius ${(zone.radiusMeters / 1000).toStringAsFixed(1)} km',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () async {
                  await onOpenExploration();
                  if (!context.mounted) return;
                  await Navigator.of(context).maybePop();
                },
                icon: const Icon(Icons.travel_explore_rounded),
                label: const Text('Open exploration'),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () {
                  onCenterMap();
                  unawaited(Navigator.of(context).maybePop());
                },
                icon: const Icon(Icons.center_focus_strong_rounded),
                label: const Text('Center map'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
