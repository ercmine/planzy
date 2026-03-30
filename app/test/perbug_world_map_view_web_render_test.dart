import 'package:dryad/features/home/map_discovery_models.dart';
import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:dryad/features/home/perbug_world_map_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('world map view mounts and paints even with zero nodes', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 800,
            height: 400,
            child: PerbugWorldMapView(
              viewport: const MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13),
              nodes: const [],
              connections: const {},
              currentNodeId: null,
              selectedNodeId: null,
              reachableNodeIds: const {},
              completedNodeIds: const {},
              onViewportChanged: (_, {required hasGesture}) {},
              onNodeSelected: (_) {},
              onTapEmpty: () {},
            ),
          ),
        ),
      ),
    );

    expect(find.byType(PerbugWorldMapView), findsOneWidget);
    expect(find.byType(CustomPaint), findsOneWidget);
    expect(find.text('Demo frontier fallback'), findsOneWidget);
  });

  testWidgets('world map view renders with populated fallback-like nodes', (tester) async {
    const nodes = [
      PerbugNode(
        id: 'a',
        placeId: 'a',
        label: 'A',
        latitude: 30.2672,
        longitude: -97.7431,
        region: 'TX',
        city: 'Austin',
        neighborhood: 'Downtown',
        country: 'US',
        nodeType: PerbugNodeType.encounter,
        difficulty: 1,
        state: PerbugNodeState.available,
        energyReward: 2,
        movementCost: 2,
        rarityScore: 0.2,
        tags: {'demo'},
        metadata: {'source': 'test'},
      ),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 800,
            height: 400,
            child: PerbugWorldMapView(
              viewport: const MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13),
              nodes: nodes,
              connections: const {},
              currentNodeId: 'a',
              selectedNodeId: 'a',
              reachableNodeIds: const {'a'},
              completedNodeIds: const {},
              onViewportChanged: (_, {required hasGesture}) {},
              onNodeSelected: (_) {},
              onTapEmpty: () {},
            ),
          ),
        ),
      ),
    );

    expect(find.byType(PerbugWorldMapView), findsOneWidget);
    expect(find.byType(CustomPaint), findsOneWidget);
    expect(find.text('Live tactical region'), findsOneWidget);
  });
}
