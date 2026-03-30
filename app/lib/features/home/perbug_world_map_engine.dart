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
}

class PerbugChunkStreamingCoordinator {
  PerbugChunkStreamingCoordinator({
    this.chunkGrid = const PerbugChunkGrid(),
    this.config = const PerbugChunkStreamingConfig(),
    this.worldSeed = 1337,
  });

  final PerbugChunkGrid chunkGrid;
  final PerbugChunkStreamingConfig config;
  final int worldSeed;

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

    final visibleNodes = [for (final chunk in worldChunks) if (visibleChunkIds.contains(chunk.id)) ...chunk.nodes];
    final terrainBands = _terrainForViewport(viewport: viewport, nodes: visibleNodes);
    final theme = _deriveTheme(viewport: viewport, nodes: visibleNodes);

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

    final nodes = nodeBuckets[state.coord] ?? _fallbackNodesForChunk(state: state, seed: seed, mode: mode, context: context);
    final ambientProps = <String>[
      if (mode == PerbugWorldRuntimeMode.demo) 'demo_spores',
      if (rng.nextDouble() > 0.45) 'windline',
      if (rng.nextDouble() > 0.5) 'local_swarm',
      if (rng.nextDouble() > 0.6) 'relic_echo',
    ];

    state.nodes = nodes;
    state.ambientProps = ambientProps;
    state.localFlavor = '${context.city} • ${context.region}';
    state.placeholder = nodes.every((node) => node.id.startsWith('chunk_fallback_'));
    state.generationOrder = _generationCounter++;
    state.generatedAtTick = _tick;
    state.lifecycle = state.band == ChunkStreamingBand.visible ? ChunkLifecycleState.visible : ChunkLifecycleState.ready;
    sw.stop();
    state.generationMicros = sw.elapsedMicroseconds;
  }

  List<PerbugNode> _fallbackNodesForChunk({
    required _ChunkRuntimeState state,
    required int seed,
    required PerbugWorldRuntimeMode mode,
    required ({String region, String city, String country}) context,
  }) {
    final rng = math.Random(seed);
    final centerLat = (state.bounds.minLat + state.bounds.maxLat) / 2;
    final centerLng = (state.bounds.minLng + state.bounds.maxLng) / 2;
    final count = mode == PerbugWorldRuntimeMode.demo ? 2 : 1;
    return List<PerbugNode>.generate(count, (index) {
      final lat = centerLat + (rng.nextDouble() - 0.5) * chunkGrid.chunkLatSize * 0.55;
      final lng = centerLng + (rng.nextDouble() - 0.5) * chunkGrid.chunkLngSize * 0.55;
      final nodeType = PerbugNodeType.values[(seed + index).abs() % PerbugNodeType.values.length];
      return PerbugNode(
        id: 'chunk_fallback_${state.coord.x}_${state.coord.y}_$index',
        placeId: 'chunk_fallback_${state.coord.x}_${state.coord.y}_$index',
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
