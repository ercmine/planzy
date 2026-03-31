import 'package:perbug/features/home/map_discovery_models.dart';
import 'package:perbug/features/home/perbug_game_models.dart';
import 'package:perbug/features/home/perbug_world_map_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final engine = PerbugWorldMapEngine(
    streamingConfig: const PerbugChunkStreamingConfig(
      prefetchMarginChunks: 1,
      retentionMarginChunks: 2,
      cooldownTicks: 2,
      generationBudgetPerTick: 12,
    ),
  );

  final nodes = [
    PerbugNode(
      id: 'n1',
      placeId: 'p1',
      label: 'Arcade Plaza',
      latitude: 30.2675,
      longitude: -97.743,
      region: 'Texas',
      city: 'Austin',
      neighborhood: 'Downtown',
      country: 'United States',
      nodeType: PerbugNodeType.mission,
      difficulty: 5,
      state: PerbugNodeState.available,
      energyReward: 3,
      movementCost: 3,
      rarityScore: 0.5,
      tags: const {'mission'},
      metadata: const {'source': 'geo_nominatim', 'category': 'city'},
    ),
    PerbugNode(
      id: 'n2',
      placeId: 'p2',
      label: 'Verdant Park',
      latitude: 30.268,
      longitude: -97.7425,
      region: 'Texas',
      city: 'Austin',
      neighborhood: 'Downtown',
      country: 'United States',
      nodeType: PerbugNodeType.resource,
      difficulty: 3,
      state: PerbugNodeState.available,
      energyReward: 2,
      movementCost: 2,
      rarityScore: 0.4,
      tags: const {'park', 'resource'},
      metadata: const {'source': 'geo_nominatim', 'category': 'park'},
    ),
  ];

  test('chunk grid maps positions and bounds deterministically including negative coordinates', () {
    const grid = PerbugChunkGrid(chunkLatSize: 0.1, chunkLngSize: 0.1, prefetchMarginChunks: 0);
    final coord = grid.worldPositionToChunkCoord(lat: 30.2675, lng: -97.743);
    expect(coord.x, -978);
    expect(coord.y, 302);

    final negativeCoord = grid.worldPositionToChunkCoord(lat: -0.01, lng: -0.01);
    expect(negativeCoord.x, -1);
    expect(negativeCoord.y, -1);

    final bounds = grid.chunkCoordToBounds(const WorldChunkCoord(x: -978, y: 302));
    expect(bounds.minLng, closeTo(-97.8, 0.000001));
    expect(bounds.maxLng, closeTo(-97.7, 0.000001));
    expect(bounds.minLat, closeTo(30.2, 0.000001));
    expect(bounds.maxLat, closeTo(30.3, 0.000001));
    expect(grid.chunkCoordToId(const WorldChunkCoord(x: -978, y: 302)).value, 'chunk_-978_302');
  });

  test('build produces streamed snapshot with lifecycle and visible chunk culling metadata', () {
    engine.resetStreaming();
    const viewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    final snapshot = engine.build(
      viewport: viewport,
      nodes: nodes,
      graph: const {
        'n1': {'n2'},
        'n2': {'n1'},
      },
      mode: PerbugWorldRuntimeMode.real,
    );

    expect(snapshot.visibleNodes, isNotEmpty);
    expect(snapshot.connections.length, 1);
    expect(snapshot.debug['visible_chunks'], greaterThan(0));
    expect(snapshot.debug['prefetch_chunks'], greaterThan(0));
    expect(snapshot.chunks.any((chunk) => chunk.lifecycle == ChunkLifecycleState.visible), isTrue);
    expect(snapshot.visibleChunkIds.length, snapshot.visibleChunks.length);
  });

  test('chunk enters prefetch band and is generated before becoming visible', () {
    engine.resetStreaming();
    const viewportA = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    final first = engine.build(viewport: viewportA, nodes: nodes, graph: const {'n1': {'n2'}, 'n2': {'n1'}});

    expect(first.prefetchChunkIds, isNotEmpty);
    final prefetchId = first.prefetchChunkIds.first;
    final prefetchChunk = first.chunks.firstWhere((chunk) => chunk.id == prefetchId);
    expect(prefetchChunk.isReady, isTrue);

    const viewportB = MapViewport(centerLat: 30.2672, centerLng: -97.664, zoom: 13);
    final second = engine.build(viewport: viewportB, nodes: nodes, graph: const {'n1': {'n2'}, 'n2': {'n1'}});
    expect(second.visibleChunkIds.contains(prefetchId), isTrue);
  });

  test('chunk leaves visible then retention and is evicted', () {
    engine.resetStreaming();
    const near = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    final first = engine.build(viewport: near, nodes: nodes, graph: const {'n1': {'n2'}, 'n2': {'n1'}});
    final trackedId = first.visibleChunkIds.first;

    const far = MapViewport(centerLat: 31.8, centerLng: -95.1, zoom: 13);
    final second = engine.build(viewport: far, nodes: nodes, graph: const {'n1': {'n2'}, 'n2': {'n1'}});
    expect(second.visibleChunkIds.contains(trackedId), isFalse);

    final third = engine.build(viewport: far, nodes: nodes, graph: const {'n1': {'n2'}, 'n2': {'n1'}});
    expect(third.chunks.any((chunk) => chunk.id == trackedId), isFalse);
    expect((third.debug['evicted_chunks'] as num).toInt(), greaterThan(0));
  });

  test('demo and real mode both stream safely without blank visible nodes', () {
    engine.resetStreaming();
    const viewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    final demo = engine.build(viewport: viewport, nodes: const <PerbugNode>[], graph: const {}, mode: PerbugWorldRuntimeMode.demo);
    expect(demo.visibleNodes, isNotEmpty);
    expect(demo.visibleChunks, isNotEmpty);

    engine.resetStreaming();
    final real = engine.build(viewport: viewport, nodes: nodes, graph: const {'n1': {'n2'}, 'n2': {'n1'}}, mode: PerbugWorldRuntimeMode.real);
    expect(real.visibleNodes, isNotEmpty);
    expect(real.debug['mode'], equals('real'));
  });

  test('adjacent chunks share deterministic seam connector fractions and terrain profiles', () {
    engine.resetStreaming();
    const viewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    final first = engine.build(viewport: viewport, nodes: const <PerbugNode>[], graph: const {}, mode: PerbugWorldRuntimeMode.demo);
    final chunksByCoord = {for (final chunk in first.visibleChunks) chunk.coord: chunk};
    expect(chunksByCoord.length, greaterThan(1));

    final base = chunksByCoord.values.first;
    final east = chunksByCoord[WorldChunkCoord(x: base.coord.x + 1, y: base.coord.y)];
    expect(east, isNotNull);
    final eastProfile = base.seamProfile.edges[WorldChunkEdge.east];
    final westProfile = east!.seamProfile.edges[WorldChunkEdge.west];
    expect(eastProfile, isNotNull);
    expect(westProfile, isNotNull);
    expect(eastProfile!.connectorFractions, orderedEquals(westProfile!.connectorFractions));
    expect(eastProfile.terrainSamples, orderedEquals(westProfile.terrainSamples));
    expect((first.debug['seam_warning_count'] as num).toInt(), equals(0));
  });

  test('streaming generation order does not affect seam connector keys on shared border', () {
    const graph = <String, Set<String>>{};
    const viewportWest = MapViewport(centerLat: 30.2672, centerLng: -97.79, zoom: 13);
    const viewportEast = MapViewport(centerLat: 30.2672, centerLng: -97.71, zoom: 13);

    engine.resetStreaming();
    final westThenEastA = engine.build(viewport: viewportWest, nodes: const <PerbugNode>[], graph: graph, mode: PerbugWorldRuntimeMode.demo);
    final westThenEastB = engine.build(viewport: viewportEast, nodes: const <PerbugNode>[], graph: graph, mode: PerbugWorldRuntimeMode.demo);
    final keysA = {
      for (final chunk in westThenEastB.visibleChunks)
        for (final node in chunk.nodes)
          if (node.metadata['connector_key'] is String) node.metadata['connector_key'] as String,
    };

    engine.resetStreaming();
    final eastThenWestA = engine.build(viewport: viewportEast, nodes: const <PerbugNode>[], graph: graph, mode: PerbugWorldRuntimeMode.demo);
    final eastThenWestB = engine.build(viewport: viewportWest, nodes: const <PerbugNode>[], graph: graph, mode: PerbugWorldRuntimeMode.demo);
    final keysB = {
      for (final chunk in eastThenWestB.visibleChunks)
        for (final node in chunk.nodes)
          if (node.metadata['connector_key'] is String) node.metadata['connector_key'] as String,
    };

    expect(keysA, isNotEmpty);
    expect(keysB, isNotEmpty);
    expect(keysA.intersection(keysB), isNotEmpty);
    expect((westThenEastA.debug['seam_checks'] as num).toInt(), greaterThanOrEqualTo(0));
    expect((eastThenWestA.debug['seam_checks'] as num).toInt(), greaterThanOrEqualTo(0));
  });
}
