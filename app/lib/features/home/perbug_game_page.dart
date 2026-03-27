import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/widgets.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';
import 'puzzles/puzzle_framework.dart';
import 'puzzles/sequence_forge_puzzle.dart';

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
          _SequenceForgeSection(state: state, controller: controller),
        ],
      ),
    );
  }
}

class _SequenceForgeSection extends StatelessWidget {
  const _SequenceForgeSection({required this.state, required this.controller});

  final PerbugGameState state;
  final PerbugGameController controller;

  @override
  Widget build(BuildContext context) {
    final session = state.activeSequenceForgeSession;
    if (session == null) {
      return _Section(
        title: 'Puzzle #6 · Perbug Sequence Forge',
        subtitle: 'Deterministic sequence puzzle generated from current node latitude/longitude.',
        children: [
          PrimaryButton(
            label: 'Generate Sequence Forge',
            onPressed: controller.launchSequenceForgeForCurrentNode,
          ),
        ],
      );
    }

    final data = session.instance.data;
    return _Section(
      title: 'Puzzle #6 · Perbug Sequence Forge',
      subtitle: 'Difficulty ${session.instance.difficulty.tier.name.toUpperCase()} • score ${session.instance.difficulty.score}',
      children: [
        Text(data.ruleDescription),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [for (final term in data.visibleSequence) Chip(label: Text(term))],
        ),
        const SizedBox(height: 10),
        if (session.status == PuzzleSessionStatus.generated)
          PrimaryButton(label: 'Start puzzle', onPressed: controller.startActivePuzzle),
        if (session.status != PuzzleSessionStatus.generated)
          ...data.hiddenIndices.map((index) {
            final options = data.choicesByHiddenIndex[index] ?? const <String>[];
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Missing step ${index + 1}'),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final option in options)
                        ChoiceChip(
                          label: Text(option),
                          selected: session.selectedAnswers[index] == option,
                          onSelected: (_) => controller.selectPuzzleAnswer(hiddenIndex: index, answer: option),
                        ),
                    ],
                  ),
                ],
              ),
            );
          }),
        Row(
          children: [
            Expanded(
              child: SecondaryButton(
                label: 'Submit',
                onPressed: session.status == PuzzleSessionStatus.generated
                    ? null
                    : () {
                        final result = controller.submitActivePuzzle();
                        final ok = result?.success == true;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(ok ? 'Sequence forged successfully!' : 'Incorrect sequence. Retry or regenerate.')),
                        );
                      },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(child: SecondaryButton(label: 'Reset', onPressed: controller.resetActivePuzzleSelections)),
            const SizedBox(width: 8),
            Expanded(child: SecondaryButton(label: 'Abandon', onPressed: controller.abandonActivePuzzle)),
          ],
        ),
        if (state.lastPuzzleResult != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Last result: ${state.lastPuzzleResult!.success ? 'Success' : 'Fail'} · '
              '${state.lastPuzzleResult!.duration.inSeconds}s · retries ${state.lastPuzzleResult!.retries}',
            ),
          ),
      ],
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
