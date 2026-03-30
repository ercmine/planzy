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

  test('build produces chunked snapshot with visible chunk culling metadata', () {
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
    expect(first.debug['visible_chunks'], greaterThan(0));
    expect(first.debug['total_chunks'], greaterThan(0));
    expect(first.visibleChunkIds.length, first.visibleChunks.length);
  });

  test('world bounds maps to chunk range and visible set updates from viewport', () {
    const grid = PerbugChunkGrid(chunkLatSize: 0.08, chunkLngSize: 0.08, prefetchMarginChunks: 0);
    const viewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    final bounds = grid.viewportToWorldBounds(viewport, includePrefetch: false);
    final range = grid.worldBoundsToChunkRange(bounds);
    expect(range.maxX, greaterThanOrEqualTo(range.minX));
    expect(range.maxY, greaterThanOrEqualTo(range.minY));

    final snapshot = const PerbugWorldMapEngine(chunkGrid: grid).build(
      viewport: viewport,
      nodes: nodes,
      graph: const {
        'n1': {'n2'},
        'n2': {'n1'},
      },
    );
    expect(snapshot.visibleChunks, isNotEmpty);
    expect(snapshot.visibleChunks.every((chunk) => chunk.isVisible), isTrue);
  });
}
