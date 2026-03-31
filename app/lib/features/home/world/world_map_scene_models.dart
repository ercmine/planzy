import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../perbug_game_models.dart';

@immutable
class WorldCoordinate {
  const WorldCoordinate({required this.x, required this.y});

  final double x;
  final double y;

  Offset toOffset(Size size) => Offset(x * size.width, y * size.height);
}

@immutable
class GeoCoordinate {
  const GeoCoordinate({required this.lat, required this.lng});

  final double lat;
  final double lng;
}

class WorldProjection {
  const WorldProjection();

  WorldCoordinate geoToWorld(GeoCoordinate geo, {required GeoCoordinate anchor}) {
    const lngScale = 1 / 0.12;
    const latScale = 1 / 0.09;
    final dx = (geo.lng - anchor.lng) * lngScale;
    final dy = (geo.lat - anchor.lat) * latScale;
    return WorldCoordinate(x: 0.5 + dx, y: 0.5 - dy);
  }

  GeoCoordinate worldToGeo(WorldCoordinate world, {required GeoCoordinate anchor}) {
    final lng = anchor.lng + (world.x - 0.5) * 0.12;
    final lat = anchor.lat - (world.y - 0.5) * 0.09;
    return GeoCoordinate(lat: lat, lng: lng);
  }
}

@immutable
class WorldChunkId {
  const WorldChunkId({required this.x, required this.y});

  final int x;
  final int y;

  @override
  bool operator ==(Object other) => other is WorldChunkId && x == other.x && y == other.y;

  @override
  int get hashCode => Object.hash(x, y);

  @override
  String toString() => '[$x,$y]';
}

enum WorldBiomeBand { oceanic, temperate, arid, highland, ruins }

enum WorldNodeCategory { encounter, resource, mission, shop, event, rest, rare, boss, settlement }

@immutable
class WorldRegion {
  const WorldRegion({
    required this.id,
    required this.name,
    required this.seed,
    required this.palette,
    required this.ambientTone,
  });

  final String id;
  final String name;
  final int seed;
  final List<Color> palette;
  final double ambientTone;
}

@immutable
class WorldDistrict {
  const WorldDistrict({
    required this.id,
    required this.regionId,
    required this.name,
    required this.identity,
    required this.intensity,
    required this.center,
    required this.radius,
  });

  final String id;
  final String regionId;
  final String name;
  final String identity;
  final double intensity;
  final WorldCoordinate center;
  final double radius;
}

@immutable
class WorldRouteSegment {
  const WorldRouteSegment({
    required this.id,
    required this.fromNodeId,
    required this.toNodeId,
    required this.path,
    required this.travelCost,
  });

  final String id;
  final String fromNodeId;
  final String toNodeId;
  final List<WorldCoordinate> path;
  final int travelCost;
}

@immutable
class WorldMapNode {
  const WorldMapNode({
    required this.id,
    required this.label,
    required this.category,
    required this.coordinate,
    required this.geo,
    required this.difficulty,
    required this.rarity,
    required this.energyCost,
    required this.regionId,
    required this.districtId,
    required this.description,
  });

  final String id;
  final String label;
  final WorldNodeCategory category;
  final WorldCoordinate coordinate;
  final GeoCoordinate geo;
  final int difficulty;
  final double rarity;
  final int energyCost;
  final String regionId;
  final String districtId;
  final String description;

  PerbugNodeType get perbugType => switch (category) {
        WorldNodeCategory.encounter => PerbugNodeType.encounter,
        WorldNodeCategory.resource => PerbugNodeType.resource,
        WorldNodeCategory.mission => PerbugNodeType.mission,
        WorldNodeCategory.shop => PerbugNodeType.shop,
        WorldNodeCategory.event => PerbugNodeType.event,
        WorldNodeCategory.rest => PerbugNodeType.rest,
        WorldNodeCategory.rare => PerbugNodeType.rare,
        WorldNodeCategory.boss => PerbugNodeType.boss,
        WorldNodeCategory.settlement => PerbugNodeType.shop,
      };
}

@immutable
class SpawnableCollectible {
  const SpawnableCollectible({
    required this.id,
    required this.label,
    required this.coordinate,
    required this.rarity,
  });

  final String id;
  final String label;
  final WorldCoordinate coordinate;
  final double rarity;
}

