import 'dart:math' as math;
import 'dart:ui';

import 'map_discovery_models.dart';
import 'perbug_game_models.dart';
import 'perbug_world_map_engine.dart';

class PerbugRenderSettings {
  const PerbugRenderSettings({
    this.worldScale = 720,
    this.cameraPitch = 0.9,
    this.baseNodeSize = 12,
    this.nodeHeightScale = 24,
  });

  final double worldScale;
  final double cameraPitch;
  final double baseNodeSize;
  final double nodeHeightScale;
}

class PerbugWorldPoint {
  const PerbugWorldPoint({required this.x, required this.y, required this.z});

  final double x;
  final double y;
  final double z;
}

class PerbugScreenPoint {
  const PerbugScreenPoint({required this.position, required this.depth});

  final Offset position;
  final double depth;
}

class PerbugRenderNode {
  const PerbugRenderNode({
    required this.id,
    required this.node,
    required this.world,
    required this.screen,
    required this.radius,
    required this.isCurrent,
    required this.isSelected,
    required this.isHovered,
    required this.isReachable,
    required this.isCompleted,
    required this.chunkId,
  });

  final String id;
  final PerbugNode node;
  final PerbugWorldPoint world;
  final PerbugScreenPoint screen;
  final double radius;
  final bool isCurrent;
  final bool isSelected;
  final bool isHovered;
  final bool isReachable;
  final bool isCompleted;
  final WorldChunkId chunkId;
}

class PerbugRenderEdge {
  const PerbugRenderEdge({required this.from, required this.to, required this.reachable});

  final PerbugRenderNode from;
  final PerbugRenderNode to;
  final bool reachable;
}

class PerbugRenderFrame {
  const PerbugRenderFrame({
    required this.nodes,
    required this.edges,
    required this.visibleChunks,
    required this.debug,
  });

  final List<PerbugRenderNode> nodes;
  final List<PerbugRenderEdge> edges;
  final List<WorldChunk> visibleChunks;
  final Map<String, Object> debug;

  String? hitTest(Offset point, {double hitPadding = 12}) {
    String? hit;
    var closestDistance = double.infinity;
    for (final node in nodes) {
      final distance = (point - node.screen.position).distance;
      final threshold = node.radius + hitPadding;
      if (distance <= threshold && distance < closestDistance) {
        closestDistance = distance;
        hit = node.id;
      }
    }
    return hit;
  }
}

class PerbugGeoWorldTransformer {
  const PerbugGeoWorldTransformer(this.viewport, this.settings);

  final MapViewport viewport;
  final PerbugRenderSettings settings;

  PerbugWorldPoint toWorld(PerbugNode node) {
    final latDelta = node.latitude - viewport.centerLat;
    final lngDelta = _lngDistance(node.longitude, viewport.centerLng);
    final x = lngDelta * settings.worldScale;
    final z = -latDelta * settings.worldScale;
    final rarityLift = node.rarityScore * settings.nodeHeightScale;
    final typeLift = switch (node.nodeType) {
      PerbugNodeType.boss => 13.0,
      PerbugNodeType.rare => 10.0,
      PerbugNodeType.event => 9.0,
      PerbugNodeType.shop => 6.0,
      _ => 4.0,
    };
    final y = rarityLift + typeLift;
    return PerbugWorldPoint(x: x, y: y, z: z);
  }

  double _lngDistance(double from, double to) {
    var delta = from - to;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  }
}

class PerbugCameraRig {
  const PerbugCameraRig({required this.viewport, required this.settings});

  final MapViewport viewport;
  final PerbugRenderSettings settings;

  PerbugScreenPoint project(PerbugWorldPoint world, Size size) {
    final zoomFactor = (viewport.zoom / 10).clamp(0.6, 1.9);
    final perspective = 1 / (1 + (world.z.abs() * 0.0025));
    final x = (size.width / 2) + (world.x * zoomFactor * perspective);
    final yBase = (size.height * 0.58) + (world.z * settings.cameraPitch * zoomFactor * 0.3);
    final y = yBase - (world.y * zoomFactor * perspective);
    final depth = world.z - (world.y * 0.2);
    return PerbugScreenPoint(position: Offset(x, y), depth: depth);
  }
}

class PerbugRenderEngine {
  const PerbugRenderEngine({this.settings = const PerbugRenderSettings()});

  final PerbugRenderSettings settings;

  PerbugRenderFrame composeFrame({
    required MapViewport viewport,
    required Size canvasSize,
    required PerbugWorldMapSnapshot snapshot,
    required String? currentNodeId,
    required String? selectedNodeId,
    required String? hoverNodeId,
    required Set<String> reachableNodeIds,
    required Set<String> completedNodeIds,
  }) {
    final transformer = PerbugGeoWorldTransformer(viewport, settings);
    final camera = PerbugCameraRig(viewport: viewport, settings: settings);
    final nodeMap = <String, PerbugRenderNode>{};
    final visibleChunks = snapshot.visibleChunks;

    for (final chunk in visibleChunks) {
      for (final node in chunk.nodes) {
        final world = transformer.toWorld(node);
        final screen = camera.project(world, canvasSize);
        final radius = settings.baseNodeSize + (node.rarityScore * 5) + (node.id == selectedNodeId ? 3 : 0);
        nodeMap[node.id] = PerbugRenderNode(
          id: node.id,
          node: node,
          world: world,
          screen: screen,
          radius: radius,
          isCurrent: node.id == currentNodeId,
          isSelected: node.id == selectedNodeId,
          isHovered: node.id == hoverNodeId,
          isReachable: reachableNodeIds.contains(node.id),
          isCompleted: completedNodeIds.contains(node.id),
          chunkId: chunk.id,
        );
      }
    }

    final nodes = nodeMap.values.toList(growable: false)
      ..sort((a, b) {
        final byDepth = a.screen.depth.compareTo(b.screen.depth);
        if (byDepth != 0) return byDepth;
        return a.id.compareTo(b.id);
      });

    final edges = <PerbugRenderEdge>[];
    for (final edge in snapshot.connections) {
      final from = nodeMap[edge.from.id];
      final to = nodeMap[edge.to.id];
      if (from == null || to == null) continue;
      edges.add(
        PerbugRenderEdge(
          from: from,
          to: to,
          reachable: from.isReachable || to.isReachable,
        ),
      );
    }

    final atmosphere =
        (0.5 + (snapshot.regionTheme.magicFlux * 0.4) + math.sin(viewport.centerLat * 0.15) * 0.1).clamp(0.35, 1.0);

    return PerbugRenderFrame(
      nodes: nodes,
      edges: edges,
      visibleChunks: visibleChunks,
      debug: {
        ...snapshot.debug,
        'render_nodes': nodes.length,
        'render_edges': edges.length,
        'painted_objects': nodes.length + edges.length,
        'traversed_chunks': visibleChunks.length,
        'atmosphere': atmosphere,
        'camera_pitch': settings.cameraPitch,
        'world_scale': settings.worldScale,
      },
    );
  }
}
