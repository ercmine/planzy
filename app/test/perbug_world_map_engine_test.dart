import 'package:dryad/features/home/map_discovery_models.dart';
import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:dryad/features/home/perbug_world_map_engine.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const engine = PerbugWorldMapEngine();

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

  test('build produces themed snapshot with debug metadata', () {
    const viewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    final first = engine.build(
      viewport: viewport,
      nodes: nodes,
      graph: const {
        'n1': {'n2'},
        'n2': {'n1'},
      },
    );
    final second = engine.build(
      viewport: viewport,
      nodes: nodes,
      graph: const {
        'n1': {'n2'},
        'n2': {'n1'},
      },
    );

    expect(first.visibleNodes.length, 2);
    expect(first.connections.length, 1);
    expect(first.regionTheme.id, second.regionTheme.id);
    expect(first.debug['region_theme'], isNotNull);
    expect(first.debug['nominatim_semantic_nodes'], 2);
  });
}
