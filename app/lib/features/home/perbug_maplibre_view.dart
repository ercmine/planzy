import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/env/env.dart';
import '../../core/logging/log.dart';
import 'map_discovery_models.dart';
import 'map_game_world.dart';
import 'perbug_map_theme.dart';

class PerbugMapLibreView extends StatefulWidget {
  const PerbugMapLibreView({
    super.key,
    required this.viewport,
    required this.pins,
    required this.selectedPlaceId,
    required this.userLocation,
    required this.world,
    required this.sponsoredPlaceIds,
    required this.questPlaceIds,
    required this.collectionPlaceIds,
    required this.is3dMode,
    required this.config,
    required this.onMapReady,
    required this.onViewportChanged,
    required this.onTapEmpty,
    required this.onLongPress,
    required this.onPlaceSelected,
  });

  final MapViewport viewport;
  final List<MapPin> pins;
  final String? selectedPlaceId;
  final ({double lat, double lng})? userLocation;
  final MapWorldState world;
  final Set<String> sponsoredPlaceIds;
  final Set<String> questPlaceIds;
  final Set<String> collectionPlaceIds;
  final bool is3dMode;
  final MapStackConfig config;
  final VoidCallback onMapReady;
  final void Function(MapViewport viewport, {required bool hasGesture}) onViewportChanged;
  final VoidCallback onTapEmpty;
  final void Function(double lat, double lng) onLongPress;
  final void Function(String placeId) onPlaceSelected;

  @override
  State<PerbugMapLibreView> createState() => _PerbugMapLibreViewState();
}

class _PerbugMapLibreViewState extends State<PerbugMapLibreView> {
  MapLibreMapController? _controller;
  CameraPosition? _lastCamera;
  bool _styleLoaded = false;
  VoidCallback? _cameraListener;

  PerbugMapTheme get _theme => PerbugMapTheme.resolve(brightness: Theme.of(context).brightness, config: widget.config);

  @override
  void didUpdateWidget(covariant PerbugMapLibreView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_controller == null || !_styleLoaded) return;

    final shouldMove = !widget.viewport.isSimilarTo(oldWidget.viewport, centerThreshold: 0.0003, zoomThreshold: 0.01);
    final selectionChanged = widget.selectedPlaceId != oldWidget.selectedPlaceId;
    if (shouldMove || selectionChanged || widget.is3dMode != oldWidget.is3dMode) {
      final camera = _cameraPositionForState();
      _controller!.animateCamera(CameraUpdate.newCameraPosition(camera));
    }

