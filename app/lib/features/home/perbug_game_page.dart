import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/widgets.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';
import 'perbug_puzzles/puzzle_framework.dart';
import 'perbug_puzzles/word_weave.dart';

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
          _Section(
            title: 'Node challenge slots',
            subtitle: 'Word Weave is now live as modular puzzle type #5 with deterministic node seeding.',
            children: [
              const Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  AppPill(label: 'grid-path', icon: Icons.grid_3x3),
                  AppPill(label: 'pattern-recall', icon: Icons.memory),
                  AppPill(label: 'logic-locks', icon: Icons.vpn_key_outlined),
                  AppPill(label: 'symbol-match', icon: Icons.extension_outlined),
                  AppPill(label: 'word-weave', icon: Icons.abc),
                ],
              ),
              const SizedBox(height: 10),
              SecondaryButton(
                label: 'Launch Word Weave for current node',
                onPressed: state.currentNode == null ? null : () => controller.launchWordWeaveForNode(state.currentNode!),
              ),
              if (state.activePuzzleSession != null) ...[
                const SizedBox(height: 12),
                _WordWeavePanel(state: state, controller: controller),
              ],
            ],
          ),
          if (state.lastPuzzleSummary != null) AppCard(tone: AppCardTone.featured, child: Text(state.lastPuzzleSummary!)),
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

class _WordWeavePanel extends StatelessWidget {
  const _WordWeavePanel({required this.state, required this.controller});

  final PerbugGameState state;
  final PerbugGameController controller;

  @override
  Widget build(BuildContext context) {
    final session = state.activePuzzleSession!;
    final board = session.instance.board;
    final status = session.status;
    final isPlayable = status == PuzzleSessionStatus.generated || status == PuzzleSessionStatus.started;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF101527),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Perbug Word Weave', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text('Difficulty: ${session.instance.difficulty.tier} • score ${session.instance.difficulty.score.toStringAsFixed(2)}'),
          const SizedBox(height: 6),
          Text('Retries left: ${session.retriesRemaining} • strictness: ${session.config.dictionaryStrictness.name}'),
          const SizedBox(height: 8),
          Text(
            session.currentInput.isEmpty ? 'Current input: —' : 'Current input: ${session.currentInput}',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: board.letterPool
                .map(
                  (letter) => ActionChip(
                    label: Text(letter),
                    onPressed: isPlayable ? () => controller.appendPuzzleLetter(letter) : null,
                  ),
                )
                .toList(growable: false),
          ),
          const SizedBox(height: 10),
          Text('Branch preview', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 4),
          ...board.branchPreview.asMap().entries.map(
                (entry) => Text('Step ${entry.key + 1}: ${entry.value.join(' / ')}'),
              ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              SecondaryButton(
                label: status == PuzzleSessionStatus.generated ? 'Start' : 'Undo',
                onPressed: status == PuzzleSessionStatus.generated ? controller.startActivePuzzle : controller.undoPuzzleLetter,
              ),
              SecondaryButton(label: 'Clear', onPressed: isPlayable ? controller.clearPuzzleInput : null),
              PrimaryButton(
                label: 'Submit',
                onPressed: isPlayable
                    ? () {
                        final result = controller.submitPuzzleInput();
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.reason)));
                      }
                    : null,
              ),
              SecondaryButton(label: 'Abandon', onPressed: controller.abandonPuzzle),
            ],
          ),
          if (status == PuzzleSessionStatus.failed || status == PuzzleSessionStatus.succeeded) ...[
            const SizedBox(height: 10),
            Text(
              status == PuzzleSessionStatus.succeeded
                  ? 'Solved target: ${session.instance.solution.primaryTarget}'
                  : 'Failed. Target: ${session.instance.solution.primaryTarget}',
            ),
          ],
        ],
      ),
    );
  }
}
