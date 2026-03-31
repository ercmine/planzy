import 'dart:ui';

import 'package:perbug/features/home/map_discovery_models.dart';
import 'package:perbug/features/home/perbug_game_models.dart';
import 'package:perbug/features/home/perbug_render_engine.dart';
import 'package:perbug/features/home/perbug_world_map_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final worldEngine = PerbugWorldMapEngine();
  const renderEngine = PerbugRenderEngine();

  const viewport = MapViewport(centerLat: 37.7749, centerLng: -122.4194, zoom: 11.2);

  const nodes = [
    PerbugNode(
      id: 'n1',
      placeId: 'p1',
      label: 'Market Sigil',
      latitude: 37.7750,
      longitude: -122.4190,
      region: 'Bay',
      city: 'San Francisco',
      neighborhood: 'Downtown',
      country: 'USA',
      nodeType: PerbugNodeType.shop,
      difficulty: 2,
      state: PerbugNodeState.available,
      energyReward: 2,
      movementCost: 2,
      rarityScore: 0.25,
      tags: {'shop'},
      metadata: {'source': 'geo_nominatim'},
    ),
    PerbugNode(
      id: 'n2',
      placeId: 'p2',
      label: 'Rift Beacon',
      latitude: 37.7772,
      longitude: -122.4182,
      region: 'Bay',
      city: 'San Francisco',
      neighborhood: 'Downtown',
      country: 'USA',
      nodeType: PerbugNodeType.rare,
      difficulty: 4,
      state: PerbugNodeState.special,
      energyReward: 4,
      movementCost: 3,
      rarityScore: 0.98,
      tags: {'rare'},
      metadata: {'source': 'geo_nominatim'},
    ),
    PerbugNode(
      id: 'n3_far',
      placeId: 'p3',
      label: 'Far Bastion',
      latitude: 38.9000,
      longitude: -121.1000,
      region: 'Bay',
      city: 'Farlands',
      neighborhood: 'Outer',
      country: 'USA',
      nodeType: PerbugNodeType.resource,
      difficulty: 3,
      state: PerbugNodeState.available,
      energyReward: 1,
      movementCost: 2,
      rarityScore: 0.3,
      tags: {'resource'},
      metadata: {'source': 'geo_nominatim'},
    ),
  ];

  final graph = {
    'n1': {'n2'},
    'n2': {'n1'},
    'n3_far': <String>{},
  };

  test('composeFrame generates deterministic frame payload for same input', () {
    final snapshot = worldEngine.build(viewport: viewport, nodes: nodes, graph: graph);

    final first = renderEngine.composeFrame(
      viewport: viewport,
      canvasSize: const Size(800, 600),
      snapshot: snapshot,
      currentNodeId: 'n1',
      selectedNodeId: 'n2',
      hoverNodeId: null,
      reachableNodeIds: const {'n1', 'n2'},
      completedNodeIds: const {'n1'},
    );

    final second = renderEngine.composeFrame(
      viewport: viewport,
      canvasSize: const Size(800, 600),
      snapshot: snapshot,
      currentNodeId: 'n1',
      selectedNodeId: 'n2',
      hoverNodeId: null,
      reachableNodeIds: const {'n1', 'n2'},
      completedNodeIds: const {'n1'},
    );

    expect(first.nodes.map((n) => n.id).toList(), equals(second.nodes.map((n) => n.id).toList()));
    expect(first.edges.length, equals(second.edges.length));
    expect(first.debug['render_nodes'], equals(snapshot.visibleNodes.length));
    expect(first.debug['traversed_chunks'], equals(snapshot.visibleChunks.length));
  });

  test('composeFrame traverses visible chunks only', () {
    final snapshot = worldEngine.build(viewport: viewport, nodes: nodes, graph: graph);
    final frame = renderEngine.composeFrame(
      viewport: viewport,
      canvasSize: const Size(1000, 700),
      snapshot: snapshot,
      currentNodeId: 'n1',
      selectedNodeId: null,
      hoverNodeId: null,
      reachableNodeIds: const {'n1', 'n2'},
      completedNodeIds: const <String>{},
    );

    expect(snapshot.chunks.length, greaterThanOrEqualTo(snapshot.visibleChunks.length));
    expect(frame.nodes.any((node) => node.id == 'n3_far'), isFalse);
    expect(frame.nodes.every((node) => snapshot.visibleChunkIds.contains(node.chunkId)), isTrue);
  });

  test('renderer paints only ready visible chunks when pending exists', () {
    final streamingEngine = PerbugWorldMapEngine(
      streamingConfig: const PerbugChunkStreamingConfig(generationBudgetPerTick: 1, prefetchMarginChunks: 0, retentionMarginChunks: 1),
    );
    final snapshot = streamingEngine.build(viewport: viewport, nodes: const <PerbugNode>[], graph: const {}, mode: PerbugWorldRuntimeMode.demo);
    final frame = renderEngine.composeFrame(
      viewport: viewport,
      canvasSize: const Size(1000, 700),
      snapshot: snapshot,
      currentNodeId: null,
      selectedNodeId: null,
      hoverNodeId: null,
      reachableNodeIds: const <String>{},
      completedNodeIds: const <String>{},
    );

    expect(frame.nodes.every((node) => snapshot.visibleChunkIds.contains(node.chunkId)), isTrue);
    expect((snapshot.debug['pending_visible_chunks'] as num).toInt(), greaterThanOrEqualTo(0));
  });

  test('hit testing returns nearby node id', () {
    final snapshot = worldEngine.build(viewport: viewport, nodes: nodes, graph: graph);
    final frame = renderEngine.composeFrame(
      viewport: viewport,
      canvasSize: const Size(1000, 700),
      snapshot: snapshot,
      currentNodeId: 'n1',
      selectedNodeId: null,
      hoverNodeId: null,
      reachableNodeIds: const {'n1', 'n2'},
      completedNodeIds: const <String>{},
    );

    final target = frame.nodes.firstWhere((n) => n.id == 'n2');
    final hit = frame.hitTest(target.screen.position + const Offset(4, -3));

    expect(hit, equals('n2'));
  });
}