    if (oldWidget.pins != widget.pins ||
        oldWidget.selectedPlaceId != widget.selectedPlaceId ||
        oldWidget.userLocation != widget.userLocation ||
        oldWidget.is3dMode != widget.is3dMode ||
        oldWidget.sponsoredPlaceIds != widget.sponsoredPlaceIds ||
        oldWidget.questPlaceIds != widget.questPlaceIds ||
        oldWidget.collectionPlaceIds != widget.collectionPlaceIds) {
      _syncMapData();
    }
  }

  @override
  Widget build(BuildContext context) {
    final mapTheme = _theme;
    return MapLibreMap(
      styleString: mapTheme.styleUrl,
      initialCameraPosition: _cameraPositionForState(),
      // maplibre_gl 0.21.x exposes camera updates through the controller
      // listener API instead of a Map widget `onCameraMove` callback.
      trackCameraPosition: true,
      compassEnabled: false,
      rotateGesturesEnabled: true,
      tiltGesturesEnabled: widget.config.enableEnhancedPitch,
      myLocationEnabled: false,
      onMapCreated: (controller) {
        final previousListener = _cameraListener;
        if (previousListener != null) {
          _controller?.removeListener(previousListener);
        }
        _controller = controller;
        _cameraListener = () => _lastCamera = controller.cameraPosition;
        controller.addListener(_cameraListener!);
      },
      onStyleLoadedCallback: () async {
        _styleLoaded = true;
        widget.onMapReady();
        await _applyStyleEnhancements();
        await _syncMapData();
      },
      onMapClick: (_, __) => widget.onTapEmpty(),
      onMapLongClick: (_, point) => widget.onLongPress(point.latitude, point.longitude),
      onCameraIdle: () {
        final camera = _lastCamera;
        if (camera == null) return;
        widget.onViewportChanged(
          MapViewport(centerLat: camera.target.latitude, centerLng: camera.target.longitude, zoom: camera.zoom ?? widget.viewport.zoom),
          hasGesture: true,
        );
      },
      onCameraTrackingChanged: (_) {},
    );
  }

  @override
  void dispose() {
    final listener = _cameraListener;
    if (listener != null) {
      _controller?.removeListener(listener);
    }
    super.dispose();
  }

  CameraPosition _cameraPositionForState() {
    final camera = _theme.camera;
    final hasSelection = widget.selectedPlaceId != null;
    final canPitch = widget.is3dMode && widget.config.enableEnhancedPitch;
    return CameraPosition(
      target: LatLng(widget.viewport.centerLat, widget.viewport.centerLng),
      zoom: widget.viewport.zoom + (hasSelection ? camera.selectedZoomBoost : camera.idleZoomBoost),
      tilt: canPitch ? (hasSelection ? camera.selectedTilt : camera.idleTilt) : 20,
      bearing: canPitch ? (hasSelection ? camera.selectedBearing : camera.idleBearing) : 0,
    );
  }

  Future<void> _applyStyleEnhancements() async {
    final controller = _controller;
    if (controller == null) return;
    final mapTheme = _theme;

    if (widget.config.enable3dBuildings) {
      try {
        await controller.addLayer(
          'composite',
          'perbug-3d-buildings',
          FillExtrusionLayerProperties(
            fillExtrusionColor: mapTheme.building.wall,
            fillExtrusionOpacity: mapTheme.isDark ? 0.74 : 0.62,
            fillExtrusionHeight: [
              'interpolate',
              ['linear'],
              ['zoom'],
              13.2,
              0,
              16.2,
              ['coalesce', ['get', 'height'], 12],
            ],
            fillExtrusionBase: [
              'interpolate',
              ['linear'],
              ['zoom'],
              13.2,
              0,
              16.2,
              ['coalesce', ['get', 'min_height'], 0],
            ],
            fillExtrusionVerticalGradient: true,
          ),
          sourceLayer: 'building',
          belowLayerId: 'waterway-label',
        );
      } catch (error) {
        if (widget.config.enableDiagnostics) {
          Log.warn('map.style building extrusion not applied: $error');
        }
      }

      try {
        await controller.addLayer(
          'composite',
          'perbug-3d-building-roofs',
          FillLayerProperties(
            fillColor: mapTheme.building.roof,
            fillOpacity: mapTheme.isDark ? 0.34 : 0.26,
            fillOutlineColor: mapTheme.building.edge,
          ),
          sourceLayer: 'building',
          minzoom: 15.4,
          belowLayerId: 'waterway-label',
        );
      } catch (_) {}
    }

    if (widget.config.enableTerrain && widget.config.terrainSourceUrl != null && widget.config.terrainSourceUrl!.isNotEmpty) {
      // maplibre_gl 0.21.0 does not expose a Terrain API (`setTerrain` /
      // `TerrainSourceProperties`) on Flutter, so terrain must remain disabled.
      Log.warn(
        'map.style terrain requested but disabled: maplibre_gl 0.21.0 has no Flutter terrain API',
      );
    }
  }

  Future<void> _syncMapData() async {
    final controller = _controller;
    if (controller == null || !_styleLoaded) return;

    final placeFeatures = widget.pins
        .map((pin) => {
              'type': 'Feature',
              'geometry': {
                'type': 'Point',
                'coordinates': [pin.longitude, pin.latitude],
              },
              'properties': {
                'id': pin.canonicalPlaceId,
                'name': pin.name,
                'rating': pin.rating,
                'selected': pin.canonicalPlaceId == widget.selectedPlaceId ? 1 : 0,
                'sponsored': widget.sponsoredPlaceIds.contains(pin.canonicalPlaceId) ? 1 : 0,
                'quest': widget.questPlaceIds.contains(pin.canonicalPlaceId) ? 1 : 0,
                'collection': widget.collectionPlaceIds.contains(pin.canonicalPlaceId) ? 1 : 0,
                'reward': pin.hasReviews || pin.hasCreatorMedia ? 1 : 0,
              },
            })
        .toList(growable: false);

    final districtFeatures = widget.world.districts
        .map((zone) => {
              'type': 'Feature',
              'geometry': {
                'type': 'Point',
                'coordinates': [zone.centerLng, zone.centerLat],
              },
              'properties': {'energy': zone.energy},
            })
        .toList(growable: false);

    final userFeatures = widget.userLocation == null
        ? <Map<String, dynamic>>[]
        : [
            {
              'type': 'Feature',
              'geometry': {
                'type': 'Point',
                'coordinates': [widget.userLocation!.lng, widget.userLocation!.lat],
              },
              'properties': const {'kind': 'user'},
            },
          ];

    await _upsertGeoJsonSource('perbug-places', placeFeatures);
    await _upsertGeoJsonSource('perbug-districts', districtFeatures);
    await _upsertGeoJsonSource('perbug-user', userFeatures);

    await _ensurePerbugLayers();

    if (widget.config.enableDiagnostics) {
      Log.d('map.sync style=${_theme.styleUrl} places=${placeFeatures.length} districts=${districtFeatures.length} user=${userFeatures.length}');
    }
  }

  Future<void> _upsertGeoJsonSource(String id, List<Map<String, dynamic>> features) async {
    final controller = _controller;
    if (controller == null) return;
    final payload = <String, dynamic>{'type': 'FeatureCollection', 'features': features};
    try {
      await controller.setGeoJsonSource(id, payload);
    } catch (_) {
      await controller.addSource(
        id,
        GeojsonSourceProperties(
          data: payload,
          cluster: id == 'perbug-places' && widget.config.enableClustering,
          clusterRadius: 58,
          clusterMaxZoom: 13,
        ),
      );
    }
  }

  Future<void> _ensurePerbugLayers() async {
    final controller = _controller;
    if (controller == null) return;
    final mapTheme = _theme;

    try {
      await controller.addLayer(
        'perbug-districts',
        'perbug-district-halo-layer',
        CircleLayerProperties(
          circleColor: mapTheme.overlay.district,
          circleOpacity: ['interpolate', ['linear'], ['zoom'], 9, 0.08, 14, 0.18],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 18, 14, 44],
          circleBlur: 0.6,
        ),
      );
    } catch (_) {}

    try {
      await controller.addLayer(
        'perbug-districts',
        'perbug-district-core-layer',
        CircleLayerProperties(
          circleColor: mapTheme.overlay.districtEdge,
          circleOpacity: ['interpolate', ['linear'], ['zoom'], 9, 0.2, 14, 0.35],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 6, 14, 16],
        ),
      );
    } catch (_) {}

    try {
      await controller.addLayer(
        'perbug-places',
        'perbug-cluster-halo-layer',
        CircleLayerProperties(
          circleColor: mapTheme.marker.cluster,
          circleOpacity: 0.25,
          circleBlur: 0.4,
          circleRadius: ['interpolate', ['linear'], ['get', 'point_count'], 2, 18, 12, 26, 36, 34],
        ),
        filter: ['has', 'point_count'],
      );
      await controller.addLayer(
        'perbug-places',
        'perbug-cluster-layer',
        CircleLayerProperties(
          circleColor: mapTheme.marker.cluster,
          circleStrokeColor: mapTheme.marker.outline,
          circleStrokeWidth: 2,
          circleOpacity: 0.94,
          circleRadius: ['interpolate', ['linear'], ['get', 'point_count'], 2, 14, 12, 20, 36, 26],
        ),
        filter: ['has', 'point_count'],
      );
      await controller.addLayer(
        'perbug-places',
        'perbug-cluster-count-layer',
        SymbolLayerProperties(
          textField: ['to-string', ['get', 'point_count_abbreviated']],
          textSize: 12,
          textColor: mapTheme.marker.text,
          textHaloColor: mapTheme.label.halo,
          textHaloWidth: 0.8,
          textFont: const ['Open Sans Semibold'],
        ),
        filter: ['has', 'point_count'],
      );
    } catch (_) {}

    try {
      await controller.addLayer(
        'perbug-places',
        'perbug-place-selection-halo-layer',
        CircleLayerProperties(
          circleColor: mapTheme.overlay.selectionHalo,
          circleOpacity: 0.22,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 14, 15, 24],
          circleBlur: 0.45,
        ),
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'selected'], 1],
        ],
      );

      await controller.addLayer(
        'perbug-places',
        'perbug-place-focus-ring-layer',
        CircleLayerProperties(
          circleColor: mapTheme.overlay.focusRing,
          circleOpacity: 0.16,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 10, 15, 18],
        ),
        filter: [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'reward'], 1],
        ],
      );

      await controller.addLayer(
        'perbug-places',
        'perbug-place-layer',
        CircleLayerProperties(
          circleColor: [
            'case',
            ['==', ['get', 'selected'], 1],
            mapTheme.marker.selected,
            ['==', ['get', 'sponsored'], 1],
            mapTheme.marker.sponsored,
            ['==', ['get', 'reward'], 1],
            mapTheme.marker.reward,
            ['==', ['get', 'quest'], 1],
            mapTheme.marker.quest,
            ['==', ['get', 'collection'], 1],
            mapTheme.marker.collection,
            mapTheme.marker.normal,
          ],
          circleStrokeColor: mapTheme.marker.outline,
          circleStrokeWidth: ['case', ['==', ['get', 'selected'], 1], 2.8, 1.4],
          circleOpacity: 0.95,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 5.5, 12.5, 8, 15.5, 12.5],
        ),
        filter: ['!', ['has', 'point_count']],
      );

      await controller.addLayer(
        'perbug-places',
        'perbug-place-label-layer',
        SymbolLayerProperties(
          textField: ['get', 'name'],
          textSize: ['interpolate', ['linear'], ['zoom'], 11, 9, 15.8, 12.2],
          textColor: mapTheme.label.primary,
          textHaloColor: mapTheme.label.halo,
          textHaloWidth: 1.15,
          textOffset: const [0, 1.35],
          textAllowOverlap: false,
          textOptional: true,
          symbolSortKey: [
            'case',
            ['==', ['get', 'selected'], 1],
            10,
            ['==', ['get', 'sponsored'], 1],
            9,
            ['==', ['get', 'reward'], 1],
            8,
            1,
          ],
        ),
        filter: ['!', ['has', 'point_count']],
      );
    } catch (_) {}

    try {
      await controller.addLayer(
        'perbug-user',
        'perbug-user-halo-layer',
        CircleLayerProperties(
          circleColor: mapTheme.marker.user,
          circleOpacity: 0.22,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 13, 16, 20],
          circleBlur: 0.45,
        ),
      );
      await controller.addLayer(
        'perbug-user',
        'perbug-user-layer',
        CircleLayerProperties(
          circleColor: mapTheme.marker.user,
          circleStrokeColor: mapTheme.marker.outline,
          circleStrokeWidth: 2,
          circleRadius: 7.4,
          circleOpacity: 0.98,
        ),
      );
    } catch (_) {}
  }
}
