import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:maplibre_gl/maplibre_gl.dart';

import '../../core/env/env.dart';
import '../../core/logging/log.dart';
import 'map_discovery_models.dart';
import 'map_game_world.dart';
import 'perbug_map_theme.dart';

class DryadMapLibreView extends StatefulWidget {
  const DryadMapLibreView({
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

  @override
  State<DryadMapLibreView> createState() => _DryadMapLibreViewState();
}

class _DryadMapLibreViewState extends State<DryadMapLibreView> {
  static const double _minPerspectiveTilt = 24;
  static const double _maxPerspectiveTilt = 78;
  static const double _dragTiltSensitivity = 0.24;

  MapLibreMapController? _controller;
  CameraPosition? _lastCamera;
  bool _styleLoaded = false;
  bool _forceBuiltinStyle = false;
  bool _hasLoggedContainerSize = false;
  bool _reportedWebMapLibMissing = false;
  VoidCallback? _cameraListener;
  Timer? _styleFallbackTimer;
  Timer? _styleLoadTimeoutTimer;
  double? _manualTilt;
  int _styleLoadCycle = 0;

  DryadMapTheme get _theme => DryadMapTheme.resolve(brightness: Theme.of(context).brightness, config: widget.config);
  String get _resolvedStyleString => _forceBuiltinStyle ? _builtinRasterStyleJson : _theme.styleUrl;
  String get _stylePreview {
    final value = _resolvedStyleString;
    final end = value.length > 160 ? 160 : value.length;
    return value.substring(0, end);
  }

  @override
  void didUpdateWidget(covariant DryadMapLibreView oldWidget) {
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
        oldWidget.collectionPlaceIds != widget.collectionPlaceIds) {
      _syncMapData();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      _reportWebMapUnavailableOnce();
      return _WebMapUnavailablePlaceholder(
        onTapRetry: () {
          setState(() {
            _reportedWebMapLibMissing = false;
          });
          _reportWebMapUnavailableOnce();
        },
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
            onMapClick: (_, __) => widget.onTapEmpty(),
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

  void _reportWebMapUnavailableOnce() {
    if (_reportedWebMapLibMissing) return;
    _reportedWebMapLibMissing = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.onMapLoadError(
        'Map rendering is unavailable on web because the MapLibre JS runtime is not loaded (missing global `maplibregl`).',
      );
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

  Future<void> _add3dBuildingLayers(DryadMapTheme mapTheme) async {
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
          'dryad-3d-buildings',
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
          'dryad-3d-building-roofs',
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

    await _upsertGeoJsonSource('dryad-places', placeFeatures);
    await _upsertGeoJsonSource('dryad-districts', districtFeatures);
    await _upsertGeoJsonSource('dryad-user', userFeatures);

    await _ensureDryadLayers();

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
            cluster: id == 'dryad-places' && widget.config.enableClustering,
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

  Future<void> _ensureDryadLayers() async {
    final controller = _controller;
    if (controller == null) return;
    final mapTheme = _theme;

    try {
      await controller.addLayer(
        'dryad-districts',
        'dryad-district-halo-layer',
        CircleLayerProperties(
          circleColor: mapTheme.overlay.district,
          circleOpacity: ['interpolate', ['linear'], ['zoom'], 9, 0.08, 14, 0.18],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 18, 14, 44],
          circleBlur: 0.6,
        ),
      );
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer dryad-district-halo-layer skipped error=$error');
    }

    try {
      await controller.addLayer(
        'dryad-districts',
        'dryad-district-core-layer',
        CircleLayerProperties(
          circleColor: mapTheme.overlay.districtEdge,
          circleOpacity: ['interpolate', ['linear'], ['zoom'], 9, 0.2, 14, 0.35],
          circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 6, 14, 16],
        ),
      );
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer dryad-district-core-layer skipped error=$error');
    }

    try {
      await controller.addLayer(
        'dryad-places',
        'dryad-cluster-halo-layer',
        CircleLayerProperties(
          circleColor: mapTheme.marker.cluster,
          circleOpacity: 0.25,
          circleBlur: 0.4,
          circleRadius: ['interpolate', ['linear'], ['get', 'point_count'], 2, 18, 12, 26, 36, 34],
        ),
        filter: ['has', 'point_count'],
      );
      await controller.addLayer(
        'dryad-places',
        'dryad-cluster-layer',
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
        'dryad-places',
        'dryad-cluster-count-layer',
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
        'dryad-places',
        'dryad-place-selection-halo-layer',
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
        'dryad-places',
        'dryad-place-focus-ring-layer',
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
        'dryad-places',
        'dryad-place-layer',
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
        'dryad-places',
        'dryad-place-label-layer',
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
        'dryad-user',
        'dryad-user-halo-layer',
        CircleLayerProperties(
          circleColor: mapTheme.marker.user,
          circleOpacity: 0.22,
          circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 13, 16, 20],
          circleBlur: 0.45,
        ),
      );
      await controller.addLayer(
        'dryad-user',
        'dryad-user-layer',
        CircleLayerProperties(
          circleColor: mapTheme.marker.user,
          circleStrokeColor: mapTheme.marker.outline,
          circleStrokeWidth: 2,
          circleRadius: 7.4,
          circleOpacity: 0.98,
        ),
      );
    } catch (error) {
      if (widget.config.enableDiagnostics) Log.warn('map.layer dryad-user layers skipped error=$error');
    }
  }
}

class _WebMapUnavailablePlaceholder extends StatelessWidget {
  const _WebMapUnavailablePlaceholder({required this.onTapRetry});

  final VoidCallback onTapRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ColoredBox(
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.map_outlined, size: 42, color: theme.colorScheme.primary),
                const SizedBox(height: 12),
                Text(
                  'Map unavailable on web',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'The MapLibre JavaScript runtime is missing in this build, so the live map cannot be rendered right now.',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: onTapRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
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
