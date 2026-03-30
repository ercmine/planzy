import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'map_discovery_models.dart';
import 'perbug_asset_registry.dart';
import 'perbug_game_models.dart';
import 'perbug_world_map_engine.dart';

class PerbugWorldMapView extends StatefulWidget {
  const PerbugWorldMapView({
    super.key,
    required this.viewport,
    required this.nodes,
    required this.connections,
    required this.currentNodeId,
    required this.selectedNodeId,
    required this.reachableNodeIds,
    required this.completedNodeIds,
    required this.onViewportChanged,
    required this.onNodeSelected,
    required this.onTapEmpty,
  });

  final MapViewport viewport;
  final List<PerbugNode> nodes;
  final Map<String, Set<String>> connections;
  final String? currentNodeId;
  final String? selectedNodeId;
  final Set<String> reachableNodeIds;
  final Set<String> completedNodeIds;
  final void Function(MapViewport viewport, {required bool hasGesture}) onViewportChanged;
  final void Function(String nodeId) onNodeSelected;
  final VoidCallback onTapEmpty;

  @override
  State<PerbugWorldMapView> createState() => _PerbugWorldMapViewState();
}

class _PerbugWorldMapViewState extends State<PerbugWorldMapView> {
  static const _engine = PerbugWorldMapEngine();

  Offset? _gestureStartFocal;
  MapViewport? _gestureStartViewport;

  @override
  Widget build(BuildContext context) {
    final snapshot = _engine.build(viewport: widget.viewport, nodes: widget.nodes, graph: widget.connections);
    return RepaintBoundary(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.hasBoundedWidth && constraints.maxWidth.isFinite
              ? constraints.maxWidth
              : MediaQuery.sizeOf(context).width;
          final height = constraints.hasBoundedHeight && constraints.maxHeight.isFinite
              ? constraints.maxHeight
              : 320.0;
          final safeWidth = width <= 0 ? 1.0 : width;
          final safeHeight = height <= 0 ? 1.0 : height;
          final size = Size(safeWidth, safeHeight);
          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapUp: (details) => _onTap(details.localPosition, size, snapshot),
            onScaleStart: (details) {
              _gestureStartFocal = details.localFocalPoint;
              _gestureStartViewport = widget.viewport;
            },
            onScaleUpdate: (details) {
              final start = _gestureStartViewport;
              final focal = _gestureStartFocal;
              if (start == null || focal == null) return;
              final zoom = (start.zoom * details.scale).clamp(3.5, 17.0).toDouble();
              final pan = details.localFocalPoint - focal;
              final latPerPixel = start.latSpan / math.max(1.0, size.height);
              final lngPerPixel = start.lngSpan / math.max(1.0, size.width);
              final centerLat = (start.centerLat - pan.dy * latPerPixel).clamp(-85.0, 85.0);
              var centerLng = start.centerLng - pan.dx * lngPerPixel;
              while (centerLng < -180) centerLng += 360;
              while (centerLng > 180) centerLng -= 360;
              widget.onViewportChanged(
                MapViewport(centerLat: centerLat, centerLng: centerLng, zoom: zoom),
                hasGesture: true,
              );
            },
            child: CustomPaint(
              painter: _PerbugWorldPainter(
                viewport: widget.viewport,
                snapshot: snapshot,
                currentNodeId: widget.currentNodeId,
                selectedNodeId: widget.selectedNodeId,
                reachableNodeIds: widget.reachableNodeIds,
                completedNodeIds: widget.completedNodeIds,
                textStyle: Theme.of(context).textTheme.labelSmall ?? const TextStyle(fontSize: 11),
              ),
              child: const SizedBox.expand(),
            ),
          );
        },
      ),
    );
  }

  void _onTap(Offset tap, Size size, PerbugWorldMapSnapshot snapshot) {
    final projection = PerbugGeoProjection(widget.viewport);
    String? closest;
    var closestDistance = double.infinity;

    for (final node in snapshot.visibleNodes) {
      final point = projection.project(PerbugGeoPoint(lat: node.latitude, lng: node.longitude));
      final px = Offset(point.x * size.width, point.y * size.height);
      final distance = (tap - px).distance;
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = node.id;
      }
    }

    if (closest != null && closestDistance <= 24) {
      widget.onNodeSelected(closest);
    } else {
      widget.onTapEmpty();
    }
  }
}

