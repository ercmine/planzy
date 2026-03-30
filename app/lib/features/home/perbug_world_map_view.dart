import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlong;

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
    this.showDebugOverlay = kDebugMode,
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
  final bool showDebugOverlay;

  @override
  State<PerbugWorldMapView> createState() => _PerbugWorldMapViewState();
}

class _PerbugWorldMapViewState extends State<PerbugWorldMapView> with SingleTickerProviderStateMixin {
  static const _engine = PerbugWorldMapEngine();

  late final AnimationController _pulse;
  late final MapController _mapController;
  late final ValueNotifier<int> _paintTick;
  String? _hoverNodeId;
  bool _mapBootstrapped = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat();
    _mapController = MapController();
    _paintTick = ValueNotifier<int>(0);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _mapBootstrapped = true);
    });
  }

  @override
  void didUpdateWidget(covariant PerbugWorldMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.viewport.isSimilarTo(oldWidget.viewport, centerThreshold: 0.0002, zoomThreshold: 0.001)) {
      _mapController.move(
        latlong.LatLng(widget.viewport.centerLat, widget.viewport.centerLng),
        widget.viewport.zoom,
      );
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    _paintTick.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasLiveNodes = widget.nodes.isNotEmpty;
    final sourceNodes = hasLiveNodes ? widget.nodes : _demoNodes(widget.viewport);
    final sourceConnections = hasLiveNodes ? widget.connections : _demoConnections(sourceNodes);
    final rawSnapshot = _engine.build(viewport: widget.viewport, nodes: sourceNodes, graph: sourceConnections);
    final safeSnapshot = rawSnapshot.visibleNodes.isNotEmpty
        ? rawSnapshot
        : _engine.build(
            viewport: widget.viewport,
            nodes: _demoNodes(widget.viewport),
            graph: _demoConnections(_demoNodes(widget.viewport)),
          );
    final renderMode = hasLiveNodes ? 'real' : 'demo';

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
          final hasInvalidSize = width <= 0 || height <= 0;

          return Stack(
            children: [
              Positioned.fill(
                child: _buildFallbackBaseSurface(),
              ),
              Positioned.fill(
                child: _buildBaseMap(),
              ),
              Positioned.fill(
                child: IgnorePointer(
                  ignoring: true,
                  child: AnimatedBuilder(
                    animation: _pulse,
                    builder: (context, child) {
                      return CustomPaint(
                        painter: _PerbugWorldPainter(
                          viewport: widget.viewport,
                          snapshot: safeSnapshot,
                          currentNodeId: widget.currentNodeId ?? (safeSnapshot.visibleNodes.isEmpty ? null : safeSnapshot.visibleNodes.first.id),
                          selectedNodeId: widget.selectedNodeId ?? _hoverNodeId,
                          hoverNodeId: _hoverNodeId,
                          reachableNodeIds: widget.reachableNodeIds.isEmpty
                              ? safeSnapshot.visibleNodes.take(4).map((n) => n.id).toSet()
                              : widget.reachableNodeIds,
                          completedNodeIds: widget.completedNodeIds,
                          pulse: _pulse.value,
                          textStyle: Theme.of(context).textTheme.labelSmall ?? const TextStyle(fontSize: 11),
                          showDebugOverlay: widget.showDebugOverlay,
                          onPainted: () => _paintTick.value = _paintTick.value + 1,
                        ),
                        child: const SizedBox.expand(),
                      );
                    },
                  ),
                ),
              ),
              Positioned.fill(
                child: MouseRegion(
                  onHover: (event) {
                    final id = _hoveredNodeAt(event.localPosition, size, safeSnapshot);
                    if (id != _hoverNodeId) {
                      setState(() => _hoverNodeId = id);
                    }
                  },
                  onExit: (_) => setState(() => _hoverNodeId = null),
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapUp: (details) => _onTap(details.localPosition, size, safeSnapshot),
                  ),
                ),
              ),
              if (!_mapBootstrapped)
                const Positioned(
                  left: 12,
                  bottom: 12,
                  child: _DebugStatusChip(
                    label: 'MAP LOADING',
                    color: Color(0xFFF59E0B),
                  ),
                ),
              if (hasInvalidSize)
                const Positioned(
                  left: 12,
                  bottom: 12,
                  child: _DebugStatusChip(
                    label: 'MAP ERROR: invalid viewport size',
                    color: Color(0xFFEF4444),
                  ),
                ),
              Positioned(
                left: 10,
                top: 10,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.36),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white.withOpacity(0.16)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    child: Text(
                      hasLiveNodes ? 'Live tactical region' : 'Demo frontier fallback',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white),
                    ),
                  ),
                ),
              ),
              if (widget.showDebugOverlay)
                Positioned(
                  right: 10,
                  bottom: 10,
                  child: ValueListenableBuilder<int>(
                    valueListenable: _paintTick,
                    builder: (context, tick, _) {
                      return _DebugStatePanel(
                        size: size,
                        viewport: widget.viewport,
                        nodeCount: safeSnapshot.visibleNodes.length,
                        mode: renderMode,
                        painterTick: tick,
                        routeName: ModalRoute.of(context)?.settings.name ?? '/live-map',
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFallbackBaseSurface() {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF10203C), Color(0xFF1E3A5F), Color(0xFF0A4D3F)],
        ),
      ),
      child: CustomPaint(painter: _DebugGridPainter()),
    );
  }

  Widget _buildBaseMap() {
    return Opacity(
      opacity: 0.92,
      child: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: latlong.LatLng(widget.viewport.centerLat, widget.viewport.centerLng),
          initialZoom: widget.viewport.zoom,
          minZoom: 3.5,
          maxZoom: 17,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.drag | InteractiveFlag.pinchZoom | InteractiveFlag.doubleTapZoom,
          ),
          onPositionChanged: (position, hasGesture) {
            final center = position.center;
            final zoom = position.zoom;
            if (center == null || zoom == null) return;
            widget.onViewportChanged(
              MapViewport(centerLat: center.latitude, centerLng: center.longitude, zoom: zoom),
              hasGesture: hasGesture,
            );
          },
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.perbug.app',
            maxZoom: 19,
          ),
        ],
      ),
    );
  }

  void _onTap(Offset tap, Size size, PerbugWorldMapSnapshot snapshot) {
    final closest = _hoveredNodeAt(tap, size, snapshot);
    if (closest != null) {
      widget.onNodeSelected(closest);
    } else {
      widget.onTapEmpty();
    }
  }

  String? _hoveredNodeAt(Offset tap, Size size, PerbugWorldMapSnapshot snapshot) {
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

    return closestDistance <= 28 ? closest : null;
  }

  List<PerbugNode> _demoNodes(MapViewport viewport) {
    const types = PerbugNodeType.values;
    return List<PerbugNode>.generate(types.length, (index) {
      final ring = 0.015 + ((index % 3) * 0.009);
      final angle = (index / types.length) * math.pi * 2;
      final lat = viewport.centerLat + math.sin(angle) * ring;
      final lng = viewport.centerLng + math.cos(angle) * ring;
      return PerbugNode(
        id: 'demo_$index',
        placeId: 'demo_$index',
        label: '${types[index].name.toUpperCase()} Spire',
        latitude: lat,
        longitude: lng,
        region: 'Demo Realm',
        city: 'Perbug',
        neighborhood: 'Shard ${index + 1}',
        country: 'Web',
        nodeType: types[index],
        difficulty: (index % 5) + 1,
        state: PerbugNodeState.available,
        energyReward: 2,
        movementCost: 2,
        rarityScore: types[index] == PerbugNodeType.boss || types[index] == PerbugNodeType.rare ? 0.95 : 0.3,
        tags: const {'demo', 'fallback'},
        metadata: const {'source': 'web_fallback'},
      );
    });
  }

  Map<String, Set<String>> _demoConnections(List<PerbugNode> nodes) {
    final graph = <String, Set<String>>{};
    for (var i = 0; i < nodes.length; i++) {
      final current = nodes[i].id;
      final next = nodes[(i + 1) % nodes.length].id;
      graph.putIfAbsent(current, () => <String>{}).add(next);
      graph.putIfAbsent(next, () => <String>{}).add(current);
    }
    return graph;
  }
}

