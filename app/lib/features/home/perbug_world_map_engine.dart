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
enum ChunkLifecycleState { uninitialized, queued, generating, ready, visible, coolingDown, evicted }
enum ChunkStreamingBand { visible, prefetch, retention, outside }
enum PerbugWorldRuntimeMode { demo, real }
enum WorldChunkEdge { north, south, east, west }

class WorldChunkEdgeProfile {
  const WorldChunkEdgeProfile({
    required this.edge,
    required this.terrainSamples,
    required this.biomeWeights,
    required this.nodeAffinity,
    required this.connectorFractions,
    required this.continuityFlags,
  });

  final WorldChunkEdge edge;
  final List<double> terrainSamples;
  final Map<String, double> biomeWeights;
  final double nodeAffinity;
  final List<double> connectorFractions;
  final List<String> continuityFlags;
}

class WorldChunkSeamProfile {
  const WorldChunkSeamProfile({
    required this.edges,
    required this.landmarkInfluence,
    required this.ambientBlend,
  });

  final Map<WorldChunkEdge, WorldChunkEdgeProfile> edges;
  final double landmarkInfluence;
  final double ambientBlend;
}

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
    return minLng <= other.maxLng && maxLng >= other.minLng && minLat <= other.maxLat && maxLat >= other.minLat;
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
    required this.lifecycle,
    required this.band,
    required this.generationOrder,
    required this.ambientProps,
    required this.localFlavor,
    required this.generatedAtTick,
    required this.lastTouchedTick,
    required this.seamProfile,
  });

  final WorldChunkId id;
  final WorldChunkCoord coord;
  final WorldChunkBounds bounds;
  final List<PerbugNode> nodes;
  final ChunkVisibilityState visibility;
  final bool dirty;
  final WorldChunkGenerationStatus generationStatus;
  final ChunkLifecycleState lifecycle;
  final ChunkStreamingBand band;
  final int generationOrder;
  final List<String> ambientProps;
  final String localFlavor;
  final int generatedAtTick;
  final int lastTouchedTick;
  final WorldChunkSeamProfile seamProfile;

  bool get isVisible => visibility == ChunkVisibilityState.visible;
  bool get isReady => lifecycle == ChunkLifecycleState.ready || lifecycle == ChunkLifecycleState.visible;
}

class PerbugWorldMapSnapshot {
  const PerbugWorldMapSnapshot({
    required this.chunks,
    required this.visibleChunkIds,
    required this.prefetchChunkIds,
    required this.retainedChunkIds,
    required this.pendingVisibleChunkIds,
    required this.connections,
    required this.terrainBands,
    required this.regionTheme,
    required this.debug,
  });

  final List<WorldChunk> chunks;
  final Set<WorldChunkId> visibleChunkIds;
  final Set<WorldChunkId> prefetchChunkIds;
  final Set<WorldChunkId> retainedChunkIds;
  final Set<WorldChunkId> pendingVisibleChunkIds;
  final List<({PerbugNode from, PerbugNode to})> connections;
  final List<PerbugTerrainBand> terrainBands;
  final PerbugRegionTheme regionTheme;
  final Map<String, Object> debug;

  List<WorldChunk> get visibleChunks =>
      chunks.where((chunk) => visibleChunkIds.contains(chunk.id) && chunk.isReady).toList(growable: false);

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