class _PerbugWorldPainter extends CustomPainter {
  _PerbugWorldPainter({
    required this.viewport,
    required this.snapshot,
    required this.currentNodeId,
    required this.selectedNodeId,
    required this.reachableNodeIds,
    required this.completedNodeIds,
    required this.textStyle,
  });

  final MapViewport viewport;
  final PerbugWorldMapSnapshot snapshot;
  final String? currentNodeId;
  final String? selectedNodeId;
  final Set<String> reachableNodeIds;
  final Set<String> completedNodeIds;
  final TextStyle textStyle;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    _paintBackdrop(canvas, rect);
    _paintTerrain(canvas, size);
    _paintFog(canvas, rect);
    _paintGrid(canvas, size);
    _paintConnections(canvas, size);
    _paintSelectedPath(canvas, size);
    _paintNodes(canvas, size);
    _paintPlayerPresence(canvas, size);
  }

  void _paintBackdrop(Canvas canvas, Rect rect) {
    final palette = snapshot.regionTheme.palette.map((value) => Color(value)).toList(growable: false);
    final gradient = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [palette[0], palette[1], palette[2]],
    );
    canvas.drawRect(rect, Paint()..shader = gradient.createShader(rect));
  }

  void _paintTerrain(Canvas canvas, Size size) {
    final palette = snapshot.regionTheme.palette.map((value) => Color(value)).toList(growable: false);
    for (var i = 0; i < snapshot.terrainBands.length; i++) {
      final band = snapshot.terrainBands[i];
      final path = Path();
      for (var x = 0; x <= size.width; x += 8) {
        final nx = x / size.width;
        final wave = math.sin((nx * math.pi * 2 * (1.2 + i * 0.5)) + band.seed) * band.wave;
        final y = size.height * (0.25 + i * 0.18 + band.latitudeBias + wave).clamp(0.0, 1.0);
        if (x == 0) {
          path.moveTo(x.toDouble(), y);
        } else {
          path.lineTo(x.toDouble(), y);
        }
      }
      path.lineTo(size.width, size.height);
      path.lineTo(0, size.height);
      path.close();
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.fill
          ..color = Color.lerp(palette[1], palette.last, i / snapshot.terrainBands.length)!.withOpacity(0.24),
      );
    }
  }

  void _paintFog(Canvas canvas, Rect rect) {
    final fog = snapshot.regionTheme.fogIntensity;
    if (fog <= 0) return;
    final shader = RadialGradient(
      center: const Alignment(0, -0.3),
      radius: 1.1,
      colors: [
        Colors.transparent,
        Colors.black.withOpacity((0.18 + fog * 0.4).clamp(0, 0.5)),
      ],
      stops: const [0.58, 1],
    ).createShader(rect);
    canvas.drawRect(rect, Paint()..shader = shader);
  }

  void _paintGrid(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.08)
      ..strokeWidth = 1;
    for (var i = 0; i <= 8; i++) {
      final y = size.height * i / 8;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
    for (var i = 0; i <= 10; i++) {
      final x = size.width * i / 10;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
  }

  void _paintConnections(Canvas canvas, Size size) {
    final projection = PerbugGeoProjection(viewport);
    for (final edge in snapshot.connections) {
      final from = projection.project(PerbugGeoPoint(lat: edge.from.latitude, lng: edge.from.longitude));
      final to = projection.project(PerbugGeoPoint(lat: edge.to.latitude, lng: edge.to.longitude));
      final fromPx = Offset(from.x * size.width, from.y * size.height);
      final toPx = Offset(to.x * size.width, to.y * size.height);
      final reachable = reachableNodeIds.contains(edge.from.id) || reachableNodeIds.contains(edge.to.id);
      final paint = Paint()
        ..color = reachable ? const Color(0xFF7CE0C8).withOpacity(0.7) : Colors.white.withOpacity(0.25)
        ..strokeWidth = reachable ? 2.4 : 1.4;
      canvas.drawLine(fromPx, toPx, paint);
    }
  }

  void _paintSelectedPath(Canvas canvas, Size size) {
    if (currentNodeId == null || selectedNodeId == null || currentNodeId == selectedNodeId) return;
    final from = _findNode(currentNodeId!);
    final to = _findNode(selectedNodeId!);
    if (from == null || to == null) return;
    final projection = PerbugGeoProjection(viewport);
    final start = projection.project(PerbugGeoPoint(lat: from.latitude, lng: from.longitude));
    final end = projection.project(PerbugGeoPoint(lat: to.latitude, lng: to.longitude));
    final a = Offset(start.x * size.width, start.y * size.height);
    final b = Offset(end.x * size.width, end.y * size.height);
    final mid = Offset((a.dx + b.dx) / 2, (a.dy + b.dy) / 2 - 18);

    final path = Path()
      ..moveTo(a.dx, a.dy)
      ..quadraticBezierTo(mid.dx, mid.dy, b.dx, b.dy);

    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = const Color(0xFFF6C85F).withOpacity(0.9),
    );
  }

  void _paintNodes(Canvas canvas, Size size) {
    final projection = PerbugGeoProjection(viewport);
    for (final node in snapshot.visibleNodes) {
      final projected = projection.project(PerbugGeoPoint(lat: node.latitude, lng: node.longitude));
      final center = Offset(projected.x * size.width, projected.y * size.height);
      final visual = PerbugAssetRegistry.nodeVisual(node.nodeType);
      final current = node.id == currentNodeId;
      final selected = node.id == selectedNodeId;
      final completed = completedNodeIds.contains(node.id);
      final reachable = reachableNodeIds.contains(node.id);

      if (node.nodeType == PerbugNodeType.rare || node.nodeType == PerbugNodeType.event || node.nodeType == PerbugNodeType.boss) {
        canvas.drawCircle(
          center,
          selected ? 26 : 22,
          Paint()..color = visual.color.withOpacity(0.16),
        );
      }

      canvas.drawCircle(
        center,
        selected ? 16 : 12,
        Paint()..color = visual.color.withOpacity(selected ? 0.9 : 0.68),
      );
      canvas.drawCircle(
        center,
        selected ? 20 : 14,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = current ? 3 : 1.6
          ..color = current
              ? const Color(0xFFFFD166)
              : (reachable ? Colors.white.withOpacity(0.9) : Colors.white.withOpacity(0.35)),
      );

      if (completed) {
        canvas.drawCircle(
          center,
          5,
          Paint()..color = const Color(0xFF4ECDC4),
        );
      }

      final semantic = '${node.city.isNotEmpty ? node.city : node.region} · ${node.metadata['category'] ?? node.nodeType.name}';
      final tp = TextPainter(
        text: TextSpan(
          text: '${node.label}\n$semantic',
          style: textStyle.copyWith(
            color: Colors.white.withOpacity(0.9),
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        textDirection: TextDirection.ltr,
        maxLines: 2,
        ellipsis: '…',
      )..layout(maxWidth: 120);
      tp.paint(canvas, center + const Offset(12, -8));
    }
  }

  void _paintPlayerPresence(Canvas canvas, Size size) {
    if (currentNodeId == null) return;
    final currentNode = _findNode(currentNodeId!);
    if (currentNode == null) return;
    final projection = PerbugGeoProjection(viewport);
    final projected = projection.project(PerbugGeoPoint(lat: currentNode.latitude, lng: currentNode.longitude));
    final center = Offset(projected.x * size.width, projected.y * size.height);

    canvas.drawCircle(
      center,
      42,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..color = const Color(0xFF9DE4D9).withOpacity(0.45),
    );

    canvas.drawCircle(
      center,
      12,
      Paint()..color = const Color(0xFFFFF4B5),
    );
    canvas.drawCircle(
      center,
      18,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.2
        ..color = const Color(0xFFFFD166),
    );
  }


  PerbugNode? _findNode(String id) {
    for (final node in snapshot.visibleNodes) {
      if (node.id == id) return node;
    }
    return null;
  }

  @override
  bool shouldRepaint(covariant _PerbugWorldPainter oldDelegate) {
    return oldDelegate.viewport != viewport ||
        oldDelegate.snapshot.visibleNodes != snapshot.visibleNodes ||
        oldDelegate.snapshot.connections != snapshot.connections ||
        oldDelegate.snapshot.regionTheme != snapshot.regionTheme ||
        oldDelegate.selectedNodeId != selectedNodeId ||
        oldDelegate.currentNodeId != currentNodeId ||
        oldDelegate.reachableNodeIds != reachableNodeIds ||
        oldDelegate.completedNodeIds != completedNodeIds;
  }
}
