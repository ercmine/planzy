import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import 'map_discovery_models.dart';
import 'perbug_asset_registry.dart';
import 'perbug_game_models.dart';
import 'perbug_render_engine.dart';
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
  static final _engine = PerbugWorldMapEngine();
  static const _renderEngine = PerbugRenderEngine();

  late final AnimationController _pulse;
  late final ValueNotifier<int> _paintTick;
  late _PerbugCameraState _camera;
  _PerbugCameraGesture? _gesture;
  String? _hoverNodeId;
  bool _cameraBootstrapped = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat();
    _paintTick = ValueNotifier<int>(0);
    _camera = _PerbugCameraState.fromViewport(widget.viewport);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _cameraBootstrapped = true);
    });
  }

  @override
  void didUpdateWidget(covariant PerbugWorldMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    final wasLive = oldWidget.nodes.isNotEmpty;
    final isLive = widget.nodes.isNotEmpty;
    if (wasLive != isLive) {
      _engine.resetStreaming();
    }
    final cameraViewport = _camera.toViewport();
    if (_gesture == null && !widget.viewport.isSimilarTo(cameraViewport, centerThreshold: 0.0002, zoomThreshold: 0.001)) {
      _camera = _PerbugCameraState.fromViewport(widget.viewport);
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
    final sourceNodes = hasLiveNodes ? widget.nodes : _demoNodes(_camera.toViewport());
    final sourceConnections = hasLiveNodes ? widget.connections : _demoConnections(sourceNodes);
    final rawSnapshot = _engine.build(
      viewport: _camera.toViewport(),
      nodes: sourceNodes,
      graph: sourceConnections,
      mode: hasLiveNodes ? PerbugWorldRuntimeMode.real : PerbugWorldRuntimeMode.demo,
    );
    final safeSnapshot = rawSnapshot.visibleNodes.isNotEmpty
        ? rawSnapshot
        : _engine.build(
            viewport: _camera.toViewport(),
            nodes: _demoNodes(_camera.toViewport()),
            graph: _demoConnections(_demoNodes(_camera.toViewport())),
            mode: PerbugWorldRuntimeMode.demo,
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
          final cameraViewport = _camera.toViewport();

          return Listener(
            onPointerSignal: (event) {
              if (event is PointerScrollEvent && event.scrollDelta.dy != 0) {
                _onScrollZoom(event.scrollDelta.dy, size);
              }
            },
            child: Stack(
              children: [
                Positioned.fill(child: _buildFallbackBaseSurface()),
                Positioned.fill(
                  child: IgnorePointer(
                    ignoring: true,
                    child: AnimatedBuilder(
                      animation: _pulse,
                      builder: (context, child) {
                        return CustomPaint(
                          painter: _PerbugWorldPainter(
                            viewport: cameraViewport,
                            snapshot: safeSnapshot,
                            renderEngine: _renderEngine,
                            currentNodeId: widget.currentNodeId ??
                                (safeSnapshot.visibleNodes.isEmpty ? null : safeSnapshot.visibleNodes.first.id),
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
                      final id = _hoveredNodeAt(event.localPosition, size, safeSnapshot, cameraViewport);
                      if (id != _hoverNodeId) {
                        setState(() => _hoverNodeId = id);
                      }
                    },
                    onExit: (_) => setState(() => _hoverNodeId = null),
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTapUp: (details) => _onTap(details.localPosition, size, safeSnapshot, cameraViewport),
                      onScaleStart: _startGesture,
                      onScaleUpdate: (details) => _updateGesture(details, size),
                      onScaleEnd: (_) => _endGesture(),
                    ),
                  ),
                ),
                if (!_cameraBootstrapped)
                  const Positioned(
                    left: 12,
                    bottom: 12,
                    child: _DebugStatusChip(
                      label: 'WORLD ENGINE LOADING',
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
                          viewport: cameraViewport,
                          nodeCount: safeSnapshot.visibleNodes.length,
                          chunkCount: (safeSnapshot.debug['total_chunks'] as num?)?.toInt() ?? 0,
                          visibleChunkCount: (safeSnapshot.debug['visible_chunks'] as num?)?.toInt() ?? 0,
                          mode: renderMode,
                          painterTick: tick,
                          routeName: ModalRoute.of(context)?.settings.name ?? '/live-map',
                          selectedNodeId: widget.selectedNodeId,
                          seed: safeSnapshot.debug['seed']?.toString() ?? 'n/a',
                        );
                      },
                    ),
                  ),
              ],
            ),
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
          colors: [Color(0xFF0A122E), Color(0xFF163A53), Color(0xFF1A4E45)],
        ),
      ),
      child: CustomPaint(painter: _DebugGridPainter()),
    );
  }

  void _startGesture(ScaleStartDetails details) {
    _gesture = _PerbugCameraGesture(
      startFocal: details.localFocalPoint,
      startViewport: _camera.toViewport(),
    );
  }

  void _updateGesture(ScaleUpdateDetails details, Size size) {
    final gesture = _gesture;
    if (gesture == null) return;
    final next = _camera
        .fromPanZoom(
          focalDelta: details.localFocalPoint - gesture.startFocal,
          scale: details.scale,
          startViewport: gesture.startViewport,
          canvasSize: size,
        )
        .clamped();
    _camera = next;
    widget.onViewportChanged(_camera.toViewport(), hasGesture: true);
    setState(() {});
  }

  void _endGesture() {
    _gesture = null;
  }

  void _onScrollZoom(double deltaY, Size size) {
    final zoomDelta = (-deltaY / 240).clamp(-0.7, 0.7);
    final next = _camera.copyWith(zoom: _camera.zoom + zoomDelta).clamped();
    if (next == _camera) return;
    _camera = next;
    widget.onViewportChanged(_camera.toViewport(), hasGesture: true);
    setState(() {});
  }

  void _onTap(Offset tap, Size size, PerbugWorldMapSnapshot snapshot, MapViewport viewport) {
    final closest = _hoveredNodeAt(tap, size, snapshot, viewport);
    if (closest != null) {
      widget.onNodeSelected(closest);
    } else {
      widget.onTapEmpty();
    }
  }

  String? _hoveredNodeAt(Offset tap, Size size, PerbugWorldMapSnapshot snapshot, MapViewport viewport) {
    final frame = _renderEngine.composeFrame(
      viewport: viewport,
      canvasSize: size,
      snapshot: snapshot,
      currentNodeId: widget.currentNodeId,
      selectedNodeId: widget.selectedNodeId,
      hoverNodeId: _hoverNodeId,
      reachableNodeIds: widget.reachableNodeIds,
      completedNodeIds: widget.completedNodeIds,
    );
    return frame.hitTest(tap);
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
    required this.renderEngine,
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
  final PerbugRenderEngine renderEngine;
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
    final frame = renderEngine.composeFrame(
      viewport: viewport,
      canvasSize: size,
      snapshot: snapshot,
      currentNodeId: currentNodeId,
      selectedNodeId: selectedNodeId,
      hoverNodeId: hoverNodeId,
      reachableNodeIds: reachableNodeIds,
      completedNodeIds: completedNodeIds,
    );
    final rect = Offset.zero & size;
    _paintBackdropTint(canvas, rect);
    _paintTerrainBands(canvas, rect, size);
    _paintDistrictPlates(canvas, size);
    _paintFog(canvas, rect);
    _paintConnections(canvas, frame);
    _paintSelectedPath(canvas, frame);
    _paintNodes(canvas, frame);
    _paintPlayerPresence(canvas, frame);
    if (showDebugOverlay) {
      _paintDebugLayer(canvas, size, frame);
    }
  }

  void _paintBackdropTint(Canvas canvas, Rect rect) {
    final palette = snapshot.regionTheme.palette.map((value) => Color(value)).toList(growable: false);
    final tint = RadialGradient(
      center: const Alignment(0.2, -0.65),
      radius: 1.2,
      colors: [
        palette.last.withOpacity(0.18),
        palette.first.withOpacity(0.2),
        Colors.black.withOpacity(0.22),
      ],
      stops: const [0, 0.54, 1],
    );
    canvas.drawRect(rect, Paint()..shader = tint.createShader(rect));
  }

  void _paintTerrainBands(Canvas canvas, Rect rect, Size size) {
    final palette = snapshot.regionTheme.palette.map((value) => Color(value)).toList(growable: false);
    for (var i = 0; i < snapshot.terrainBands.length; i++) {
      final band = snapshot.terrainBands[i];
      final path = Path();
      for (double x = 0; x <= size.width; x += 12) {
        final fx = x / size.width;
        final y = (size.height * (0.22 + i * 0.18 + band.latitudeBias)).clamp(0, size.height) +
            math.sin((fx * 7.4) + band.wave * 40 + i * 1.7) * (24 + i * 5);
        if (x == 0) {
          path.moveTo(x, y);
        } else {
          path.lineTo(x, y);
        }
      }
      path
        ..lineTo(size.width, size.height)
        ..lineTo(0, size.height)
        ..close();
      canvas.drawPath(
        path,
        Paint()..color = palette[i % palette.length].withOpacity(0.16 + (i * 0.04)),
      );
    }

    for (var i = 0; i < 26; i++) {
      final dx = (i * 37.0 + viewport.centerLng * 11).remainder(size.width + 70) - 35;
      final dy = ((i * 53.0) + viewport.centerLat * 17).remainder(size.height + 70) - 35;
      canvas.drawCircle(
        Offset(dx, dy),
        1.4 + ((i % 4) * 0.45),
        Paint()..color = Colors.white.withOpacity(0.09 + (i % 5) * 0.012),
      );
    }
  }

  void _paintDistrictPlates(Canvas canvas, Size size) {
    if (snapshot.visibleNodes.isEmpty) return;
    final projection = PerbugGeoProjection(viewport);
    final grouped = <String, List<PerbugNode>>{};
    for (final node in snapshot.visibleNodes) {
      final key = node.neighborhood.isNotEmpty ? node.neighborhood : node.city;
      grouped.putIfAbsent(key, () => <PerbugNode>[]).add(node);
    }

    final paint = Paint()..style = PaintingStyle.fill;
    for (final entry in grouped.entries) {
      if (entry.value.length < 2) continue;
      final points = entry.value
          .map((node) {
            final p = projection.project(PerbugGeoPoint(lat: node.latitude, lng: node.longitude));
            return Offset(p.x * size.width, p.y * size.height);
          })
          .toList(growable: false);
      final center = points.reduce((a, b) => Offset(a.dx + b.dx, a.dy + b.dy)) / points.length.toDouble();
      final radius = points.map((point) => (point - center).distance).reduce(math.max) + 22;
      paint.color = Colors.white.withOpacity(0.05);
      canvas.drawCircle(center, radius, paint);

      final labelPainter = TextPainter(
        text: TextSpan(
          text: entry.key,
          style: textStyle.copyWith(color: Colors.white.withOpacity(0.58), fontSize: 10, fontWeight: FontWeight.w600),
        ),
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 120);
      labelPainter.paint(canvas, center + Offset(-(labelPainter.width / 2), -radius - 14));
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
        Colors.black.withOpacity((0.1 + fog * 0.2).clamp(0, 0.35)),
      ],
      stops: const [0.58, 1],
    ).createShader(rect);
    canvas.drawRect(rect, Paint()..shader = shader);
  }

  void _paintConnections(Canvas canvas, PerbugRenderFrame frame) {
    for (final edge in frame.edges) {
      final fromPx = edge.from.screen.position;
      final toPx = edge.to.screen.position;
      final paint = Paint()
        ..color = edge.reachable ? const Color(0xFF7CE0C8).withOpacity(0.8) : Colors.white.withOpacity(0.28)
        ..strokeWidth = edge.reachable ? 2.8 : 1.6;
      canvas.drawLine(fromPx, toPx, paint);
    }
  }

  void _paintSelectedPath(Canvas canvas, PerbugRenderFrame frame) {
    if (currentNodeId == null || selectedNodeId == null || currentNodeId == selectedNodeId) return;
    final from = _findNode(currentNodeId!, frame);
    final to = _findNode(selectedNodeId!, frame);
    if (from == null || to == null) return;
    final a = from.screen.position;
    final b = to.screen.position;
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

  void _paintNodes(Canvas canvas, PerbugRenderFrame frame) {
    for (final renderNode in frame.nodes) {
      final node = renderNode.node;
      final center = renderNode.screen.position;
      final visual = PerbugAssetRegistry.nodeVisual(node.nodeType);
      final current = renderNode.isCurrent;
      final selected = renderNode.isSelected;
      final hovered = renderNode.isHovered;
      final completed = renderNode.isCompleted;
      final reachable = renderNode.isReachable;

      final pulseScale = selected || hovered ? (1 + 0.08 * math.sin(pulse * math.pi * 2)) : 1.0;

      if (node.nodeType == PerbugNodeType.rare || node.nodeType == PerbugNodeType.event || node.nodeType == PerbugNodeType.boss) {
        canvas.drawCircle(
          center,
          (selected ? 28 : 22) * pulseScale,
          Paint()..color = visual.color.withOpacity(0.16),
        );
      }

      canvas.drawCircle(center, renderNode.radius * pulseScale, Paint()..color = visual.color.withOpacity(selected || hovered ? 0.95 : 0.72));
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

  void _paintPlayerPresence(Canvas canvas, PerbugRenderFrame frame) {
    if (currentNodeId == null) return;
    final currentNode = _findNode(currentNodeId!, frame);
    if (currentNode == null) return;
    final center = currentNode.screen.position;

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

  void _paintDebugLayer(Canvas canvas, Size size, PerbugRenderFrame frame) {
    final projection = PerbugGeoProjection(viewport);
    for (final chunk in snapshot.chunks) {
      final topLeft = projection.project(PerbugGeoPoint(lat: chunk.bounds.maxLat, lng: chunk.bounds.minLng));
      final bottomRight = projection.project(PerbugGeoPoint(lat: chunk.bounds.minLat, lng: chunk.bounds.maxLng));
      final rect = Rect.fromLTRB(
        topLeft.x * size.width,
        topLeft.y * size.height,
        bottomRight.x * size.width,
        bottomRight.y * size.height,
      );
      final color = switch (chunk.band) {
        ChunkStreamingBand.visible => const Color(0xFF34D399),
        ChunkStreamingBand.prefetch => const Color(0xFF60A5FA),
        ChunkStreamingBand.retention => const Color(0xFFF59E0B),
        ChunkStreamingBand.outside => Colors.grey,
      };
      canvas.drawRect(
        rect,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = color.withOpacity(0.68),
      );
      final chunkLabel = TextPainter(
        text: TextSpan(
          text: '${chunk.id.value} ${chunk.lifecycle.name} (${chunk.nodes.length})',
          style: textStyle.copyWith(color: color, fontSize: 8.5, fontWeight: FontWeight.w700),
        ),
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 130);
      chunkLabel.paint(canvas, rect.topLeft + const Offset(2, 2));
    }

    for (final node in frame.nodes) {
      final center = node.screen.position;
      canvas.drawCircle(
        center,
        30,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 0.8
          ..color = Colors.white.withOpacity(0.35),
      );
    }

    final debugText = TextPainter(
      text: TextSpan(
        text: 'center ${viewport.centerLat.toStringAsFixed(4)}, ${viewport.centerLng.toStringAsFixed(4)}\n'
            'zoom ${viewport.zoom.toStringAsFixed(2)} • visible ${(snapshot.debug['visible_chunks'] as num?)?.toInt() ?? 0} • prefetch ${(snapshot.debug['prefetch_chunks'] as num?)?.toInt() ?? 0} • retained ${(snapshot.debug['retained_chunks'] as num?)?.toInt() ?? 0}\n'
            'ready ${(snapshot.debug['ready_chunks'] as num?)?.toInt() ?? 0} • pending ${(snapshot.debug['pending_visible_chunks'] as num?)?.toInt() ?? 0} • atmosphere ${((frame.debug['atmosphere'] as num?) ?? 0).toDouble().toStringAsFixed(2)}',
        style: textStyle.copyWith(color: Colors.white.withOpacity(0.86), fontSize: 10),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 4,
    )..layout(maxWidth: size.width - 16);
    debugText.paint(canvas, const Offset(8, 8));
  }

  PerbugRenderNode? _findNode(String id, PerbugRenderFrame frame) {
    for (final node in frame.nodes) {
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
        oldDelegate.renderEngine != renderEngine ||
        oldDelegate.selectedNodeId != selectedNodeId ||
        oldDelegate.currentNodeId != currentNodeId ||
        oldDelegate.hoverNodeId != hoverNodeId ||
        oldDelegate.reachableNodeIds != reachableNodeIds ||
        oldDelegate.completedNodeIds != completedNodeIds ||
        oldDelegate.showDebugOverlay != showDebugOverlay ||
        oldDelegate.pulse != pulse;
  }
}

class _PerbugCameraState {
  const _PerbugCameraState({required this.centerLat, required this.centerLng, required this.zoom});

  factory _PerbugCameraState.fromViewport(MapViewport viewport) {
    return _PerbugCameraState(centerLat: viewport.centerLat, centerLng: viewport.centerLng, zoom: viewport.zoom);
  }

  final double centerLat;
  final double centerLng;
  final double zoom;

  MapViewport toViewport() => MapViewport(centerLat: centerLat, centerLng: centerLng, zoom: zoom);

  _PerbugCameraState copyWith({double? centerLat, double? centerLng, double? zoom}) {
    return _PerbugCameraState(
      centerLat: centerLat ?? this.centerLat,
      centerLng: centerLng ?? this.centerLng,
      zoom: zoom ?? this.zoom,
    );
  }

  _PerbugCameraState fromPanZoom({
    required Offset focalDelta,
    required double scale,
    required MapViewport startViewport,
    required Size canvasSize,
  }) {
    final safeWidth = canvasSize.width <= 1 ? 1 : canvasSize.width;
    final safeHeight = canvasSize.height <= 1 ? 1 : canvasSize.height;
    final zoomOffset = math.log(scale.clamp(0.4, 2.6)) / math.ln2;
    final nextZoom = (startViewport.zoom + (zoomOffset * 1.1)).clamp(4.3, 16.8);
    final worldAtStart = startViewport;
    final nextCenterLng = startViewport.centerLng - (focalDelta.dx / safeWidth) * worldAtStart.lngSpan;
    final nextCenterLat = startViewport.centerLat + (focalDelta.dy / safeHeight) * worldAtStart.latSpan;
    return _PerbugCameraState(centerLat: nextCenterLat, centerLng: nextCenterLng, zoom: nextZoom.toDouble());
  }

  _PerbugCameraState clamped() {
    var lng = centerLng;
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    return _PerbugCameraState(
      centerLat: centerLat.clamp(-80.0, 80.0).toDouble(),
      centerLng: lng,
      zoom: zoom.clamp(4.3, 16.8).toDouble(),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is _PerbugCameraState &&
        (other.centerLat - centerLat).abs() < 0.000001 &&
        (other.centerLng - centerLng).abs() < 0.000001 &&
        (other.zoom - zoom).abs() < 0.000001;
  }

  @override
  int get hashCode => Object.hash(centerLat, centerLng, zoom);
}

class _PerbugCameraGesture {
  const _PerbugCameraGesture({required this.startFocal, required this.startViewport});

  final Offset startFocal;
  final MapViewport startViewport;
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
    required this.chunkCount,
    required this.visibleChunkCount,
    required this.mode,
    required this.painterTick,
    required this.routeName,
    required this.selectedNodeId,
    required this.seed,
  });

  final Size size;
  final MapViewport viewport;
  final int nodeCount;
  final int chunkCount;
  final int visibleChunkCount;
  final String mode;
  final int painterTick;
  final String routeName;
  final String? selectedNodeId;
  final String seed;

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
            'chunks: $visibleChunkCount visible / $chunkCount total\n'
            'center: ${viewport.centerLat.toStringAsFixed(4)}, ${viewport.centerLng.toStringAsFixed(4)}\n'
            'zoom: ${viewport.zoom.toStringAsFixed(2)}\n'
            'seed: $seed\n'
            'selected: ${selectedNodeId ?? 'none'}\n'
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