  WorldChunkBounds viewportToWorldBounds(MapViewport viewport, {int marginChunks = 0}) {
    final padLng = marginChunks * chunkLngSize;
    final padLat = marginChunks * chunkLatSize;
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

class PerbugChunkStreamingConfig {
  const PerbugChunkStreamingConfig({
    this.visibleMarginChunks = 0,
    this.prefetchMarginChunks = 1,
    this.retentionMarginChunks = 2,
    this.cooldownTicks = 4,
    this.generationBudgetPerTick = 8,
  });

  final int visibleMarginChunks;
  final int prefetchMarginChunks;
  final int retentionMarginChunks;
  final int cooldownTicks;
  final int generationBudgetPerTick;
}

class _ChunkRuntimeState {
  _ChunkRuntimeState({required this.id, required this.coord, required this.bounds});

  final WorldChunkId id;
  final WorldChunkCoord coord;
  final WorldChunkBounds bounds;
  ChunkLifecycleState lifecycle = ChunkLifecycleState.uninitialized;
  ChunkStreamingBand band = ChunkStreamingBand.outside;
  List<PerbugNode> nodes = const <PerbugNode>[];
  List<String> ambientProps = const <String>[];
  String localFlavor = 'unknown';
  int generationOrder = -1;
  int generatedAtTick = -1;
  int lastTouchedTick = -1;
  int generationMicros = 0;
  bool placeholder = true;
  WorldChunkSeamProfile seamProfile = const WorldChunkSeamProfile(
    edges: <WorldChunkEdge, WorldChunkEdgeProfile>{},
    landmarkInfluence: 0,
    ambientBlend: 0,
  );
}

class _PerbugWorldFieldSampler {
  const _PerbugWorldFieldSampler(this.seed);

  final int seed;

  double _noise(double x, double y, int channel) {
    final v = math.sin((x * 12.9898) + (y * 78.233) + (seed * 0.013) + (channel * 37.719));
    return (v + 1) / 2;
  }

  double terrainHeight({required double lat, required double lng}) {
    final low = _noise(lng * 0.7, lat * 0.7, 1);
    final mid = _noise(lng * 2.3, lat * 2.3, 2);
    final high = _noise(lng * 6.1, lat * 6.1, 3);
    return ((low * 0.55) + (mid * 0.3) + (high * 0.15)).clamp(0, 1).toDouble();
  }

  Map<String, double> biomeWeights({required double lat, required double lng}) {
    final urban = (_noise(lng * 0.45, lat * 0.45, 4) * 0.9).clamp(0, 1).toDouble();
    final wilds = (_noise(lng * 0.38, lat * 0.38, 5) * 0.95).clamp(0, 1).toDouble();
    final rift = (_noise(lng * 0.3, lat * 0.3, 6) * 0.85).clamp(0, 1).toDouble();
    final total = math.max(0.0001, urban + wilds + rift);
    return {'urban': urban / total, 'wilds': wilds / total, 'rift': rift / total};
  }

  double nodeDensity({required double lat, required double lng}) {
    final base = _noise(lng * 0.95, lat * 0.95, 7);
    final detail = _noise(lng * 2.9, lat * 2.9, 8);
    return ((base * 0.7) + (detail * 0.3)).clamp(0, 1).toDouble();
  }

  double landmarkInfluence({required double lat, required double lng}) {
    return _noise(lng * 0.2, lat * 0.2, 9);
  }

  double ambientBlend({required double lat, required double lng}) {
    return _noise(lng * 0.55, lat * 0.55, 10);
  }
}

class PerbugChunkStreamingCoordinator {
  PerbugChunkStreamingCoordinator({
    this.chunkGrid = const PerbugChunkGrid(),
    this.config = const PerbugChunkStreamingConfig(),
    this.worldSeed = 1337,
  }) : _sampler = _PerbugWorldFieldSampler(worldSeed);

  final PerbugChunkGrid chunkGrid;
  final PerbugChunkStreamingConfig config;
  final int worldSeed;
  final _PerbugWorldFieldSampler _sampler;

  final Map<WorldChunkCoord, _ChunkRuntimeState> _chunks = <WorldChunkCoord, _ChunkRuntimeState>{};
  int _tick = 0;
  int _generationCounter = 0;
  int _evictedCount = 0;

  void reset() {
    _chunks.clear();
    _tick = 0;
    _generationCounter = 0;
    _evictedCount = 0;
  }

  PerbugWorldMapSnapshot update({
    required MapViewport viewport,
    required List<PerbugNode> nodes,
    required Map<String, Set<String>> graph,
    required PerbugWorldRuntimeMode mode,
  }) {
    _tick += 1;
    final visibleBounds = chunkGrid.viewportToWorldBounds(viewport, marginChunks: config.visibleMarginChunks);
    final prefetchBounds = chunkGrid.viewportToWorldBounds(viewport, marginChunks: config.prefetchMarginChunks);
    final retentionBounds = chunkGrid.viewportToWorldBounds(viewport, marginChunks: config.retentionMarginChunks);

    final visibleSet = _coordsInBounds(visibleBounds);
    final prefetchSet = _coordsInBounds(prefetchBounds);
    final retentionSet = _coordsInBounds(retentionBounds);

    for (final coord in retentionSet) {
      _chunks.putIfAbsent(coord, () {
        final id = chunkGrid.chunkCoordToId(coord);
        return _ChunkRuntimeState(id: id, coord: coord, bounds: chunkGrid.chunkCoordToBounds(coord));
      });
    }

    for (final state in _chunks.values) {
      if (visibleSet.contains(state.coord)) {
        state.band = ChunkStreamingBand.visible;
        state.lastTouchedTick = _tick;
        if (state.isReady) {
          state.lifecycle = ChunkLifecycleState.visible;
        } else if (state.lifecycle == ChunkLifecycleState.uninitialized || state.lifecycle == ChunkLifecycleState.coolingDown) {
          state.lifecycle = ChunkLifecycleState.queued;
        }
      } else if (prefetchSet.contains(state.coord)) {
        state.band = ChunkStreamingBand.prefetch;
        state.lastTouchedTick = _tick;
        if (state.lifecycle == ChunkLifecycleState.visible) {
          state.lifecycle = ChunkLifecycleState.ready;
        }
        if (state.lifecycle == ChunkLifecycleState.uninitialized || state.lifecycle == ChunkLifecycleState.coolingDown) {
          state.lifecycle = ChunkLifecycleState.queued;
        }
      } else if (retentionSet.contains(state.coord)) {
        state.band = ChunkStreamingBand.retention;
        if (state.lifecycle == ChunkLifecycleState.visible) {
          state.lifecycle = ChunkLifecycleState.ready;
        }
      } else {
        state.band = ChunkStreamingBand.outside;
        if (state.lifecycle != ChunkLifecycleState.evicted) {
          state.lifecycle = ChunkLifecycleState.coolingDown;
        }
      }
    }

    final queue = _prioritizedQueuedChunks(viewport: viewport, visibleSet: visibleSet, prefetchSet: prefetchSet);
    final budget = math.max(config.generationBudgetPerTick, visibleSet.length);
    final nodeBuckets = _bucketNodesByCoord(nodes);
    final regionalContext = _deriveRegionalContext(viewport: viewport, nodes: nodes);
    for (var i = 0; i < queue.length && i < budget; i++) {
      final state = queue[i];
      _generateChunk(state: state, nodeBuckets: nodeBuckets, mode: mode, context: regionalContext);
    }

    final evictCoords = <WorldChunkCoord>[];
    for (final entry in _chunks.entries) {
      final state = entry.value;
      final staleTicks = _tick - state.lastTouchedTick;
      if (state.band == ChunkStreamingBand.outside && staleTicks >= config.cooldownTicks) {
        evictCoords.add(entry.key);
      }
    }
    for (final coord in evictCoords) {
      _chunks.remove(coord);
      _evictedCount += 1;
    }

    final chunks = _chunks.values.toList(growable: false)
      ..sort((a, b) {
        final byY = a.coord.y.compareTo(b.coord.y);
        if (byY != 0) return byY;
        return a.coord.x.compareTo(b.coord.x);
      });

    final visibleChunkIds = <WorldChunkId>{};
    final prefetchChunkIds = <WorldChunkId>{};
    final retainedChunkIds = <WorldChunkId>{};
    final pendingVisibleChunkIds = <WorldChunkId>{};
    for (final chunk in chunks) {
      if (chunk.band == ChunkStreamingBand.visible) {
        if (chunk.isReady) {
          visibleChunkIds.add(chunk.id);
        } else {
          pendingVisibleChunkIds.add(chunk.id);
        }
      } else if (chunk.band == ChunkStreamingBand.prefetch) {
        prefetchChunkIds.add(chunk.id);
      } else if (chunk.band == ChunkStreamingBand.retention) {
        retainedChunkIds.add(chunk.id);
      }
    }

    final worldChunks = chunks
        .map(
          (state) => WorldChunk(
            id: state.id,
            coord: state.coord,
            bounds: state.bounds,
            nodes: List<PerbugNode>.unmodifiable(state.nodes),
            visibility: state.band == ChunkStreamingBand.visible ? ChunkVisibilityState.visible : ChunkVisibilityState.culled,
            dirty: false,
            generationStatus: state.placeholder ? WorldChunkGenerationStatus.placeholder : WorldChunkGenerationStatus.generated,
            lifecycle: state.lifecycle,
            band: state.band,
            generationOrder: state.generationOrder,
            ambientProps: List<String>.unmodifiable(state.ambientProps),
            localFlavor: state.localFlavor,
            generatedAtTick: state.generatedAtTick,
            lastTouchedTick: state.lastTouchedTick,
            seamProfile: state.seamProfile,
          ),
        )
        .toList(growable: false);

    final byId = <String, PerbugNode>{for (final chunk in worldChunks) for (final n in chunk.nodes) n.id: n};
    final visibleNodeIds = {for (final chunk in worldChunks) if (visibleChunkIds.contains(chunk.id)) ...chunk.nodes.map((n) => n.id)};
    final edges = <({PerbugNode from, PerbugNode to})>[];
    for (final nodeId in visibleNodeIds) {
      final node = byId[nodeId];
      if (node == null) continue;
      for (final neighborId in graph[nodeId] ?? const <String>{}) {
        if (!visibleNodeIds.contains(neighborId) || node.id.compareTo(neighborId) >= 0) continue;
        final neighbor = byId[neighborId];
        if (neighbor == null) continue;
        edges.add((from: node, to: neighbor));
      }
    }
    edges.addAll(_connectorEdgesForVisibleNodes(worldChunks: worldChunks, visibleChunkIds: visibleChunkIds));

    final visibleNodes = [for (final chunk in worldChunks) if (visibleChunkIds.contains(chunk.id)) ...chunk.nodes];
    final terrainBands = _terrainForViewport(viewport: viewport, sampler: _sampler);
    final theme = _deriveTheme(viewport: viewport, nodes: visibleNodes, sampler: _sampler);
    final seamValidation = _validateVisibleChunkSeams(worldChunks: worldChunks, visibleChunkIds: visibleChunkIds);

    return PerbugWorldMapSnapshot(
      chunks: List<WorldChunk>.unmodifiable(worldChunks),
      visibleChunkIds: Set<WorldChunkId>.unmodifiable(visibleChunkIds),
      prefetchChunkIds: Set<WorldChunkId>.unmodifiable(prefetchChunkIds),
      retainedChunkIds: Set<WorldChunkId>.unmodifiable(retainedChunkIds),
      pendingVisibleChunkIds: Set<WorldChunkId>.unmodifiable(pendingVisibleChunkIds),
      connections: edges,
      terrainBands: terrainBands,
      regionTheme: theme,
      debug: {
        'seed': worldSeed,
        'mode': mode.name,
        'tick': _tick,
        'chunk_lat_size': chunkGrid.chunkLatSize,
        'chunk_lng_size': chunkGrid.chunkLngSize,
        'visible_margin': config.visibleMarginChunks,
        'prefetch_margin': config.prefetchMarginChunks,
        'retention_margin': config.retentionMarginChunks,
        'total_chunks': worldChunks.length,
        'visible_chunks': visibleChunkIds.length,
        'pending_visible_chunks': pendingVisibleChunkIds.length,
        'prefetch_chunks': prefetchChunkIds.length,
        'retained_chunks': retainedChunkIds.length,
        'ready_chunks': worldChunks.where((chunk) => chunk.isReady).length,
        'generating_chunks': worldChunks.where((chunk) => chunk.lifecycle == ChunkLifecycleState.generating).length,
        'queued_chunks': worldChunks.where((chunk) => chunk.lifecycle == ChunkLifecycleState.queued).length,
        'evicted_chunks': _evictedCount,
        'total_nodes': nodes.length,
        'visible_nodes': visibleNodes.length,
        'chunk_objects_peak': worldChunks.fold<int>(0, (maxValue, chunk) => math.max(maxValue, chunk.nodes.length + chunk.ambientProps.length)),
        'edges': edges.length,
        'region_theme': theme.title,
        'biome': theme.biome,
        'seam_warnings': seamValidation.warnings,
        'seam_checks': seamValidation.checks,
        'seam_warning_count': seamValidation.warnings.length,
      },
    );
  }

  Set<WorldChunkCoord> _coordsInBounds(WorldChunkBounds bounds) {
    final range = chunkGrid.worldBoundsToChunkRange(bounds);
    return <WorldChunkCoord>{
      for (var x = range.minX; x <= range.maxX; x++) for (var y = range.minY; y <= range.maxY; y++) WorldChunkCoord(x: x, y: y),
    };
  }

  List<_ChunkRuntimeState> _prioritizedQueuedChunks({
    required MapViewport viewport,
    required Set<WorldChunkCoord> visibleSet,
    required Set<WorldChunkCoord> prefetchSet,
  }) {
    final center = chunkGrid.worldPositionToChunkCoord(lat: viewport.centerLat, lng: viewport.centerLng);
    final queued = _chunks.values.where((chunk) => chunk.lifecycle == ChunkLifecycleState.queued).toList(growable: false);
    queued.sort((a, b) {
      final aBandPriority = visibleSet.contains(a.coord) ? 0 : (prefetchSet.contains(a.coord) ? 1 : 2);
      final bBandPriority = visibleSet.contains(b.coord) ? 0 : (prefetchSet.contains(b.coord) ? 1 : 2);
      final bandCompare = aBandPriority.compareTo(bBandPriority);
      if (bandCompare != 0) return bandCompare;
      final aDist = (a.coord.x - center.x).abs() + (a.coord.y - center.y).abs();
      final bDist = (b.coord.x - center.x).abs() + (b.coord.y - center.y).abs();
      final distCompare = aDist.compareTo(bDist);
      if (distCompare != 0) return distCompare;
      final byY = a.coord.y.compareTo(b.coord.y);
      if (byY != 0) return byY;
      return a.coord.x.compareTo(b.coord.x);
    });
    return queued;
  }

  Map<WorldChunkCoord, List<PerbugNode>> _bucketNodesByCoord(List<PerbugNode> nodes) {
    final buckets = <WorldChunkCoord, List<PerbugNode>>{};
    for (final node in nodes) {
      final coord = chunkGrid.worldPositionToChunkCoord(lat: node.latitude, lng: node.longitude);
      buckets.putIfAbsent(coord, () => <PerbugNode>[]).add(node);
    }
    for (final entry in buckets.entries) {
      entry.value.sort((a, b) => a.id.compareTo(b.id));
    }
    return buckets;
  }

  ({String region, String city, String country}) _deriveRegionalContext({required MapViewport viewport, required List<PerbugNode> nodes}) {
    if (nodes.isEmpty) {
      return (region: 'Unknown Region', city: 'Unknown City', country: 'Unknown Country');
    }
    final nearNodes = nodes
        .where(
          (node) => (node.latitude - viewport.centerLat).abs() <= (chunkGrid.chunkLatSize * (config.prefetchMarginChunks + 2)) &&
              (node.longitude - viewport.centerLng).abs() <= (chunkGrid.chunkLngSize * (config.prefetchMarginChunks + 2)),
        )
        .toList(growable: false);
    final sample = nearNodes.isEmpty ? nodes : nearNodes;
    String top(List<String> values, String fallback) {
      final counts = <String, int>{};
      for (final value in values.where((value) => value.trim().isNotEmpty)) {
        counts.update(value, (existing) => existing + 1, ifAbsent: () => 1);
      }
      if (counts.isEmpty) return fallback;
      final sorted = counts.entries.toList(growable: false)..sort((a, b) => b.value.compareTo(a.value));
      return sorted.first.key;
    }

    final regions = sample.map((node) => node.region).toList(growable: false);
    final cities = sample.map((node) => node.city).toList(growable: false);
    final countries = sample.map((node) => node.country).toList(growable: false);
    return (
      region: top(regions, 'Unknown Region'),
      city: top(cities, 'Unknown City'),
      country: top(countries, 'Unknown Country'),
    );
  }

  void _generateChunk({
    required _ChunkRuntimeState state,
    required Map<WorldChunkCoord, List<PerbugNode>> nodeBuckets,
    required PerbugWorldRuntimeMode mode,
    required ({String region, String city, String country}) context,
  }) {
    final sw = Stopwatch()..start();
    state.lifecycle = ChunkLifecycleState.generating;
    final seed = _hashChunk(worldSeed, state.coord.x, state.coord.y, mode.index);
    final rng = math.Random(seed);
    final seamProfile = _buildSeamProfile(state: state);

    final nodes = nodeBuckets[state.coord] ??
        _fallbackNodesForChunk(
          state: state,
          seed: seed,
          mode: mode,
          context: context,
          seamProfile: seamProfile,
        );
    final ambientProps = <String>[
      if (mode == PerbugWorldRuntimeMode.demo) 'demo_spores',
      if (rng.nextDouble() > 0.45 || seamProfile.ambientBlend > 0.56) 'windline',
      if (rng.nextDouble() > 0.5) 'local_swarm',
      if (rng.nextDouble() > 0.6 || seamProfile.landmarkInfluence > 0.68) 'relic_echo',
      if (seamProfile.landmarkInfluence > 0.72) 'landmark_aura',
      if (seamProfile.ambientBlend > 0.6) 'seam_fog_blend',
    ];

    state.nodes = nodes;
    state.ambientProps = ambientProps;
    state.localFlavor = '${context.city} • ${context.region}';
    state.placeholder = nodes.every((node) => node.id.startsWith('chunk_fallback_'));
    state.generationOrder = _generationCounter++;
    state.generatedAtTick = _tick;
    state.seamProfile = seamProfile;
    state.lifecycle = state.band == ChunkStreamingBand.visible ? ChunkLifecycleState.visible : ChunkLifecycleState.ready;
    sw.stop();
    state.generationMicros = sw.elapsedMicroseconds;
  }

  List<PerbugNode> _fallbackNodesForChunk({
    required _ChunkRuntimeState state,
    required int seed,
    required PerbugWorldRuntimeMode mode,
    required ({String region, String city, String country}) context,
    required WorldChunkSeamProfile seamProfile,
  }) {
    final synthetic = <PerbugNode>[];
    final cellSizeLat = chunkGrid.chunkLatSize / 2;
    final cellSizeLng = chunkGrid.chunkLngSize / 2;
    final minCellY = (state.bounds.minLat / cellSizeLat).floor();
    final maxCellY = (state.bounds.maxLat / cellSizeLat).floor();
    final minCellX = (state.bounds.minLng / cellSizeLng).floor();
    final maxCellX = (state.bounds.maxLng / cellSizeLng).floor();

    var index = 0;
    for (var cellY = minCellY; cellY <= maxCellY; cellY++) {
      for (var cellX = minCellX; cellX <= maxCellX; cellX++) {
        final cellSeed = _hashChunk(seed, cellX, cellY, mode.index);
        final rng = math.Random(cellSeed);
        final lat = (cellY + rng.nextDouble()) * cellSizeLat;
        final lng = (cellX + rng.nextDouble()) * cellSizeLng;
        if (lat < state.bounds.minLat || lat > state.bounds.maxLat || lng < state.bounds.minLng || lng > state.bounds.maxLng) {
          continue;
        }
        final density = _sampler.nodeDensity(lat: lat, lng: lng);
        if (density < (mode == PerbugWorldRuntimeMode.demo ? 0.28 : 0.38)) continue;
        final nodeType = PerbugNodeType.values[(cellSeed + index).abs() % PerbugNodeType.values.length];
        synthetic.add(
          PerbugNode(
            id: 'chunk_fallback_${state.coord.x}_${state.coord.y}_${index++}',
            placeId: 'chunk_fallback_${state.coord.x}_${state.coord.y}_${index}_cell',
            label: mode == PerbugWorldRuntimeMode.demo ? 'Demo ${nodeType.name}' : 'Waypoint ${nodeType.name}',
            latitude: lat,
            longitude: lng,
            region: context.region,
            city: context.city,
            neighborhood: 'Chunk ${state.coord.x}:${state.coord.y}',
            country: context.country,
            nodeType: nodeType,
            difficulty: 1 + (cellSeed + index).abs() % 5,
            state: PerbugNodeState.available,
            energyReward: 1 + rng.nextInt(3),
            movementCost: 1 + rng.nextInt(2),
            rarityScore: 0.2 + (density * 0.55),
            tags: {mode.name, 'streamed_chunk', 'worldspace_density'},
            metadata: {
              'source': mode == PerbugWorldRuntimeMode.demo ? 'demo_chunk_generator' : 'real_chunk_generator',
              'seed': seed,
              'chunk_id': state.id.value,
              'density': density,
            },
          ),
        );
      }
    }

    synthetic.addAll(_connectorNodesForChunk(state: state, mode: mode, context: context, seamProfile: seamProfile, seed: seed));
    if (synthetic.isNotEmpty) {
      synthetic.sort((a, b) => a.id.compareTo(b.id));
      return synthetic;
    }

    final centerLat = (state.bounds.minLat + state.bounds.maxLat) / 2;
    final centerLng = (state.bounds.minLng + state.bounds.maxLng) / 2;
    final rng = math.Random(seed);
    final count = mode == PerbugWorldRuntimeMode.demo ? 2 : 1;
    return List<PerbugNode>.generate(count, (fallbackIndex) {
      final lat = centerLat + (rng.nextDouble() - 0.5) * chunkGrid.chunkLatSize * 0.55;
      final lng = centerLng + (rng.nextDouble() - 0.5) * chunkGrid.chunkLngSize * 0.55;
      final nodeType = PerbugNodeType.values[(seed + fallbackIndex).abs() % PerbugNodeType.values.length];
      return PerbugNode(
        id: 'chunk_fallback_${state.coord.x}_${state.coord.y}_$fallbackIndex',
        placeId: 'chunk_fallback_${state.coord.x}_${state.coord.y}_$fallbackIndex',
        label: mode == PerbugWorldRuntimeMode.demo ? 'Demo ${nodeType.name}' : 'Waypoint ${nodeType.name}',
        latitude: lat,
        longitude: lng,
        region: context.region,
        city: context.city,
        neighborhood: 'Chunk ${state.coord.x}:${state.coord.y}',
        country: context.country,
        nodeType: nodeType,
        difficulty: 1 + (seed + index).abs() % 5,
        state: PerbugNodeState.available,
        energyReward: 1 + rng.nextInt(3),
        movementCost: 1 + rng.nextInt(2),
        rarityScore: 0.2 + rng.nextDouble() * 0.5,
        tags: {mode.name, 'streamed_chunk'},
        metadata: {
          'source': mode == PerbugWorldRuntimeMode.demo ? 'demo_chunk_generator' : 'real_chunk_generator',
          'seed': seed,
          'chunk_id': state.id.value,
        },
      );
    }, growable: false);
  }

  WorldChunkSeamProfile _buildSeamProfile({required _ChunkRuntimeState state}) {
    WorldChunkEdgeProfile profileFor(WorldChunkEdge edge) {
      final samples = <double>[];
      final connectorFractions = <double>[];
      final biomeAgg = <String, double>{'urban': 0, 'wilds': 0, 'rift': 0};
      const sampleCount = 5;
      for (var i = 0; i < sampleCount; i++) {
        final t = i / (sampleCount - 1);
        final point = _edgePoint(state.bounds, edge, t);
        samples.add(_sampler.terrainHeight(lat: point.$1, lng: point.$2));
        final biome = _sampler.biomeWeights(lat: point.$1, lng: point.$2);
        for (final key in biome.keys) {
          biomeAgg[key] = (biomeAgg[key] ?? 0) + (biome[key] ?? 0);
        }
      }
      for (var i = 0; i < 2; i++) {
        connectorFractions.add(_edgeConnectorFraction(state.coord, edge, i));
      }
      return WorldChunkEdgeProfile(
        edge: edge,
        terrainSamples: samples,
        biomeWeights: {
          for (final entry in biomeAgg.entries) entry.key: entry.value / sampleCount,
        },
        nodeAffinity: _sampler.nodeDensity(
          lat: (state.bounds.minLat + state.bounds.maxLat) / 2,
          lng: (state.bounds.minLng + state.bounds.maxLng) / 2,
        ),
        connectorFractions: connectorFractions..sort(),
        continuityFlags: const ['terrain', 'paths', 'biome', 'nodes'],
      );
    }

    return WorldChunkSeamProfile(
      edges: {
        WorldChunkEdge.north: profileFor(WorldChunkEdge.north),
        WorldChunkEdge.south: profileFor(WorldChunkEdge.south),
        WorldChunkEdge.east: profileFor(WorldChunkEdge.east),
        WorldChunkEdge.west: profileFor(WorldChunkEdge.west),
      },
      landmarkInfluence: _sampler.landmarkInfluence(
        lat: (state.bounds.minLat + state.bounds.maxLat) / 2,
        lng: (state.bounds.minLng + state.bounds.maxLng) / 2,
      ),
      ambientBlend: _sampler.ambientBlend(
        lat: (state.bounds.minLat + state.bounds.maxLat) / 2,
        lng: (state.bounds.minLng + state.bounds.maxLng) / 2,
      ),
    );
  }

  (double, double) _edgePoint(WorldChunkBounds bounds, WorldChunkEdge edge, double t) {
    return switch (edge) {
      WorldChunkEdge.north => (bounds.maxLat, bounds.minLng + ((bounds.maxLng - bounds.minLng) * t)),
      WorldChunkEdge.south => (bounds.minLat, bounds.minLng + ((bounds.maxLng - bounds.minLng) * t)),
      WorldChunkEdge.east => (bounds.minLat + ((bounds.maxLat - bounds.minLat) * t), bounds.maxLng),
      WorldChunkEdge.west => (bounds.minLat + ((bounds.maxLat - bounds.minLat) * t), bounds.minLng),
    };
  }

  double _edgeConnectorFraction(WorldChunkCoord coord, WorldChunkEdge edge, int lane) {
    final canonical = _canonicalEdge(coord, edge);
    final seed = _hashChunk(worldSeed, canonical.$1.x, canonical.$1.y, canonical.$2.index + lane);
    final rng = math.Random(seed);
    return (0.2 + (rng.nextDouble() * 0.6)).clamp(0.05, 0.95).toDouble();
  }

  (WorldChunkCoord, WorldChunkEdge) _canonicalEdge(WorldChunkCoord coord, WorldChunkEdge edge) {
    switch (edge) {
      case WorldChunkEdge.north:
      case WorldChunkEdge.east:
        return (coord, edge);
      case WorldChunkEdge.south:
        return (WorldChunkCoord(x: coord.x, y: coord.y - 1), WorldChunkEdge.north);
      case WorldChunkEdge.west:
        return (WorldChunkCoord(x: coord.x - 1, y: coord.y), WorldChunkEdge.east);
    }
  }

  List<PerbugNode> _connectorNodesForChunk({
    required _ChunkRuntimeState state,
    required PerbugWorldRuntimeMode mode,
    required ({String region, String city, String country}) context,
    required WorldChunkSeamProfile seamProfile,
    required int seed,
  }) {
    final out = <PerbugNode>[];
    for (final entry in seamProfile.edges.entries) {
      final edge = entry.key;
      final profile = entry.value;
      for (var i = 0; i < profile.connectorFractions.length; i++) {
        final fraction = profile.connectorFractions[i];
        final point = _edgePoint(state.bounds, edge, fraction);
        final connectorKey = _connectorKey(state.coord, edge, i);
        out.add(
          PerbugNode(
            id: 'chunk_fallback_${state.coord.x}_${state.coord.y}_connector_${edge.name}_$i',
            placeId: 'connector_$connectorKey',
            label: 'Route ${edge.name} ${i + 1}',
            latitude: point.$1,
            longitude: point.$2,
            region: context.region,
            city: context.city,
            neighborhood: 'Edge ${edge.name}',
            country: context.country,
            nodeType: PerbugNodeType.mission,
            difficulty: 1 + ((seed + i + edge.index) % 4).abs(),
            state: PerbugNodeState.available,
            energyReward: 1,
            movementCost: 1,
            rarityScore: 0.35 + (profile.nodeAffinity * 0.3),
            tags: {mode.name, 'streamed_chunk', 'path_connector'},
            metadata: {
              'source': 'seam_connector',
              'connector_key': connectorKey,
              'edge': edge.name,
              'chunk_id': state.id.value,
            },
          ),
        );
      }
    }
    return out;
  }

  String _connectorKey(WorldChunkCoord coord, WorldChunkEdge edge, int lane) {
    final canonical = _canonicalEdge(coord, edge);
    return '${canonical.$1.x}:${canonical.$1.y}:${canonical.$2.name}:$lane';
  }

  List<({PerbugNode from, PerbugNode to})> _connectorEdgesForVisibleNodes({
    required List<WorldChunk> worldChunks,
    required Set<WorldChunkId> visibleChunkIds,
  }) {
    final byConnector = <String, List<PerbugNode>>{};
    for (final chunk in worldChunks) {
      if (!visibleChunkIds.contains(chunk.id)) continue;
      for (final node in chunk.nodes) {
        final connectorKey = node.metadata['connector_key'];
        if (connectorKey is! String) continue;
        byConnector.putIfAbsent(connectorKey, () => <PerbugNode>[]).add(node);
      }
    }
    final result = <({PerbugNode from, PerbugNode to})>[];
    for (final nodes in byConnector.values) {
      if (nodes.length < 2) continue;
      nodes.sort((a, b) => a.id.compareTo(b.id));
      for (var i = 0; i < nodes.length - 1; i++) {
        result.add((from: nodes[i], to: nodes[i + 1]));
      }
    }
    return result;
  }

  ({int checks, List<String> warnings}) _validateVisibleChunkSeams({
    required List<WorldChunk> worldChunks,
    required Set<WorldChunkId> visibleChunkIds,
  }) {
    final byCoord = <WorldChunkCoord, WorldChunk>{
      for (final chunk in worldChunks)
        if (visibleChunkIds.contains(chunk.id)) chunk.coord: chunk,
    };
    var checks = 0;
    final warnings = <String>[];
    for (final chunk in byCoord.values) {
      final east = byCoord[WorldChunkCoord(x: chunk.coord.x + 1, y: chunk.coord.y)];
      if (east != null) {
        checks += 1;
        _compareEdgeProfiles(
          a: chunk.seamProfile.edges[WorldChunkEdge.east],
          b: east.seamProfile.edges[WorldChunkEdge.west],
          label: '${chunk.id.value}->${east.id.value}:east/west',
          warnings: warnings,
        );
      }
      final north = byCoord[WorldChunkCoord(x: chunk.coord.x, y: chunk.coord.y + 1)];
      if (north != null) {
        checks += 1;
        _compareEdgeProfiles(
          a: chunk.seamProfile.edges[WorldChunkEdge.north],
          b: north.seamProfile.edges[WorldChunkEdge.south],
          label: '${chunk.id.value}->${north.id.value}:north/south',
          warnings: warnings,
        );
      }
    }
    return (checks: checks, warnings: warnings);
  }

  void _compareEdgeProfiles({
    required WorldChunkEdgeProfile? a,
    required WorldChunkEdgeProfile? b,
    required String label,
    required List<String> warnings,
  }) {
    if (a == null || b == null) {
      warnings.add('$label missing edge profile');
      return;
    }
    for (var i = 0; i < math.min(a.terrainSamples.length, b.terrainSamples.length); i++) {
      if ((a.terrainSamples[i] - b.terrainSamples[i]).abs() > 0.0001) {
        warnings.add('$label terrain mismatch at $i');
        break;
      }
    }
    if (a.connectorFractions.length != b.connectorFractions.length) {
      warnings.add('$label connector count mismatch');
    }
  }

  int _hashChunk(int base, int x, int y, int mode) {
    var hash = base;
    hash = 0x1fffffff & (hash + x * 374761393);
    hash = 0x1fffffff & (hash ^ (hash >> 13));
    hash = 0x1fffffff & (hash + y * 668265263);
    hash = 0x1fffffff & (hash ^ (hash >> 11));
    hash = 0x1fffffff & (hash + mode * 982451653);
    return hash;
  }
}

class PerbugWorldMapEngine {
  PerbugWorldMapEngine({
    this.chunkGrid = const PerbugChunkGrid(),
    this.streamingConfig = const PerbugChunkStreamingConfig(),
    this.worldSeed = 1337,
  }) : _coordinator = PerbugChunkStreamingCoordinator(
          chunkGrid: chunkGrid,
          config: streamingConfig,
          worldSeed: worldSeed,
        );

  final PerbugChunkGrid chunkGrid;
  final PerbugChunkStreamingConfig streamingConfig;
  final int worldSeed;
  final PerbugChunkStreamingCoordinator _coordinator;

  void resetStreaming() => _coordinator.reset();

  PerbugWorldMapSnapshot build({
    required MapViewport viewport,
    required List<PerbugNode> nodes,
    required Map<String, Set<String>> graph,
    PerbugWorldRuntimeMode mode = PerbugWorldRuntimeMode.real,
  }) {
    return _coordinator.update(viewport: viewport, nodes: nodes, graph: graph, mode: mode);
  }
}

extension on _ChunkRuntimeState {
  bool get isReady => lifecycle == ChunkLifecycleState.ready || lifecycle == ChunkLifecycleState.visible;
}

List<PerbugTerrainBand> _terrainForViewport({required MapViewport viewport, required _PerbugWorldFieldSampler sampler}) {
  final seed = (viewport.centerLat * 1000).round() ^ (viewport.centerLng * 1000).round();
  return List<PerbugTerrainBand>.generate(4, (index) {
    final sampleLat = viewport.south + ((viewport.north - viewport.south) * ((index + 0.5) / 4));
    final sampleLng = viewport.west + ((viewport.east - viewport.west) * 0.5);
    final n = sampler.terrainHeight(lat: sampleLat, lng: sampleLng);
    return PerbugTerrainBand(
      id: 'band_$index',
      seed: seed + index,
      latitudeBias: ((index - 1.5) * 0.14) + ((n - 0.5) * 0.2),
      wave: 0.04 + (n * 0.07),
    );
  }, growable: false);
}

PerbugRegionTheme _deriveTheme({
  required MapViewport viewport,
  required List<PerbugNode> nodes,
  required _PerbugWorldFieldSampler sampler,
}) {
  final urbanDensity = nodes.where((n) => n.tags.contains('shop') || n.tags.contains('mission')).length / math.max(1, nodes.length);
  final natureDensity = nodes.where((n) => n.tags.contains('park') || n.tags.contains('resource')).length / math.max(1, nodes.length);
  final rareDensity = nodes.where((n) => n.nodeType == PerbugNodeType.rare || n.nodeType == PerbugNodeType.event).length / math.max(1, nodes.length);

  final biomeWeights = sampler.biomeWeights(lat: viewport.centerLat, lng: viewport.centerLng);
  final riftField = biomeWeights['rift'] ?? 0;
  final wildField = biomeWeights['wilds'] ?? 0;
  final urbanField = biomeWeights['urban'] ?? 0;

  if (rareDensity > 0.22 || riftField > 0.43) {
    return const PerbugRegionTheme(
      id: 'astral-rift',
      title: 'Astral Rift Frontier',
      palette: [0xFF261A4D, 0xFF433A7A, 0xFF35B8FF, 0xFFE4A8FF],
      fogIntensity: 0.34,
      magicFlux: 0.92,
      biome: 'rift',
    );
  }
  if (natureDensity + wildField >= urbanDensity + urbanField) {
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
