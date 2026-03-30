import 'dart:math' as math;

import 'map_discovery_models.dart';
import 'perbug_game_models.dart';

class PerbugGeoPoint {
  const PerbugGeoPoint({required this.lat, required this.lng});

  final double lat;
  final double lng;
}

class PerbugMapPoint {
  const PerbugMapPoint({required this.x, required this.y});

  final double x;
  final double y;
}

class PerbugGeoProjection {
  const PerbugGeoProjection(this.viewport);

  final MapViewport viewport;

  double get _lngSpan => (viewport.east - viewport.west).abs().clamp(0.000001, 360).toDouble();
  double get _latSpan => (viewport.north - viewport.south).abs().clamp(0.000001, 180).toDouble();

  double _normalizeLng(double lng) {
    var value = lng;
    while (value < -180) value += 360;
    while (value > 180) value -= 360;
    return value;
  }

  PerbugMapPoint project(PerbugGeoPoint point) {
    final normalizedLng = _normalizeLng(point.lng);
    final west = _normalizeLng(viewport.west);
    final east = _normalizeLng(viewport.east);
    final wrappedLng = _wrapRelativeLng(normalizedLng, west, east);
    final x = (wrappedLng - west) / _lngSpan;
    final y = (viewport.north - point.lat) / _latSpan;
    return PerbugMapPoint(x: x.clamp(-1.0, 2.0), y: y.clamp(-1.0, 2.0));
  }

  double _wrapRelativeLng(double lng, double west, double east) {
    var value = lng;
    final spanCrossesDateline = east < west;
    if (spanCrossesDateline && value < west) value += 360;
    if (!spanCrossesDateline) {
      if (value < west - 180) value += 360;
      if (value > east + 180) value -= 360;
    }
    return value;
  }

  PerbugGeoPoint unproject(PerbugMapPoint point) {
    final lat = viewport.north - (_latSpan * point.y);
    final lng = viewport.west + (_lngSpan * point.x);
    return PerbugGeoPoint(lat: lat.clamp(-85.0, 85.0), lng: _normalizeLng(lng));
  }
}

class PerbugTerrainBand {
  const PerbugTerrainBand({
    required this.id,
    required this.seed,
    required this.latitudeBias,
    required this.wave,
  });

  final String id;
  final int seed;
  final double latitudeBias;
  final double wave;
}

class PerbugRegionTheme {
  const PerbugRegionTheme({
    required this.id,
    required this.title,
    required this.palette,
    required this.fogIntensity,
    required this.magicFlux,
    required this.biome,
  });

  final String id;
  final String title;
  final List<int> palette;
  final double fogIntensity;
  final double magicFlux;
  final String biome;
}

class PerbugWorldMapSnapshot {
  const PerbugWorldMapSnapshot({
    required this.visibleNodes,
    required this.connections,
    required this.terrainBands,
    required this.regionTheme,
    required this.debug,
  });

  final List<PerbugNode> visibleNodes;
  final List<({PerbugNode from, PerbugNode to})> connections;
  final List<PerbugTerrainBand> terrainBands;
  final PerbugRegionTheme regionTheme;
  final Map<String, Object> debug;
}

class PerbugWorldMapEngine {
  const PerbugWorldMapEngine();