class _PerbugWorldPainter extends CustomPainter {
  _PerbugWorldPainter({
    required this.viewport,
    required this.snapshot,
    required this.currentNodeId,
    required this.selectedNodeId,
    required this.hoverNodeId,
    required this.reachableNodeIds,
    required this.completedNodeIds,
    required this.textStyle,
    required this.pulse,
    required this.showDebugOverlay,
    required this.onPainted,
  });

  final MapViewport viewport;
  final PerbugWorldMapSnapshot snapshot;
  final String? currentNodeId;
  final String? selectedNodeId;
  final String? hoverNodeId;
  final Set<String> reachableNodeIds;
  final Set<String> completedNodeIds;
  final TextStyle textStyle;
  final double pulse;
  final bool showDebugOverlay;
  final VoidCallback onPainted;

  @override
  void paint(Canvas canvas, Size size) {
    onPainted();
    final rect = Offset.zero & size;
    _paintBackdropTint(canvas, rect);
    _paintFog(canvas, rect);
    _paintConnections(canvas, size);
    _paintSelectedPath(canvas, size);
    _paintNodes(canvas, size);
    _paintPlayerPresence(canvas, size);
    if (showDebugOverlay) {
      _paintDebugLayer(canvas, size);
    }
  }

  void _paintBackdropTint(Canvas canvas, Rect rect) {
    final palette = snapshot.regionTheme.palette.map((value) => Color(value)).toList(growable: false);
    final tint = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        palette.first.withOpacity(0.18),
        palette[1].withOpacity(0.12),
        Colors.black.withOpacity(0.18),
      ],
    );
    canvas.drawRect(rect, Paint()..shader = tint.createShader(rect));
  }

  void _paintFog(Canvas canvas, Rect rect) {
    final fog = snapshot.regionTheme.fogIntensity;
    if (fog <= 0) return;
    final shader = RadialGradient(
      center: const Alignment(0, -0.3),
      radius: 1.1,
      colors: [
        Colors.transparent,
        Colors.black.withOpacity((0.1 + fog * 0.2).clamp(0, 0.35)),
      ],
      stops: const [0.58, 1],
    ).createShader(rect);
    canvas.drawRect(rect, Paint()..shader = shader);
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
        ..color = reachable ? const Color(0xFF7CE0C8).withOpacity(0.8) : Colors.white.withOpacity(0.28)
        ..strokeWidth = reachable ? 2.8 : 1.6;
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
      final hovered = node.id == hoverNodeId;
      final completed = completedNodeIds.contains(node.id);
      final reachable = reachableNodeIds.contains(node.id);

      final pulseScale = selected || hovered ? (1 + 0.08 * math.sin(pulse * math.pi * 2)) : 1.0;

      if (node.nodeType == PerbugNodeType.rare || node.nodeType == PerbugNodeType.event || node.nodeType == PerbugNodeType.boss) {
        canvas.drawCircle(
          center,
          (selected ? 28 : 22) * pulseScale,
          Paint()..color = visual.color.withOpacity(0.16),
        );
      }

      canvas.drawCircle(
        center,
        (selected ? 16 : 12) * pulseScale,
        Paint()..color = visual.color.withOpacity(selected || hovered ? 0.95 : 0.72),
      );
      canvas.drawCircle(
        center,
        (selected ? 20 : 14) * pulseScale,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = current ? 3 : (hovered ? 2.4 : 1.6)
          ..color = current
              ? const Color(0xFFFFD166)
              : (reachable ? Colors.white.withOpacity(0.95) : Colors.white.withOpacity(0.38)),
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
            color: Colors.white.withOpacity(0.92),
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
        ..color = const Color(0xFF9DE4D9).withOpacity(0.48),
    );

    canvas.drawCircle(
      center,
      12,
      Paint()..color = const Color(0xFFFFF4B5),
    );
    canvas.drawCircle(
      center,
      18 + (2.2 * math.sin(pulse * math.pi * 2)),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.2
        ..color = const Color(0xFFFFD166),
    );
  }

  void _paintDebugLayer(Canvas canvas, Size size) {
    final projection = PerbugGeoProjection(viewport);
    for (final node in snapshot.visibleNodes) {
      final projected = projection.project(PerbugGeoPoint(lat: node.latitude, lng: node.longitude));
      final center = Offset(projected.x * size.width, projected.y * size.height);
      canvas.drawCircle(
        center,
        28,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.8
          ..color = Colors.white.withOpacity(0.35),
      );
    }

    final debugText = TextPainter(
      text: TextSpan(
        text: 'center ${viewport.centerLat.toStringAsFixed(4)}, ${viewport.centerLng.toStringAsFixed(4)}\n'
            'zoom ${viewport.zoom.toStringAsFixed(2)} • nodes ${snapshot.visibleNodes.length}',
        style: textStyle.copyWith(color: Colors.white.withOpacity(0.86), fontSize: 10),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 2,
    )..layout(maxWidth: size.width - 16);
    debugText.paint(canvas, const Offset(8, 8));
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
        oldDelegate.hoverNodeId != hoverNodeId ||
        oldDelegate.reachableNodeIds != reachableNodeIds ||
        oldDelegate.completedNodeIds != completedNodeIds ||
        oldDelegate.showDebugOverlay != showDebugOverlay ||
        oldDelegate.pulse != pulse;
  }
}

