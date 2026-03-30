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

enum ChunkVisibilityState { visible, culled }
enum WorldChunkGenerationStatus { generated, placeholder }

class WorldChunkCoord {
  const WorldChunkCoord({required this.x, required this.y});

  final int x;
  final int y;

  @override
  bool operator ==(Object other) => other is WorldChunkCoord && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);

  @override
  String toString() => '$x:$y';
}

class WorldChunkBounds {
  const WorldChunkBounds({
    required this.minLng,
    required this.maxLng,
    required this.minLat,
    required this.maxLat,
  });

  final double minLng;
  final double maxLng;
  final double minLat;
  final double maxLat;

  bool intersects(WorldChunkBounds other) {
    return minLng <= other.maxLng &&
        maxLng >= other.minLng &&
        minLat <= other.maxLat &&
        maxLat >= other.minLat;
  }
}

class WorldChunkId {
  const WorldChunkId(this.value);

  final String value;

  @override
  bool operator ==(Object other) => other is WorldChunkId && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value;
}

class WorldChunk {
  const WorldChunk({
    required this.id,
    required this.coord,
    required this.bounds,
    required this.nodes,
    required this.visibility,
    required this.dirty,
    required this.generationStatus,
  });

  final WorldChunkId id;
  final WorldChunkCoord coord;
  final WorldChunkBounds bounds;
  final List<PerbugNode> nodes;
  final ChunkVisibilityState visibility;
  final bool dirty;
  final WorldChunkGenerationStatus generationStatus;

  bool get isVisible => visibility == ChunkVisibilityState.visible;

  WorldChunk copyWith({
    ChunkVisibilityState? visibility,
    bool? dirty,
  }) {
    return WorldChunk(
      id: id,
      coord: coord,
      bounds: bounds,
      nodes: nodes,
      visibility: visibility ?? this.visibility,
      dirty: dirty ?? this.dirty,
      generationStatus: generationStatus,
    );
  }
}

class PerbugWorldMapSnapshot {
  const PerbugWorldMapSnapshot({
    required this.chunks,
    required this.visibleChunkIds,
    required this.connections,
    required this.terrainBands,
    required this.regionTheme,
    required this.debug,
  });

  final List<WorldChunk> chunks;
  final Set<WorldChunkId> visibleChunkIds;
  final List<({PerbugNode from, PerbugNode to})> connections;
  final List<PerbugTerrainBand> terrainBands;
  final PerbugRegionTheme regionTheme;
  final Map<String, Object> debug;

  List<WorldChunk> get visibleChunks => chunks.where((chunk) => visibleChunkIds.contains(chunk.id)).toList(growable: false);

  List<PerbugNode> get visibleNodes => [for (final chunk in visibleChunks) ...chunk.nodes];
}

class PerbugChunkGrid {
  const PerbugChunkGrid({
    this.chunkLatSize = 0.08,
    this.chunkLngSize = 0.08,
    this.prefetchMarginChunks = 1,
  });

  final double chunkLatSize;
  final double chunkLngSize;
  final int prefetchMarginChunks;

  WorldChunkCoord worldPositionToChunkCoord({required double lat, required double lng}) {
    return WorldChunkCoord(
      x: (lng / chunkLngSize).floor(),
      y: (lat / chunkLatSize).floor(),
    );
  }

  WorldChunkBounds chunkCoordToBounds(WorldChunkCoord coord) {
    final minLng = coord.x * chunkLngSize;
    final maxLng = minLng + chunkLngSize;
    final minLat = coord.y * chunkLatSize;
    final maxLat = minLat + chunkLatSize;
    return WorldChunkBounds(minLng: minLng, maxLng: maxLng, minLat: minLat, maxLat: maxLat);
  }

  WorldChunkId chunkCoordToId(WorldChunkCoord coord) => WorldChunkId('chunk_${coord.x}_${coord.y}');

  WorldChunkBounds viewportToWorldBounds(MapViewport viewport, {bool includePrefetch = true}) {
    final padLng = includePrefetch ? (prefetchMarginChunks * chunkLngSize) : 0.0;
    final padLat = includePrefetch ? (prefetchMarginChunks * chunkLatSize) : 0.0;
    return WorldChunkBounds(
      minLng: viewport.west - padLng,
      maxLng: viewport.east + padLng,
      minLat: viewport.south - padLat,
      maxLat: viewport.north + padLat,
    );
  }

  ({int minX, int maxX, int minY, int maxY}) worldBoundsToChunkRange(WorldChunkBounds bounds) {
    final minX = (bounds.minLng / chunkLngSize).floor();
    final maxX = (bounds.maxLng / chunkLngSize).floor();
    final minY = (bounds.minLat / chunkLatSize).floor();
    final maxY = (bounds.maxLat / chunkLatSize).floor();
    return (minX: minX, maxX: maxX, minY: minY, maxY: maxY);
  }
}

