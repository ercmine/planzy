import 'dart:ui';

import 'package:dryad/features/home/map_discovery_models.dart';
import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:dryad/features/home/perbug_render_engine.dart';
import 'package:dryad/features/home/perbug_world_map_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const worldEngine = PerbugWorldMapEngine();
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
  ];

  final graph = {
    'n1': {'n2'},
    'n2': {'n1'},
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
    expect(first.debug['render_nodes'], equals(2));
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
