import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/location/location_models.dart';
import 'world_map_scene_models.dart';

class WorldMapSceneGenerator {
  const WorldMapSceneGenerator({this.projection = const WorldProjection()});

  final WorldProjection projection;

  WorldMapSceneData generate({
    required AppLocation? location,
    required GeoCoordinate demoAnchor,
    required int seed,
    int radius = 1,
  }) {
    final anchor = location == null
        ? demoAnchor
        : GeoCoordinate(lat: location.lat, lng: location.lng);
    final anchorWorld = const WorldCoordinate(x: 0.5, y: 0.5);
    final chunks = <WorldChunk>[];

    for (var y = -radius; y <= radius; y++) {
      for (var x = -radius; x <= radius; x++) {
        final chunkId = WorldChunkId(x: x, y: y);
        chunks.add(_generateChunk(chunkId: chunkId, anchor: anchor, seed: seed));
      }
    }

    return WorldMapSceneData(
      anchor: anchor,
      chunks: chunks,
      player: anchorWorld,
      demo: projection.geoToWorld(demoAnchor, anchor: anchor),
      isDemoMode: location == null,
      generatedAt: DateTime.now().toUtc(),
    );
  }

  WorldChunk _generateChunk({required WorldChunkId chunkId, required GeoCoordinate anchor, required int seed}) {
    final localSeed = seededHash(seed, chunkId.x, chunkId.y);
    final region = _buildRegion(chunkId: chunkId, seed: localSeed);
    final districts = _buildDistricts(chunkId: chunkId, region: region, seed: localSeed);
    final nodes = _buildNodes(chunkId: chunkId, districts: districts, anchor: anchor, seed: localSeed);
    final routes = _buildRoutes(nodes, localSeed);
    final spawnables = _buildSpawnables(chunkId: chunkId, seed: localSeed);
    final biomes = _buildBiomes(chunkId: chunkId, seed: localSeed);

    return WorldChunk(
      id: chunkId,
      region: region,
      districts: districts,
      biomes: biomes,
      routes: routes,
      nodes: nodes,
      spawnables: spawnables,
    );
  }

  WorldRegion _buildRegion({required WorldChunkId chunkId, required int seed}) {
    final palettes = <List<Color>>[
      const [Color(0xFF13233E), Color(0xFF264D6F), Color(0xFF3D7B78), Color(0xFF7DAA87)],
      const [Color(0xFF281B43), Color(0xFF56337A), Color(0xFF7B4B9B), Color(0xFFB67DDC)],
      const [Color(0xFF2A1C12), Color(0xFF5E3B24), Color(0xFF8A6438), Color(0xFFC79B4B)],
    ];
    final palette = palettes[seed % palettes.length];
    return WorldRegion(
      id: 'region_${chunkId.x}_${chunkId.y}',
      name: ['Frontier March', 'Auric Belt', 'Cradle Reach'][seed % 3],
      seed: seed,
      palette: palette,
      ambientTone: 0.2 + ((seed % 100) / 250),
    );
  }

  List<WorldDistrict> _buildDistricts({required WorldChunkId chunkId, required WorldRegion region, required int seed}) {
    return List<WorldDistrict>.generate(3, (index) {
      final cx = 0.5 + chunkId.x * 0.25 + (seededUnit(seed, index, chunkId.y, 7) - 0.5) * 0.16;
      final cy = 0.5 + chunkId.y * 0.22 + (seededUnit(seed, chunkId.x, index, 9) - 0.5) * 0.14;
      return WorldDistrict(
        id: '${region.id}_d$index',
        regionId: region.id,
        name: '${region.name} District ${index + 1}',
        identity: ['Industrial', 'Arcane', 'Wildlands'][index % 3],
        intensity: 0.35 + seededUnit(seed, index, chunkId.x + chunkId.y),
        center: WorldCoordinate(x: cx.clamp(0.05, 0.95), y: cy.clamp(0.05, 0.95)),
        radius: 0.12 + seededUnit(seed, chunkId.y, index) * 0.09,
      );
    });
  }