  PerbugWorldMapSnapshot build({
    required MapViewport viewport,
    required List<PerbugNode> nodes,
    required Map<String, Set<String>> graph,
  }) {
    final visible = nodes.where((node) {
      return node.latitude >= viewport.south - viewport.latSpan * 0.7 &&
          node.latitude <= viewport.north + viewport.latSpan * 0.7 &&
          _lngDistance(node.longitude, viewport.centerLng).abs() <= viewport.lngSpan * 1.2;
    }).toList(growable: false);

    final visibleIds = visible.map((item) => item.id).toSet();
    final edges = <({PerbugNode from, PerbugNode to})>[];
    final byId = {for (final node in nodes) node.id: node};
    for (final node in visible) {
      final neighbors = graph[node.id] ?? const <String>{};
      for (final neighborId in neighbors) {
        if (!visibleIds.contains(neighborId) || node.id.compareTo(neighborId) >= 0) continue;
        final neighbor = byId[neighborId];
        if (neighbor == null) continue;
        edges.add((from: node, to: neighbor));
      }
    }

    final terrainBands = _terrainForViewport(viewport: viewport, nodes: visible);
    final theme = _deriveTheme(viewport: viewport, nodes: visible);

    return PerbugWorldMapSnapshot(
      visibleNodes: visible,
      connections: edges,
      terrainBands: terrainBands,
      regionTheme: theme,
      debug: {
        'projection': 'equirectangular_runtime',
        'nominatim_semantic_nodes': visible.where((node) => node.metadata['source'] == 'geo_nominatim').length,
        'visible_nodes': visible.length,
        'edges': edges.length,
        'zoom': viewport.zoom,
        'region_theme': theme.title,
        'biome': theme.biome,
      },
    );
  }

  List<PerbugTerrainBand> _terrainForViewport({required MapViewport viewport, required List<PerbugNode> nodes}) {
    final seed = (viewport.centerLat * 1000).round() ^ (viewport.centerLng * 1000).round() ^ nodes.length;
    final base = nodes.isEmpty ? 0.25 : (nodes.map((n) => n.rarityScore).reduce((a, b) => a + b) / nodes.length);
    return List<PerbugTerrainBand>.generate(4, (index) {
      final n = (math.sin((seed + index * 17) * 0.11) + 1) / 2;
      return PerbugTerrainBand(
        id: 'band_$index',
        seed: seed + index,
        latitudeBias: ((index - 1.5) * 0.14) + ((base - 0.5) * 0.2),
        wave: 0.04 + (n * 0.07),
      );
    }, growable: false);
  }

  PerbugRegionTheme _deriveTheme({required MapViewport viewport, required List<PerbugNode> nodes}) {
    final urbanDensity = nodes.where((n) => n.tags.contains('shop') || n.tags.contains('mission')).length / math.max(1, nodes.length);
    final natureDensity = nodes.where((n) => n.tags.contains('park') || n.tags.contains('resource')).length / math.max(1, nodes.length);
    final rareDensity = nodes.where((n) => n.nodeType == PerbugNodeType.rare || n.nodeType == PerbugNodeType.event).length / math.max(1, nodes.length);

    final seed = ((viewport.centerLat * 10000).round() * 31) ^ (viewport.centerLng * 10000).round();
    final noise = ((math.sin(seed * 0.0003) + 1) / 2);

    if (rareDensity > 0.22 || noise > 0.82) {
      return const PerbugRegionTheme(
        id: 'astral-rift',
        title: 'Astral Rift Frontier',
        palette: [0xFF261A4D, 0xFF433A7A, 0xFF35B8FF, 0xFFE4A8FF],
        fogIntensity: 0.34,
        magicFlux: 0.92,
        biome: 'rift',
      );
    }
    if (natureDensity >= urbanDensity) {
      return const PerbugRegionTheme(
        id: 'verdant-wilds',
        title: 'Verdant Wilds',
        palette: [0xFF0E2A2D, 0xFF1E6047, 0xFF4FAF7E, 0xFFD2F6B4],
        fogIntensity: 0.2,
        magicFlux: 0.64,
        biome: 'wilds',
      );
    }
    return const PerbugRegionTheme(
      id: 'clockwork-district',
      title: 'Clockwork District',
      palette: [0xFF13243F, 0xFF284A77, 0xFF6A7DC5, 0xFFF1C27D],
      fogIntensity: 0.16,
      magicFlux: 0.49,
      biome: 'urban',
    );
  }

  double _lngDistance(double from, double to) {
    var delta = from - to;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  }
}
