import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import 'world_map_scene_controller.dart';
import 'world_map_scene_models.dart';

class WorldMapScene extends StatefulWidget {
  const WorldMapScene({
    super.key,
    required this.controller,
    required this.onNodeTapped,
    this.onTapEmpty,
  });

  final WorldMapSceneController controller;
  final ValueChanged<WorldMapNode> onNodeTapped;
  final VoidCallback? onTapEmpty;

  @override
  State<WorldMapScene> createState() => _WorldMapSceneState();
}

class _WorldMapSceneState extends State<WorldMapScene> with SingleTickerProviderStateMixin {
  late final AnimationController _fx;
  Offset? _lastPan;

  @override
  void initState() {
    super.initState();
    _fx = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();
  }

  @override
  void dispose() {
    _fx.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([widget.controller, _fx]),
      builder: (context, _) {
        final state = widget.controller.value;
        return LayoutBuilder(
          builder: (context, constraints) {
            final size = Size(constraints.maxWidth, constraints.maxHeight);
            return Listener(
              onPointerSignal: (event) {
                if (event is PointerScrollEvent) {
                  final factor = math.max(0.7, math.min(1.35, 1 + (-event.scrollDelta.dy / 420)));
                  widget.controller.zoom(factor);
                }
              },
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onScaleStart: (details) => _lastPan = details.focalPoint,
                onScaleUpdate: (details) {
                  if (_lastPan != null) {
                    widget.controller.pan(details.focalPoint - _lastPan!, size);
                    _lastPan = details.focalPoint;
                  }
                  if (details.scale != 1) widget.controller.zoom(details.scale);
                },
                onScaleEnd: (_) => _lastPan = null,
                onTapUp: (details) => _tap(details.localPosition, size, state),
                child: CustomPaint(
                  painter: _WorldMapScenePainter(
                    state: state,
                    pulse: _fx.value,
                    textStyle: Theme.of(context).textTheme.labelSmall ?? const TextStyle(fontSize: 10),
                  ),
                  child: const SizedBox.expand(),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _tap(Offset tap, Size size, WorldMapSceneState state) {
    final node = _hitNode(tap, size, state);
    if (node == null) {
      widget.controller.selectNode(null);
      widget.onTapEmpty?.call();
      return;
    }
    widget.controller.selectNode(node.id);
    widget.onNodeTapped(node);
  }

  WorldMapNode? _hitNode(Offset tap, Size size, WorldMapSceneState state) {
    final camera = state.camera;
    for (final node in state.data.nodes.reversed) {
      final p = camera.worldToScreen(node.coordinate, size);
      if ((p - tap).distance <= 18) return node;
    }
    return null;
  }
}

class _WorldMapScenePainter extends CustomPainter {
  const _WorldMapScenePainter({
    required this.state,
    required this.pulse,
    required this.textStyle,
  });

  final WorldMapSceneState state;
  final double pulse;
  final TextStyle textStyle;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    _paintBackdrop(canvas, rect);
    _paintBiomes(canvas, size);
    _paintDistricts(canvas, size);
    _paintRoutes(canvas, size);
    _paintSpawnables(canvas, size);
    _paintNodes(canvas, size);
    _paintPlayer(canvas, size);
    if (state.showDebug) _paintDebug(canvas, size);
  }

  void _paintBackdrop(Canvas canvas, Rect rect) {
    final region = state.data.chunks.first.region;
    final grad = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [region.palette.first, ...region.palette.reversed],
    );
    canvas.drawRect(rect, Paint()..shader = grad.createShader(rect));
    final fog = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0.0, -0.4),
        radius: 1.2,
        colors: [Colors.transparent, Colors.black.withOpacity(0.24 + region.ambientTone * 0.2)],
      ).createShader(rect);
    canvas.drawRect(rect, fog);
  }

  void _paintBiomes(Canvas canvas, Size size) {
    for (final chunk in state.data.chunks) {
      for (var i = 0; i < chunk.biomes.length; i++) {
        final biome = chunk.biomes[i];
        final paint = Paint()..color = _biomeColor(biome).withOpacity(state.lowSpecMode ? 0.15 : 0.26);
        final center = state.camera.worldToScreen(
          WorldCoordinate(x: 0.5 + chunk.id.x * 0.25, y: 0.5 + chunk.id.y * 0.22),
          size,
        );
        canvas.drawCircle(center, 120 + (i * 38), paint);
      }
    }
  }

  void _paintDistricts(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.stroke;
    for (final district in state.data.districts) {
      final center = state.camera.worldToScreen(district.center, size);
      paint
        ..color = Colors.white.withOpacity(0.1 + district.intensity * 0.2)
        ..strokeWidth = 1.0;
      canvas.drawCircle(center, district.radius * size.shortestSide * state.camera.zoom, paint);
      final tp = TextPainter(
        text: TextSpan(
          text: district.name,
          style: textStyle.copyWith(color: Colors.white.withOpacity(0.66), fontWeight: FontWeight.w600),
        ),
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: 160);
      tp.paint(canvas, center + const Offset(-52, -10));
    }
  }

  void _paintRoutes(Canvas canvas, Size size) {
    final line = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    for (final route in state.data.routes) {
      final path = Path();
      for (var i = 0; i < route.path.length; i++) {
        final p = state.camera.worldToScreen(route.path[i], size);
        if (i == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          path.lineTo(p.dx, p.dy);
        }
      }
      line.color = Colors.white.withOpacity(0.18);
      canvas.drawPath(path, line);
      line
        ..color = const Color(0xFF7FE3FF).withOpacity(0.22 + (math.sin(pulse * math.pi * 2) * 0.06))
        ..strokeWidth = 1;
      canvas.drawPath(path, line);
    }
  }

  void _paintSpawnables(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    for (final chunk in state.data.chunks) {
      for (final item in chunk.spawnables) {
        final p = state.camera.worldToScreen(item.coordinate, size);
        paint.color = Colors.white.withOpacity(0.1 + item.rarity * 0.3);
        canvas.drawCircle(p, 1.2 + item.rarity * 2, paint);
      }
    }
  }

  void _paintNodes(Canvas canvas, Size size) {
    for (final node in state.data.nodes) {
      final isSelected = node.id == state.selectedNodeId;
      final p = state.camera.worldToScreen(node.coordinate, size);
      final color = categoryColor(node.category);
      canvas.drawCircle(p, isSelected ? 16 : 11, Paint()..color = color.withOpacity(0.2));
      canvas.drawCircle(
        p,
        isSelected ? 8 : 6,
        Paint()
          ..color = color
          ..style = PaintingStyle.fill,
      );
      if (isSelected || node.rarity > 0.7) {
        final tp = TextPainter(
          text: TextSpan(
            text: node.label,
            style: textStyle.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
          ),
          textDirection: TextDirection.ltr,
        )..layout(maxWidth: 120);
        tp.paint(canvas, p + const Offset(10, -16));
      }
    }
  }

  void _paintPlayer(Canvas canvas, Size size) {
    final point = state.camera.worldToScreen(state.data.player, size);
    canvas.drawCircle(point, 14, Paint()..color = const Color(0xFF8BE4FF).withOpacity(0.18));
    canvas.drawCircle(point, 7, Paint()..color = const Color(0xFF8BE4FF));
    if (state.data.isDemoMode) {
      final demo = state.camera.worldToScreen(state.data.demo, size);
      canvas.drawCircle(demo, 6, Paint()..color = const Color(0xFFFFD36E));
    }
  }

  void _paintDebug(Canvas canvas, Size size) {
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = Colors.white.withOpacity(0.12);
    for (var i = 0; i <= 10; i++) {
      final dx = size.width * i / 10;
      final dy = size.height * i / 10;
      canvas.drawLine(Offset(dx, 0), Offset(dx, size.height), p);
      canvas.drawLine(Offset(0, dy), Offset(size.width, dy), p);
    }
  }

  Color _biomeColor(WorldBiomeBand biome) {
    return switch (biome) {
      WorldBiomeBand.oceanic => const Color(0xFF2F5B9E),
      WorldBiomeBand.temperate => const Color(0xFF4C9E7A),
      WorldBiomeBand.arid => const Color(0xFFB68847),
      WorldBiomeBand.highland => const Color(0xFF5A6D7F),
      WorldBiomeBand.ruins => const Color(0xFF6B4A7D),
    };
  }

  @override
  bool shouldRepaint(covariant _WorldMapScenePainter oldDelegate) {
    return oldDelegate.state != state || oldDelegate.pulse != pulse;
  }
}
