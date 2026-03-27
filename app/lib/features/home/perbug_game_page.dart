import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/widgets.dart';
import '../puzzles/grid_path_puzzle_sheet.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';

class PerbugGamePage extends ConsumerStatefulWidget {
  const PerbugGamePage({super.key});

  @override
  ConsumerState<PerbugGamePage> createState() => _PerbugGamePageState();
}

class _PerbugGamePageState extends ConsumerState<PerbugGamePage> {
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
    final currentProgress = state.currentNode == null ? null : state.puzzleProgressByNode[state.currentNode!.id];

    return RefreshIndicator(
      onRefresh: controller.initialize,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const PremiumHeader(
            title: 'Perbug World Board',
            subtitle: 'Jump between real-world nodes, spend energy, and solve node puzzles.',
            badge: AppPill(label: 'Grid Path live', icon: Icons.extension_rounded),
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
            title: 'Node puzzle: Perbug Grid Path',
            subtitle: 'Deterministic from node latitude/longitude with tunable difficulty knobs.',
            children: [
              if (state.currentNode != null)
                Text('Current node seed: ${state.currentNode!.latitude.toStringAsFixed(4)}, ${state.currentNode!.longitude.toStringAsFixed(4)}'),
              if (currentProgress != null)
                Text(
                  'Progress • completed: ${currentProgress.completed} • attempts: ${currentProgress.attemptCount} '
                  '• best: ${currentProgress.bestDuration?.inSeconds ?? '-'}s',
                ),
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: state.currentNode == null
                    ? null
                    : () {
                        controller.launchPuzzleForCurrentNode();
                        _openPuzzleSheet(context);
                      },
                icon: const Icon(Icons.grid_4x4_rounded),
                label: const Text('Open Grid Path puzzle'),
              ),
            ],
          ),
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
                              final ok = await controller.jumpTo(move);
                              if (!context.mounted) return;
                              if (ok) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Jumped to ${move.node.label}')),
                                );
                              }
                            }
                          : null,
                      child: Text('Jump (${move.energyCost})'),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
        ],
      ),
    );
  }

  Future<void> _openPuzzleSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return Consumer(
          builder: (context, ref, _) {
            final session = ref.watch(perbugGameControllerProvider).puzzleSession;
            final controller = ref.read(perbugGameControllerProvider.notifier);
            if (session == null) return const SizedBox.shrink();
            return FractionallySizedBox(
              heightFactor: 0.95,
              child: GridPathPuzzleSheet(
                session: session,
                onStart: controller.startActivePuzzle,
                onTapCell: controller.tapPuzzleCell,
                onUndo: controller.undoPuzzleMove,
                onReset: controller.resetPuzzleSession,
                onAbandon: controller.abandonPuzzleSession,
                onClose: () {
                  controller.clearPuzzleSession();
                  Navigator.of(context).pop();
                },
              ),
            );
          },
        );
      },
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
