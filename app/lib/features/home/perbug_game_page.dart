import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/widgets.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';
import 'puzzles/perbug_puzzle_framework.dart';
import 'puzzles/perbug_symbol_match_screen.dart';

class PerbugGamePage extends ConsumerStatefulWidget {
  const PerbugGamePage({super.key});

  @override
  ConsumerState<PerbugGamePage> createState() => _PerbugGamePageState();
}

class _PerbugGamePageState extends ConsumerState<PerbugGamePage> {
  Future<void> _openMovePuzzle({
    required BuildContext context,
    required PerbugMoveCandidate move,
    required PerbugGameController controller,
  }) async {
    final puzzle = controller.buildSymbolMatchPuzzleForNode(move.node);
    final result = await showModalBottomSheet<PuzzleResult>(
      context: context,
      isScrollControlled: true,
      builder: (_) => SymbolMatchPuzzleSheet(
        node: move.node,
        puzzle: puzzle,
        onEvent: (event, data) => controller.recordPuzzleEvent(type: event, nodeId: move.node.id, payload: data),
      ),
    );

    if (!mounted || result == null) return;
    controller.finalizePuzzleResult(node: move.node, result: result);
    if (result.success) {
      final ok = await controller.jumpTo(move);
      if (!mounted) return;
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Puzzle cleared. Jumped to ${move.node.label}.')),
        );
      }
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(result.failureReason ?? 'Puzzle failed. Jump cancelled.')),
    );
  }

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() => ref.read(perbugGameControllerProvider.notifier).initialize());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(perbugGameControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);
    final moves = state.reachableMoves().take(8).toList(growable: false);

    return RefreshIndicator(
      onRefresh: controller.initialize,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const PremiumHeader(
            title: 'Perbug World Board',
            subtitle: 'Jump between real-world nodes, spend energy, and expand your route.',
            badge: AppPill(label: 'Fixed 2D mode', icon: Icons.grid_3x3),
          ),
          const SizedBox(height: 12),
          AppCard(
            tone: AppCardTone.featured,
            child: Row(
              children: [
                Expanded(
                  child: _EnergyMeter(current: state.energy, max: state.maxEnergy),
                ),
                const SizedBox(width: 8),
                SecondaryButton(label: '+Energy', onPressed: controller.claimPassiveEnergy),
              ],
            ),
          ),
          const SizedBox(height: 12),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('World board (fixed zoom)', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                SizedBox(
                  height: 240,
                  child: CustomPaint(
                    painter: _BoardPainter(state: state),
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF101527),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text('Current node: ${state.currentNode?.label ?? '—'} • Jump range ${(state.maxJumpMeters / 1000).toStringAsFixed(1)}km'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (state.loading) const AppCard(child: LinearProgressIndicator()),
          if (state.error != null) AppCard(child: Text(state.error!)),
          _Section(
            title: 'Reachable jumps',
            subtitle: 'Movement is restricted by distance and energy. No unrestricted teleporting.',
            children: moves
                .map(
                  (move) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      move.isReachable ? Icons.radio_button_checked : Icons.block,
                      color: move.isReachable ? Colors.greenAccent : Colors.orangeAccent,
                    ),
                    title: Text(move.node.label),
                    subtitle: Text(
                      '${move.node.region} • ${((move.node.distanceFromCurrentMeters ?? 0) / 1000).toStringAsFixed(2)}km • ${move.reason}',
                    ),
                    trailing: TextButton(
                      onPressed: move.isReachable
                          ? () async {
                              await _openMovePuzzle(context: context, move: move, controller: controller);
                            }
                          : null,
                      child: Text('Challenge (${move.energyCost})'),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
          _Section(
            title: 'Upcoming node challenge slots',
            subtitle: 'Puzzle systems are not enabled yet, but node states and rewards are puzzle-ready.',
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: const [
                  AppPill(label: 'available', icon: Icons.check_circle_outline),
                  AppPill(label: 'completed', icon: Icons.task_alt),
                  AppPill(label: 'locked', icon: Icons.lock_outline),
                  AppPill(label: 'future-challenge-ready', icon: Icons.extension_outlined),
                ],
              ),
            ],
          ),
          _Section(
            title: 'Puzzle telemetry (debug)',
            subtitle: 'Lifecycle hooks and balancing data emitted from Symbol Match sessions.',
            children: state.puzzleEvents.take(6).map((event) {
              return ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text('${event.type} • ${event.nodeId}'),
                subtitle: Text(event.timestamp.toIso8601String()),
              );
            }).toList(growable: false),
          ),
        ],
      ),
    );
  }
}

class _EnergyMeter extends StatelessWidget {
  const _EnergyMeter({required this.current, required this.max});

  final int current;
  final int max;

  @override
  Widget build(BuildContext context) {
    final ratio = max == 0 ? 0.0 : (current / max).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Energy $current / $max', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 6),
        LinearProgressIndicator(value: ratio, minHeight: 10),
      ],
    );
  }
}

class _BoardPainter extends CustomPainter {
  const _BoardPainter({required this.state});

  final PerbugGameState state;

  @override
  void paint(Canvas canvas, Size size) {
    if (state.nodes.isEmpty) return;
    final lats = state.nodes.map((n) => n.latitude);
    final lngs = state.nodes.map((n) => n.longitude);
    final minLat = lats.reduce(math.min);
    final maxLat = lats.reduce(math.max);
    final minLng = lngs.reduce(math.min);
    final maxLng = lngs.reduce(math.max);

    Offset toPoint(PerbugNode n) {
      final x = ((n.longitude - minLng) / ((maxLng - minLng).abs() + 0.0001)) * (size.width - 32) + 16;
      final y = ((maxLat - n.latitude) / ((maxLat - minLat).abs() + 0.0001)) * (size.height - 32) + 16;
      return Offset(x, y);
    }

    final current = state.currentNode;
    if (current != null) {
      final currentPoint = toPoint(current);
      final linePaint = Paint()
        ..color = const Color(0xFF4E7DFF).withOpacity(0.38)
        ..strokeWidth = 1.4;
      for (final move in state.reachableMoves().where((m) => m.isReachable).take(10)) {
        canvas.drawLine(currentPoint, toPoint(move.node), linePaint);
      }
    }

    for (final node in state.nodes) {
      final p = toPoint(node);
      final isCurrent = node.id == state.currentNodeId;
      final isVisited = state.visitedNodeIds.contains(node.id);
      final fill = Paint()..color = isCurrent ? const Color(0xFFFFD166) : (isVisited ? const Color(0xFF4ECDC4) : const Color(0xFF8D99AE));
      canvas.drawCircle(p, isCurrent ? 7 : 5, fill);
    }
  }

  @override
  bool shouldRepaint(covariant _BoardPainter oldDelegate) => oldDelegate.state != state;
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.subtitle, required this.children});

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(subtitle),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}