class _DebugStatusChip extends StatelessWidget {
  const _DebugStatusChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: color.withOpacity(0.92), borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 11)),
      ),
    );
  }
}

class _DebugStatePanel extends StatelessWidget {
  const _DebugStatePanel({
    required this.size,
    required this.viewport,
    required this.nodeCount,
    required this.mode,
    required this.painterTick,
    required this.routeName,
  });

  final Size size;
  final MapViewport viewport;
  final int nodeCount;
  final String mode;
  final int painterTick;
  final String routeName;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.52),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.22)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: DefaultTextStyle(
          style: const TextStyle(color: Colors.white, fontSize: 10.5, height: 1.3),
          child: Text(
            'route: $routeName\n'
            'viewport: ${size.width.toStringAsFixed(0)}x${size.height.toStringAsFixed(0)}\n'
            'mode: $mode • nodes: $nodeCount\n'
            'center: ${viewport.centerLat.toStringAsFixed(4)}, ${viewport.centerLng.toStringAsFixed(4)}\n'
            'zoom: ${viewport.zoom.toStringAsFixed(2)}\n'
            'painter tick: $painterTick',
          ),
        ),
      ),
    );
  }
}

class _DebugGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.08)
      ..strokeWidth = 1;
    const step = 36.0;
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