  List<WorldMapNode> _buildNodes({
    required WorldChunkId chunkId,
    required List<WorldDistrict> districts,
    required GeoCoordinate anchor,
    required int seed,
  }) {
    final nodes = <WorldMapNode>[];
    for (var i = 0; i < 12; i++) {
      final district = districts[i % districts.length];
      final angle = (math.pi * 2 * i / 12) + seededUnit(seed, i, chunkId.x, 11);
      final distance = district.radius * (0.3 + seededUnit(seed, i, chunkId.y, 13));
      final coord = WorldCoordinate(
        x: (district.center.x + math.cos(angle) * distance).clamp(0.02, 0.98),
        y: (district.center.y + math.sin(angle) * distance).clamp(0.02, 0.98),
      );
      final geo = projection.worldToGeo(coord, anchor: anchor);
      final category = WorldNodeCategory.values[(i + seed) % WorldNodeCategory.values.length];
      nodes.add(
        WorldMapNode(
          id: 'node_${chunkId.x}_${chunkId.y}_$i',
          label: '${category.name.toUpperCase()} ${i + 1}',
          category: category,
          coordinate: coord,
          geo: geo,
          difficulty: 1 + ((i + chunkId.x.abs() + chunkId.y.abs()) % 7),
          rarity: 0.2 + seededUnit(seed, i, chunkId.y, 29) * 0.8,
          energyCost: 2 + ((i + seed) % 4),
          regionId: district.regionId,
          districtId: district.id,
          description: 'Operational hotspot in ${district.identity.toLowerCase()} district.',
        ),
      );
    }
    return nodes;
  }

  List<WorldRouteSegment> _buildRoutes(List<WorldMapNode> nodes, int seed) {
    if (nodes.isEmpty) return const [];
    final routes = <WorldRouteSegment>[];
    for (var i = 0; i < nodes.length; i++) {
      final from = nodes[i];
      final to = nodes[(i + 1) % nodes.length];
      final mid = WorldCoordinate(
        x: (from.coordinate.x + to.coordinate.x) / 2 + (seededUnit(seed, i, i + 1, 31) - 0.5) * 0.03,
        y: (from.coordinate.y + to.coordinate.y) / 2 + (seededUnit(seed, i + 2, i, 37) - 0.5) * 0.03,
      );
      routes.add(
        WorldRouteSegment(
          id: 'route_${from.id}_${to.id}',
          fromNodeId: from.id,
          toNodeId: to.id,
          path: [from.coordinate, mid, to.coordinate],
          travelCost: (routeDistance(from.coordinate, to.coordinate) * 60).round().clamp(1, 9),
        ),
      );
      if (i % 3 == 0) {
        final crossTo = nodes[(i + 4) % nodes.length];
        routes.add(
          WorldRouteSegment(
            id: 'route_${from.id}_${crossTo.id}',
            fromNodeId: from.id,
            toNodeId: crossTo.id,
            path: [from.coordinate, crossTo.coordinate],
            travelCost: (routeDistance(from.coordinate, crossTo.coordinate) * 64).round().clamp(2, 12),
          ),
        );
      }
    }
    return routes;
  }

  List<SpawnableCollectible> _buildSpawnables({required WorldChunkId chunkId, required int seed}) {
    return List<SpawnableCollectible>.generate(14, (index) {
      final x = (chunkId.x * 0.25 + seededUnit(seed, index, chunkId.x, 41)).clamp(0.0, 1.0);
      final y = (chunkId.y * 0.22 + seededUnit(seed, chunkId.y, index, 43)).clamp(0.0, 1.0);
      return SpawnableCollectible(
        id: 'spawn_${chunkId.x}_${chunkId.y}_$index',
        label: ['Ore', 'Shard', 'Relic', 'Signal'][index % 4],
        coordinate: WorldCoordinate(x: x.toDouble(), y: y.toDouble()),
        rarity: seededUnit(seed, index, chunkId.y, 47),
      );
    });
  }

  List<WorldBiomeBand> _buildBiomes({required WorldChunkId chunkId, required int seed}) {
    final base = (chunkId.x.abs() + chunkId.y.abs() + seed) % WorldBiomeBand.values.length;
    return List<WorldBiomeBand>.generate(3, (index) => WorldBiomeBand.values[(base + index) % WorldBiomeBand.values.length]);
  }
}
