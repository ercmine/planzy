import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart' as latlng;
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/env/env.dart';
import '../../core/logging/log.dart';
import 'map_discovery_models.dart';
import 'map_game_world.dart';
import 'perbug_game_models.dart';
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
    required this.onMapLoadStarted,
    required this.onMapReady,
    required this.onMapLoadError,
    required this.onViewportChanged,
    required this.onTapEmpty,
    required this.onLongPress,
    required this.onPlaceSelected,
    this.tacticalNodes = const <PerbugNode>[],
    this.tacticalConnections = const <String, Set<String>>{},
    this.currentNodeId,
    this.selectedNodeId,
    this.reachableNodeIds = const <String>{},
    this.completedNodeIds = const <String>{},
    this.onNodeSelected,
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
  final VoidCallback onMapLoadStarted;
  final VoidCallback onMapReady;
  final void Function(String message) onMapLoadError;
  final void Function(MapViewport viewport, {required bool hasGesture}) onViewportChanged;
  final VoidCallback onTapEmpty;
  final void Function(double lat, double lng) onLongPress;
  final void Function(String placeId) onPlaceSelected;
  final List<PerbugNode> tacticalNodes;
  final Map<String, Set<String>> tacticalConnections;
  final String? currentNodeId;
  final String? selectedNodeId;
  final Set<String> reachableNodeIds;
  final Set<String> completedNodeIds;
  final void Function(String nodeId)? onNodeSelected;

  @override
  State<PerbugMapLibreView> createState() => _PerbugMapLibreViewState();
}

class _PerbugMapLibreViewState extends State<PerbugMapLibreView> {
  static const double _minPerspectiveTilt = 24;
  static const double _maxPerspectiveTilt = 78;
  static const double _dragTiltSensitivity = 0.24;

  MapLibreMapController? _controller;
  CameraPosition? _lastCamera;
  bool _styleLoaded = false;
  bool _forceBuiltinStyle = false;
  bool _hasLoggedContainerSize = false;
  bool _reportedWebFallbackActive = false;
  VoidCallback? _cameraListener;
  Timer? _styleFallbackTimer;
  Timer? _styleLoadTimeoutTimer;
  double? _manualTilt;
  int _styleLoadCycle = 0;

  PerbugMapTheme get _theme => PerbugMapTheme.resolve(brightness: Theme.of(context).brightness, config: widget.config);
  String get _resolvedStyleString => _forceBuiltinStyle ? _builtinRasterStyleJson : _theme.styleUrl;
  String get _stylePreview {
    final value = _resolvedStyleString;
    final end = value.length > 160 ? 160 : value.length;
    return value.substring(0, end);
  }