class PerbugWorldMapEngine {
  const PerbugWorldMapEngine({this.chunkGrid = const PerbugChunkGrid()});

  final PerbugChunkGrid chunkGrid;

  PerbugWorldMapSnapshot build({
    required MapViewport viewport,
    required List<PerbugNode> nodes,
    required Map<String, Set<String>> graph,
  }) {
    final chunksByCoord = <WorldChunkCoord, List<PerbugNode>>{};
    for (final node in nodes) {
      final coord = chunkGrid.worldPositionToChunkCoord(lat: node.latitude, lng: node.longitude);
      chunksByCoord.putIfAbsent(coord, () => <PerbugNode>[]).add(node);
    }

    final visibleBounds = chunkGrid.viewportToWorldBounds(viewport);
    final chunkRange = chunkGrid.worldBoundsToChunkRange(visibleBounds);
    final visibleCoordSet = <WorldChunkCoord>{
      for (var x = chunkRange.minX; x <= chunkRange.maxX; x++)
        for (var y = chunkRange.minY; y <= chunkRange.maxY; y++) WorldChunkCoord(x: x, y: y),
    };

    final chunks = <WorldChunk>[];
    final visibleChunkIds = <WorldChunkId>{};
    final sortedCoords = chunksByCoord.keys.toList(growable: false)
      ..sort((a, b) {
        final byY = a.y.compareTo(b.y);
        if (byY != 0) return byY;
        return a.x.compareTo(b.x);
      });

    for (final coord in sortedCoords) {
      final id = chunkGrid.chunkCoordToId(coord);
      final bounds = chunkGrid.chunkCoordToBounds(coord);
      final nodeList = (chunksByCoord[coord]!..sort((a, b) => a.id.compareTo(b.id)));
      final intersects = visibleCoordSet.contains(coord) && bounds.intersects(visibleBounds);
      final visibility = intersects ? ChunkVisibilityState.visible : ChunkVisibilityState.culled;
      if (intersects) visibleChunkIds.add(id);
      chunks.add(
        WorldChunk(
          id: id,
          coord: coord,
          bounds: bounds,
          nodes: List<PerbugNode>.unmodifiable(nodeList),
          visibility: visibility,
          dirty: false,
          generationStatus: WorldChunkGenerationStatus.generated,
        ),
      );
    }

    final visibleNodeIds = {
      for (final chunk in chunks)
        if (visibleChunkIds.contains(chunk.id)) ...chunk.nodes.map((node) => node.id),
    };

    final edges = <({PerbugNode from, PerbugNode to})>[];
    final byId = {for (final node in nodes) node.id: node};
    for (final node in nodes) {
      if (!visibleNodeIds.contains(node.id)) continue;
      final neighbors = graph[node.id] ?? const <String>{};
      for (final neighborId in neighbors) {
        if (!visibleNodeIds.contains(neighborId) || node.id.compareTo(neighborId) >= 0) continue;
        final neighbor = byId[neighborId];
        if (neighbor == null) continue;
        edges.add((from: node, to: neighbor));
      }
    }

    final visibleNodes = [for (final chunk in chunks) if (visibleChunkIds.contains(chunk.id)) ...chunk.nodes];
    final terrainBands = _terrainForViewport(viewport: viewport, nodes: visibleNodes);
    final theme = _deriveTheme(viewport: viewport, nodes: visibleNodes);
    final seed = ((viewport.centerLat * 10000).round() * 31) ^ (viewport.centerLng * 10000).round() ^ nodes.length;

    return PerbugWorldMapSnapshot(
      chunks: List<WorldChunk>.unmodifiable(chunks),
      visibleChunkIds: Set<WorldChunkId>.unmodifiable(visibleChunkIds),
      connections: edges,
      terrainBands: terrainBands,
      regionTheme: theme,
      debug: {
        'projection': 'equirectangular_runtime',
        'seed': seed,
        'chunk_lat_size': chunkGrid.chunkLatSize,
        'chunk_lng_size': chunkGrid.chunkLngSize,
        'chunk_prefetch_margin': chunkGrid.prefetchMarginChunks,
        'total_chunks': chunks.length,
        'visible_chunks': visibleChunkIds.length,
        'total_nodes': nodes.length,
        'visible_nodes': visibleNodes.length,
        'culled_nodes': nodes.length - visibleNodes.length,
        'chunk_range_x': '${chunkRange.minX}:${chunkRange.maxX}',
        'chunk_range_y': '${chunkRange.minY}:${chunkRange.maxY}',
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
    final rareDensity = nodes.where((n) => n.nodeType == PerbugNodeType.rare || n.nodeType == PerbugNodeType.event).length /
        math.max(1, nodes.length);

    final seed = ((viewport.centerLat * 10000).round() * 31) ^ (viewport.centerLng * 10000).round();
    final noise = (math.sin(seed * 0.0003) + 1) / 2;

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
}
