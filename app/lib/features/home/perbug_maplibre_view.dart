import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/env/env.dart';
import '../../core/logging/log.dart';
import 'map_discovery_models.dart';
import 'map_game_world.dart';

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
  MaplibreMapController? _controller;
  CameraPosition? _lastCamera;
  bool _styleLoaded = false;

  String get _styleUrl => Theme.of(context).brightness == Brightness.dark ? widget.config.darkStyleUrl : widget.config.styleUrl;

  @override
  void didUpdateWidget(covariant PerbugMapLibreView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_controller == null || !_styleLoaded) return;

    final shouldMove = !widget.viewport.isSimilarTo(oldWidget.viewport, centerThreshold: 0.0003, zoomThreshold: 0.01);
    if (shouldMove) {
      _controller!.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: LatLng(widget.viewport.centerLat, widget.viewport.centerLng),
            zoom: widget.viewport.zoom,
            tilt: widget.is3dMode && widget.config.enableEnhancedPitch ? 52 : 20,
            bearing: widget.is3dMode ? 18 : 0,
          ),
        ),
      );
    }

    if (oldWidget.pins != widget.pins ||
        oldWidget.selectedPlaceId != widget.selectedPlaceId ||
        oldWidget.userLocation != widget.userLocation ||
        oldWidget.is3dMode != widget.is3dMode) {
      _syncMapData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaplibreMap(
      styleString: _styleUrl,
      initialCameraPosition: CameraPosition(
        target: LatLng(widget.viewport.centerLat, widget.viewport.centerLng),
        zoom: widget.viewport.zoom,
        tilt: widget.is3dMode && widget.config.enableEnhancedPitch ? 48 : 20,
        bearing: widget.is3dMode ? 18 : 0,
      ),
      compassEnabled: false,
      rotateGesturesEnabled: true,
      tiltGesturesEnabled: widget.config.enableEnhancedPitch,
      myLocationEnabled: false,
      onMapCreated: (controller) => _controller = controller,
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
      onCameraMove: (camera) => _lastCamera = camera,
    );
  }

  Future<void> _applyStyleEnhancements() async {
    final controller = _controller;
    if (controller == null) return;

    try {
      if (widget.config.enable3dBuildings) {
        await controller.addLayer(
          'composite',
          'perbug-3d-buildings',
          FillExtrusionLayerProperties(
            sourceLayer: 'building',
            fillExtrusionColor: '#7187ff',
            fillExtrusionOpacity: 0.55,
            fillExtrusionHeight: [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.5,
              ['get', 'height'],
            ],
            fillExtrusionBase: [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.5,
              ['coalesce', ['get', 'min_height'], 0],
            ],
          ),
          belowLayerId: 'waterway-label',
        );
      }
    } catch (error) {
      if (widget.config.enableDiagnostics) {
        Log.warn('map.style building extrusion not applied: $error');
      }
    }

    if (widget.config.enableTerrain && widget.config.terrainSourceUrl != null && widget.config.terrainSourceUrl!.isNotEmpty) {
      try {
        await controller.addSource(
          'perbug-dem',
          RasterDemSourceProperties(url: widget.config.terrainSourceUrl!, tileSize: 512, maxzoom: 14),
        );
        await controller.setTerrain(TerrainSourceProperties(sourceId: 'perbug-dem', exaggeration: 1.2));
      } catch (error) {
        Log.warn('map.style terrain disabled (unsupported or unavailable): $error');
      }
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
      Log.d('map.sync style=$_styleUrl places=${placeFeatures.length} districts=${districtFeatures.length} user=${userFeatures.length}');
    }
  }

  Future<void> _upsertGeoJsonSource(String id, List<Map<String, dynamic>> features) async {
    final controller = _controller;
    if (controller == null) return;
    final payload = jsonEncode({'type': 'FeatureCollection', 'features': features});
    try {
      await controller.setGeoJsonSource(id, payload);
    } catch (_) {
      await controller.addSource(id, GeojsonSourceProperties(data: payload, cluster: id == 'perbug-places' && widget.config.enableClustering));
    }
  }

  Future<void> _ensurePerbugLayers() async {
    final controller = _controller;
    if (controller == null) return;

    try {
      await controller.addLayer(
        'perbug-districts',
        'perbug-district-layer',
        CircleLayerProperties(
          circleColor: '#6C5CE7',
          circleOpacity: 0.18,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 24],
        ),
      );
    } catch (_) {}

    try {
      await controller.addLayer(
        'perbug-places',
        'perbug-place-layer',
        CircleLayerProperties(
          circleColor: [
            'case',
            ['==', ['get', 'selected'], 1],
            '#5E72FF',
            ['==', ['get', 'sponsored'], 1],
            '#FFC857',
            ['==', ['get', 'quest'], 1],
            '#31D0AA',
            '#FC5C65'
          ],
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: ['case', ['==', ['get', 'selected'], 1], 3, 1.5],
          circleOpacity: 0.92,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 13],
        ),
      );
      await controller.addLayer(
        'perbug-places',
        'perbug-place-label-layer',
        SymbolLayerProperties(
          textField: ['get', 'name'],
          textSize: ['interpolate', ['linear'], ['zoom'], 12, 9, 15, 12],
          textColor: '#EAF0FF',
          textHaloColor: '#101828',
          textHaloWidth: 1.2,
          textOffset: const [0, 1.4],
          textAllowOverlap: false,
          textOptional: true,
        ),
      );
    } catch (_) {}

    try {
      await controller.addLayer(
        'perbug-user',
        'perbug-user-layer',
        CircleLayerProperties(
          circleColor: '#3B82F6',
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 2,
          circleRadius: 7,
          circleOpacity: 0.95,
        ),
      );
    } catch (_) {}
  }
}