  @override
  void didUpdateWidget(covariant PerbugMapLibreView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.is3dMode && oldWidget.is3dMode) {
      _manualTilt = null;
    }
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
        oldWidget.collectionPlaceIds != widget.collectionPlaceIds ||
        oldWidget.tacticalNodes != widget.tacticalNodes ||
        oldWidget.currentNodeId != widget.currentNodeId ||
        oldWidget.selectedNodeId != widget.selectedNodeId ||
        oldWidget.reachableNodeIds != widget.reachableNodeIds ||
        oldWidget.completedNodeIds != widget.completedNodeIds ||
        oldWidget.tacticalConnections != widget.tacticalConnections) {
      _syncMapData();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      _reportWebFallbackReadyOnce();
      return _WebStaticFallbackMap(
        viewport: widget.viewport,
        pins: widget.pins,
        selectedPlaceId: widget.selectedPlaceId,
        userLocation: widget.userLocation,
        tacticalNodes: widget.tacticalNodes,
        currentNodeId: widget.currentNodeId,
        selectedNodeId: widget.selectedNodeId,
        reachableNodeIds: widget.reachableNodeIds,
        onTapEmpty: widget.onTapEmpty,
        onNodeSelected: widget.onNodeSelected,
        onViewportChanged: widget.onViewportChanged,
        onPlaceSelected: widget.onPlaceSelected,
      );
    }
    if (widget.config.enableDiagnostics) {
      Log.d('map.lifecycle build style=$_stylePreview cycle=$_styleLoadCycle forceBuiltin=$_forceBuiltinStyle');
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        _logContainerSizeOnce(constraints);
        return Stack(
          children: [
            Positioned.fill(
              child: MapLibreMap(
            key: ValueKey<String>(_resolvedStyleString),
            styleString: _resolvedStyleString,
            initialCameraPosition: _cameraPositionForState(),
            // maplibre_gl 0.21.x exposes camera updates through the controller
            // listener API instead of a Map widget `onCameraMove` callback.
            trackCameraPosition: true,
            compassEnabled: false,
            zoomGesturesEnabled: true,
            scrollGesturesEnabled: true,
            rotateGesturesEnabled: true,
            tiltGesturesEnabled: widget.config.enableEnhancedPitch,
            myLocationEnabled: false,
            onMapCreated: (controller) {
              final nextCycle = _styleLoadCycle + 1;
              _styleLoadCycle = nextCycle;
              if (widget.config.enableDiagnostics) {
                Log.d('map.lifecycle onMapCreated cycle=$nextCycle style=${_theme.styleUrl} fallbackActive=$_forceBuiltinStyle');
              }
              final previousListener = _cameraListener;
              if (previousListener != null) {
                _controller?.removeListener(previousListener);
              }
              _controller = controller;
              _cameraListener = () => _lastCamera = controller.cameraPosition;
              controller.addListener(_cameraListener!);
              _styleLoaded = false;
              widget.onMapLoadStarted();
              _scheduleWebStyleFallback();
              _startStyleLoadTimeout(cycle: nextCycle);
            },
            onStyleLoadedCallback: () async {
              _styleFallbackTimer?.cancel();
              _styleLoadTimeoutTimer?.cancel();
              _styleLoaded = true;
              if (widget.config.enableDiagnostics) {
                Log.d('map.style loaded style=$_stylePreview');
              }
              widget.onMapReady();
              await _applyStyleEnhancements();
              await _syncMapData();
            },
            onMapClick: (_, point) => _handleMapClick(point),
            onMapLongClick: (_, point) => widget.onLongPress(point.latitude, point.longitude),
            onCameraIdle: () {
              final camera = _lastCamera;
              if (camera == null) return;
              final hasSelection = widget.selectedPlaceId != null;
              final zoomBoost = hasSelection ? _theme.camera.selectedZoomBoost : _theme.camera.idleZoomBoost;
              final normalizedZoom = ((camera.zoom ?? widget.viewport.zoom) - zoomBoost).clamp(0.0, 22.0).toDouble();
              widget.onViewportChanged(
                MapViewport(centerLat: camera.target.latitude, centerLng: camera.target.longitude, zoom: normalizedZoom),
                hasGesture: true,
              );
            },
            onCameraTrackingChanged: (_) {},
              ),
            ),
            if (_showPerspectiveHandle)
              Positioned(
                right: 12,
                top: 84,
                bottom: 164,
                child: _PerspectiveDragHandle(
                  tilt: _resolvedTilt(),
                  minTilt: _minPerspectiveTilt,
                  maxTilt: _maxPerspectiveTilt,
                  onDrag: _applyPerspectiveDrag,
                  onReset: _resetPerspective,
                ),
              ),
          ],
        );
      },
    );
  }

  void _reportWebFallbackReadyOnce() {
    if (_reportedWebFallbackActive) return;
    _reportedWebFallbackActive = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onMapLoadStarted();
      widget.onMapReady();
    });
  }

  @override
  void dispose() {
    _styleFallbackTimer?.cancel();
    _styleLoadTimeoutTimer?.cancel();
    final listener = _cameraListener;
    if (listener != null) {
      _controller?.removeListener(listener);
    }
    super.dispose();
  }

  void _startStyleLoadTimeout({required int cycle}) {
    _styleLoadTimeoutTimer?.cancel();
    _styleLoadTimeoutTimer = Timer(const Duration(seconds: 12), () {
      if (!mounted || _styleLoaded || cycle != _styleLoadCycle) return;
      final message = 'Map style load timed out after 12s (style=$_stylePreview, fallback=$_forceBuiltinStyle).';
      Log.error('map.style timeout cycle=$cycle style=$_stylePreview fallback=$_forceBuiltinStyle');
      widget.onMapLoadError(message);
    });
  }

  CameraPosition _cameraPositionForState() {
    final camera = _theme.camera;
    final hasSelection = widget.selectedPlaceId != null;
    final canPitch = widget.is3dMode && widget.config.enableEnhancedPitch;
    return CameraPosition(
      target: LatLng(widget.viewport.centerLat, widget.viewport.centerLng),
      zoom: widget.viewport.zoom + (hasSelection ? camera.selectedZoomBoost : camera.idleZoomBoost),
      tilt: canPitch ? _resolvedTilt(hasSelection: hasSelection) : 20,
      bearing: canPitch ? (hasSelection ? camera.selectedBearing : camera.idleBearing) : 0,
    );
  }

  bool get _showPerspectiveHandle => widget.is3dMode && widget.config.enableEnhancedPitch;

  double _resolvedTilt({bool? hasSelection}) {
    final selected = hasSelection ?? (widget.selectedPlaceId != null);
    final defaultTilt = selected ? _theme.camera.selectedTilt : _theme.camera.idleTilt;
    return (_manualTilt ?? defaultTilt).clamp(_minPerspectiveTilt, _maxPerspectiveTilt).toDouble();
  }

  void _applyPerspectiveDrag(double dragDeltaDy) {
    if (!_showPerspectiveHandle) return;
    final hasSelection = widget.selectedPlaceId != null;
    final nextTilt = (_resolvedTilt(hasSelection: hasSelection) + (-dragDeltaDy * _dragTiltSensitivity))
        .clamp(_minPerspectiveTilt, _maxPerspectiveTilt)
        .toDouble();
    if ((_manualTilt ?? -1) == nextTilt) return;
    setState(() => _manualTilt = nextTilt);
    final controller = _controller;
    if (controller == null) return;
    final current = _cameraPositionForState();
    controller.moveCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(
          target: current.target,
          zoom: current.zoom,
          tilt: nextTilt,
          bearing: current.bearing,
        ),
      ),
    );
  }

  void _resetPerspective() {
    if (_manualTilt == null) return;
    setState(() => _manualTilt = null);
    final controller = _controller;
    if (controller == null) return;
    controller.animateCamera(CameraUpdate.newCameraPosition(_cameraPositionForState()));
  }

  void _scheduleWebStyleFallback() {
    _styleFallbackTimer?.cancel();
    _probeStyleUrlInBackground();
    if (_forceBuiltinStyle) return;
    _styleFallbackTimer?.cancel();
    _styleFallbackTimer = Timer(const Duration(seconds: 4), () {
      if (!mounted || _styleLoaded || _forceBuiltinStyle) return;
      Log.warn('map.style timeout waiting for style load; falling back to built-in raster style');
      setState(() => _forceBuiltinStyle = true);
    });
  }

  void _logContainerSizeOnce(BoxConstraints constraints) {
    if (_hasLoggedContainerSize || !widget.config.enableDiagnostics) return;
    _hasLoggedContainerSize = true;
    Log.d('map.layout maxWidth=${constraints.maxWidth} maxHeight=${constraints.maxHeight} hasBounded=${constraints.hasBoundedHeight && constraints.hasBoundedWidth}');
  }

  Future<void> _probeStyleUrlInBackground() async {
    if (_forceBuiltinStyle) return;
    final style = _theme.styleUrl;
    if (style.trimLeft().startsWith('{')) return;
    final uri = Uri.tryParse(style);
    if (uri == null || !uri.hasScheme) return;

    try {
      final response = await http.get(uri).timeout(const Duration(seconds: 3));
      if (response.statusCode >= 400) {
        Log.warn('map.style preflight failed status=${response.statusCode} url=$style');
        if (mounted && !_styleLoaded && !_forceBuiltinStyle) {
          setState(() => _forceBuiltinStyle = true);
        }
      } else if (widget.config.enableDiagnostics) {
        Log.d('map.style preflight ok status=${response.statusCode} url=$style');
      }
    } catch (error, stackTrace) {
      Log.warn('map.style preflight exception url=$style error=$error');
      if (widget.config.enableDiagnostics) {
        Log.error('map.style preflight stacktrace', error: error, stackTrace: stackTrace);
      }
      if (mounted && !_styleLoaded && !_forceBuiltinStyle) {
        setState(() => _forceBuiltinStyle = true);
      }
    }
  }

  String get _builtinRasterStyleJson => jsonEncode({
        'version': 8,
        'name': 'Perbug Web Fallback',
        'sources': {
          'openstreetmap': {
            'type': 'raster',
            'tiles': ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            'tileSize': 256,
            'attribution': '© OpenStreetMap contributors',
            'maxzoom': 19,
          },
        },
        'layers': [
          {
            'id': 'openstreetmap-raster',
            'type': 'raster',
            'source': 'openstreetmap',
          },
        ],
      });

  Future<void> _applyStyleEnhancements() async {
    final controller = _controller;
    if (controller == null) return;
    final mapTheme = _theme;
    if (widget.config.enableDiagnostics) {
      Log.d('map.style loading style=$_stylePreview 3d=${widget.config.enable3dBuildings}');
    }

    if (widget.config.enable3dBuildings) {
      if (widget.config.enableDiagnostics) {
        Log.d('map.style 3d building layer add started');
      }
      await _add3dBuildingLayers(mapTheme);
    }

    if (widget.config.enableTerrain && widget.config.terrainSourceUrl != null && widget.config.terrainSourceUrl!.isNotEmpty) {
      // maplibre_gl 0.21.0 does not expose a Terrain API (`setTerrain` /
      // `TerrainSourceProperties`) on Flutter, so terrain must remain disabled.
      Log.warn(
        'map.style terrain requested but disabled: maplibre_gl 0.21.0 has no Flutter terrain API',
      );
    }
  }

  Future<void> _add3dBuildingLayers(PerbugMapTheme mapTheme) async {
    final controller = _controller;
    if (controller == null) return;

    final attempts = <({String sourceId, String sourceLayer})>[
      (sourceId: 'composite', sourceLayer: 'building'),
      (sourceId: 'openmaptiles', sourceLayer: 'building'),
      (sourceId: 'openfreemap', sourceLayer: 'building'),
      (sourceId: 'basemap', sourceLayer: 'building'),
    ];

    for (final attempt in attempts) {
      try {
        if (widget.config.enableDiagnostics) {
          Log.d('map.style 3d building source attempt started source=${attempt.sourceId} sourceLayer=${attempt.sourceLayer}');
        }
        await controller.addLayer(
          attempt.sourceId,
          'perbug-3d-buildings',
          FillExtrusionLayerProperties(
            fillExtrusionColor: mapTheme.building.wall,
            fillExtrusionOpacity: mapTheme.isDark ? 0.74 : 0.62,
            fillExtrusionHeight: [
              'interpolate',
              ['linear'],
              ['zoom'],
              12.8,
              0,
              15.8,
              ['coalesce', ['get', 'render_height'], ['get', 'height'], 14],
            ],
            fillExtrusionBase: [
              'interpolate',
              ['linear'],
              ['zoom'],
              12.8,
              0,
              15.8,
              ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
            ],
            fillExtrusionVerticalGradient: true,
          ),
          sourceLayer: attempt.sourceLayer,
          minzoom: 12.8,
          belowLayerId: 'waterway-label',
        );

        await controller.addLayer(
          attempt.sourceId,
          'perbug-3d-building-roofs',
          FillLayerProperties(
            fillColor: mapTheme.building.roof,
            fillOpacity: mapTheme.isDark ? 0.34 : 0.26,
            fillOutlineColor: mapTheme.building.edge,
          ),
          sourceLayer: attempt.sourceLayer,
          minzoom: 15.2,
          belowLayerId: 'waterway-label',
        );
        if (widget.config.enableDiagnostics) {
          Log.d('map.style 3d building layer add succeeded source=${attempt.sourceId} sourceLayer=${attempt.sourceLayer}');
        }
        return;
      } catch (error) {
        if (widget.config.enableDiagnostics) {
          Log.warn('map.style 3d building layer add failed source=${attempt.sourceId} layer=${attempt.sourceLayer} error=$error');
        }
      }
    }
    Log.warn('map.style unable to add 3d buildings for any known source id.');
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
    await _upsertGeoJsonSource('perbug-tactical-nodes', _tacticalNodeFeatures());
    await _upsertGeoJsonSource('perbug-tactical-links', _tacticalLinkFeatures());

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
      if (widget.config.enableDiagnostics) {
        Log.d('map.source base source upsert succeeded id=$id features=${features.length}');
      }
    } catch (setError) {
      if (widget.config.enableDiagnostics) {
        Log.warn('map.source set failed id=$id error=$setError; attempting addSource');
      }
      try {
        await controller.addSource(
          id,
          GeojsonSourceProperties(
            data: payload,
            cluster: id == 'perbug-places' && widget.config.enableClustering,
            clusterRadius: 58,
            clusterMaxZoom: 13,
          ),
        );
        if (widget.config.enableDiagnostics) {
          Log.d('map.source base source add succeeded id=$id features=${features.length}');
        }
      } catch (addError, stackTrace) {
        Log.error('map.source add failed id=$id', error: addError, stackTrace: stackTrace);
      }
    }
  }

  Future<void> _ensurePerbugLayers() async {
    final controller = _controller;
    if (controller == null) return;
    final mapTheme = _theme;

    try {
      await controller.addLayer(
        'perbug-tactical-links',
        'perbug-tactical-link-layer',
        LineLayerProperties(
          lineColor: mapTheme.overlay.focusRing,
          lineOpacity: 0.36,
          lineWidth: ['interpolate', ['linear'], ['zoom'], 11, 1.2, 15.5, 3.4],
        ),
      );
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer perbug-tactical-link-layer skipped error=$error');
    }

    try {
      await controller.addLayer(
        'perbug-tactical-nodes',
        'perbug-tactical-node-halo-layer',
        CircleLayerProperties(
          circleColor: [
            'case',
            ['==', ['get', 'is_current'], 1],
            '#7C3AED',
            ['==', ['get', 'is_selected'], 1],
            '#0EA5E9',
            ['==', ['get', 'is_reachable'], 1],
            '#22C55E',
            '#475569',
          ],
          circleOpacity: 0.24,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 8, 16, 18],
          circleBlur: 0.65,
        ),
      );
      await controller.addLayer(
        'perbug-tactical-nodes',
        'perbug-tactical-node-layer',
        CircleLayerProperties(
          circleColor: [
            'match',
            ['get', 'type'],
            'resource',
            '#22C55E',
            'mission',
            '#38BDF8',
            'shop',
            '#F97316',
            'rare',
            '#FACC15',
            'boss',
            '#EF4444',
            'rest',
            '#A78BFA',
            'event',
            '#EC4899',
            '#14B8A6',
          ],
          circleStrokeColor: [
            'case',
            ['==', ['get', 'is_selected'], 1],
            '#FFFFFF',
            ['==', ['get', 'is_current'], 1],
            '#E9D5FF',
            '#0F172A',
          ],
          circleStrokeWidth: ['case', ['==', ['get', 'is_selected'], 1], 3.1, 1.4],
          circleOpacity: ['case', ['==', ['get', 'is_reachable'], 1], 1.0, 0.76],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 11, 4.8, 15.8, 11.8],
        ),
      );
      await controller.addLayer(
        'perbug-tactical-nodes',
        'perbug-tactical-node-label-layer',
        SymbolLayerProperties(
          textField: ['get', 'label'],
          textSize: ['interpolate', ['linear'], ['zoom'], 11, 8, 15.8, 11],
          textColor: mapTheme.label.primary,
          textHaloColor: mapTheme.label.halo,
          textHaloWidth: 1.2,
          textOffset: const [0, 1.65],
          textAllowOverlap: false,
        ),
      );
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer perbug-tactical-node layers skipped error=$error');
    }

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
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer perbug-district-halo-layer skipped error=$error');
    }

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
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer perbug-district-core-layer skipped error=$error');
    }

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
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer cluster layers skipped error=$error');
    }

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
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer place layers skipped error=$error');
    }

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
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer perbug-user layers skipped error=$error');
    }
  }

  List<Map<String, dynamic>> _tacticalNodeFeatures() {
    return widget.tacticalNodes
        .map((node) => {
              'type': 'Feature',
              'geometry': {
                'type': 'Point',
                'coordinates': [node.longitude, node.latitude],
              },
              'properties': {
                'id': node.id,
                'label': node.label,
                'type': node.nodeType.name,
                'state': node.state.name,
                'is_current': node.id == widget.currentNodeId ? 1 : 0,
                'is_selected': node.id == widget.selectedNodeId ? 1 : 0,
                'is_reachable': widget.reachableNodeIds.contains(node.id) ? 1 : 0,
                'is_completed': widget.completedNodeIds.contains(node.id) ? 1 : 0,
              },
            })
        .toList(growable: false);
  }

  List<Map<String, dynamic>> _tacticalLinkFeatures() {
    final emitted = <String>{};
    final features = <Map<String, dynamic>>[];
    for (final node in widget.tacticalNodes) {
      final neighbors = widget.tacticalConnections[node.id] ?? const <String>{};
      for (final neighborId in neighbors) {
        final other = _nodeById(neighborId);
        if (other == null) continue;
        final key = node.id.compareTo(other.id) < 0 ? '${node.id}|${other.id}' : '${other.id}|${node.id}';
        if (!emitted.add(key)) continue;
        features.add({
          'type': 'Feature',
          'geometry': {
            'type': 'LineString',
            'coordinates': [
              [node.longitude, node.latitude],
              [other.longitude, other.latitude],
            ],
          },
          'properties': {'id': key},
        });
      }
    }
    return features;
  }

  PerbugNode? _nodeById(String id) {
    for (final node in widget.tacticalNodes) {
      if (node.id == id) return node;
    }
    return null;
  }

  void _handleMapClick(LatLng point) {
    if (widget.tacticalNodes.isNotEmpty) {
      final nearest = _nearestNode(point.latitude, point.longitude);
      if (nearest != null) {
        widget.onNodeSelected?.call(nearest.id);
        return;
      }
    }
    widget.onTapEmpty();
  }

  PerbugNode? _nearestNode(double lat, double lng) {
    PerbugNode? best;
    var bestDistance = double.infinity;
    for (final node in widget.tacticalNodes) {
      final d = haversineMeters(lat, lng, node.latitude, node.longitude);
      if (d < bestDistance) {
        bestDistance = d;
        best = node;
      }
    }
    if (bestDistance > 180) return null;
    return best;
  }
}