@immutable
class WorldChunk {
  const WorldChunk({
    required this.id,
    required this.region,
    required this.districts,
    required this.biomes,
    required this.routes,
    required this.nodes,
    required this.spawnables,
  });

  final WorldChunkId id;
  final WorldRegion region;
  final List<WorldDistrict> districts;
  final List<WorldBiomeBand> biomes;
  final List<WorldRouteSegment> routes;
  final List<WorldMapNode> nodes;
  final List<SpawnableCollectible> spawnables;
}

@immutable
class WorldMapSceneData {
  const WorldMapSceneData({
    required this.anchor,
    required this.chunks,
    required this.player,
    required this.demo,
    required this.isDemoMode,
    required this.generatedAt,
  });

  final GeoCoordinate anchor;
  final List<WorldChunk> chunks;
  final WorldCoordinate player;
  final WorldCoordinate demo;
  final bool isDemoMode;
  final DateTime generatedAt;

  List<WorldMapNode> get nodes => [for (final chunk in chunks) ...chunk.nodes];
  List<WorldRouteSegment> get routes => [for (final chunk in chunks) ...chunk.routes];
  List<WorldDistrict> get districts => [for (final chunk in chunks) ...chunk.districts];

  Map<String, WorldMapNode> get nodeById => {for (final node in nodes) node.id: node};
}

@immutable
class WorldCameraState {
  const WorldCameraState({required this.center, required this.zoom});

  final WorldCoordinate center;
  final double zoom;

  WorldCameraState copyWith({WorldCoordinate? center, double? zoom}) {
    return WorldCameraState(center: center ?? this.center, zoom: zoom ?? this.zoom);
  }

  WorldCameraState clamped() {
    return WorldCameraState(
      center: WorldCoordinate(x: center.x.clamp(0.0, 1.0), y: center.y.clamp(0.0, 1.0)),
      zoom: zoom.clamp(0.8, 5.0),
    );
  }

  Offset worldToScreen(WorldCoordinate coordinate, Size size) {
    final dx = (coordinate.x - center.x) * size.width * zoom + size.width / 2;
    final dy = (coordinate.y - center.y) * size.height * zoom + size.height / 2;
    return Offset(dx, dy);
  }

  WorldCoordinate screenToWorld(Offset offset, Size size) {
    final x = center.x + (offset.dx - size.width / 2) / (size.width * zoom);
    final y = center.y + (offset.dy - size.height / 2) / (size.height * zoom);
    return WorldCoordinate(x: x, y: y);
  }

  WorldCameraState pan(Offset delta, Size size) {
    return WorldCameraState(
      center: WorldCoordinate(
        x: center.x - (delta.dx / (size.width * zoom)),
        y: center.y - (delta.dy / (size.height * zoom)),
      ),
      zoom: zoom,
    ).clamped();
  }

  WorldCameraState scale(double scaleFactor) => copyWith(zoom: zoom * scaleFactor).clamped();
}

Color categoryColor(WorldNodeCategory category) {
  return switch (category) {
    WorldNodeCategory.encounter => const Color(0xFFFF6F61),
    WorldNodeCategory.resource => const Color(0xFF4CD39B),
    WorldNodeCategory.mission => const Color(0xFF68B6FF),
    WorldNodeCategory.shop => const Color(0xFFFFC84B),
    WorldNodeCategory.event => const Color(0xFFE38CFF),
    WorldNodeCategory.rest => const Color(0xFF8BE0F7),
    WorldNodeCategory.rare => const Color(0xFFFFA4A4),
    WorldNodeCategory.boss => const Color(0xFFFF3E66),
    WorldNodeCategory.settlement => const Color(0xFFF3E8B0),
  };
}

int seededHash(int seed, int x, int y, [int salt = 0]) {
  final value = seed ^ (x * 374761393) ^ (y * 668265263) ^ salt;
  return value & 0x7fffffff;
}

double seededUnit(int seed, int x, int y, [int salt = 0]) {
  final h = seededHash(seed, x, y, salt);
  return (h % 10000) / 10000;
}

double routeDistance(WorldCoordinate a, WorldCoordinate b) {
  final dx = a.x - b.x;
  final dy = a.y - b.y;
  return math.sqrt(dx * dx + dy * dy);
}