class _WebStaticFallbackMap extends StatelessWidget {
  const _WebStaticFallbackMap({
    required this.viewport,
    required this.pins,
    required this.selectedPlaceId,
    required this.userLocation,
    required this.tacticalNodes,
    required this.currentNodeId,
    required this.selectedNodeId,
    required this.reachableNodeIds,
    required this.onTapEmpty,
    required this.onNodeSelected,
    required this.onViewportChanged,
    required this.onPlaceSelected,
  });

  final MapViewport viewport;
  final List<MapPin> pins;
  final String? selectedPlaceId;
  final ({double lat, double lng})? userLocation;
  final List<PerbugNode> tacticalNodes;
  final String? currentNodeId;
  final String? selectedNodeId;
  final Set<String> reachableNodeIds;
  final VoidCallback onTapEmpty;
  final void Function(String nodeId)? onNodeSelected;
  final void Function(MapViewport viewport, {required bool hasGesture}) onViewportChanged;
  final void Function(String placeId) onPlaceSelected;

  String _fallbackStaticMapUrl() {
    final lat = viewport.centerLat.toStringAsFixed(6);
    final lng = viewport.centerLng.toStringAsFixed(6);
    final zoom = viewport.zoom.round().clamp(2, 18);
    final markerItems = <String>['$lat,$lng,red-pushpin'];
    if (userLocation != null) {
      markerItems.add(
        '${userLocation!.lat.toStringAsFixed(6)},${userLocation!.lng.toStringAsFixed(6)},blue-pushpin',
      );
    }
    final markerValue = markerItems.join('|');
    return Uri.https('staticmap.openstreetmap.de', '/staticmap.php', {
      'center': '$lat,$lng',
      'zoom': '$zoom',
      'size': '860x520',
      'markers': markerValue,
    }).toString();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final highlighted = pins.take(8).toList(growable: false);
    final interactiveNodes = tacticalNodes.take(24).toList(growable: false);
    return ColoredBox(
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.35),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Using fallback web map',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'MapLibre is unavailable in this web runtime. A lightweight OpenStreetMap fallback is active.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 10),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Positioned.fill(
                      child: Image.network(
                        _fallbackStaticMapUrl(),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => DecoratedBox(
                          decoration: BoxDecoration(
                            color: theme.colorScheme.surfaceContainerHighest,
                          ),
                          child: Center(
                            child: Text(
                              'Static map preview unavailable. Use chips below to navigate.',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodySmall,
                            ),
                          ),
                        ),
                      ),
                    ),
                    FlutterMap(
                      options: MapOptions(
                        initialCenter: latlng.LatLng(viewport.centerLat, viewport.centerLng),
                        initialZoom: viewport.zoom.clamp(5, 17),
                        interactionOptions: const InteractionOptions(flags: InteractiveFlag.all),
                        onTap: (_, __) => onTapEmpty(),
                        onPositionChanged: (position, hasGesture) {
                          final center = position.center;
                          if (center == null) return;
                          onViewportChanged(
                            MapViewport(centerLat: center.latitude, centerLng: center.longitude, zoom: position.zoom ?? viewport.zoom),
                            hasGesture: hasGesture,
                          );
                        },
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.perbug.app',
                        ),
                        MarkerLayer(
                          markers: [
                            if (userLocation != null)
                              Marker(
                                width: 28,
                                height: 28,
                                point: latlng.LatLng(userLocation!.lat, userLocation!.lng),
                                child: const Icon(Icons.my_location, color: Colors.lightBlueAccent),
                              ),
                            ...interactiveNodes.map((node) {
                              final isCurrent = node.id == currentNodeId;
                              final isSelected = node.id == selectedNodeId;
                              final reachable = reachableNodeIds.contains(node.id);
                              return Marker(
                                width: 34,
                                height: 34,
                                point: latlng.LatLng(node.latitude, node.longitude),
                                child: GestureDetector(
                                  onTap: () => onNodeSelected?.call(node.id),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 180),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isCurrent
                                          ? const Color(0xFF7C3AED)
                                          : reachable
                                              ? const Color(0xFF16A34A)
                                              : const Color(0xFF334155),
                                      border: Border.all(color: isSelected ? Colors.white : Colors.black54, width: isSelected ? 2.6 : 1),
                                    ),
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (userLocation != null)
                  OutlinedButton.icon(
                    onPressed: () => onViewportChanged(
                      MapViewport(centerLat: userLocation!.lat, centerLng: userLocation!.lng, zoom: viewport.zoom),
                      hasGesture: true,
                    ),
                    icon: const Icon(Icons.my_location),
                    label: const Text('Recenter to me'),
                  ),
                ...highlighted.map(
                  (pin) => ActionChip(
                    avatar: Icon(
                      pin.canonicalPlaceId == selectedPlaceId ? Icons.place : Icons.location_on_outlined,
                      size: 18,
                    ),
                    label: Text(pin.name, overflow: TextOverflow.ellipsis),
                    onPressed: () {
                      onPlaceSelected(pin.canonicalPlaceId);
                      onViewportChanged(
                        MapViewport(centerLat: pin.latitude, centerLng: pin.longitude, zoom: viewport.zoom),
                        hasGesture: true,
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PerspectiveDragHandle extends StatelessWidget {
  const _PerspectiveDragHandle({
    required this.tilt,
    required this.minTilt,
    required this.maxTilt,
    required this.onDrag,
    required this.onReset,
  });

  final double tilt;
  final double minTilt;
  final double maxTilt;
  final ValueChanged<double> onDrag;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = ((tilt - minTilt) / (maxTilt - minTilt)).clamp(0.0, 1.0);
    return GestureDetector(
      onVerticalDragUpdate: (details) => onDrag(details.delta.dy),
      onDoubleTap: onReset,
      child: Container(
        width: 52,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          color: theme.colorScheme.surface.withOpacity(0.75),
          border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.72)),
          boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 10, offset: Offset(0, 4))],
        ),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        child: Column(
          children: [
            Icon(Icons.view_in_ar_rounded, size: 18, color: theme.colorScheme.primary),
            const SizedBox(height: 8),
            Expanded(
              child: RotatedBox(
                quarterTurns: 3,
                child: LinearProgressIndicator(value: progress, minHeight: 6, borderRadius: BorderRadius.circular(999)),
              ),
            ),
            const SizedBox(height: 8),
            Text('3D', style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}
