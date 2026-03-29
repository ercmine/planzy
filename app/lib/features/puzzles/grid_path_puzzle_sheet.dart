import 'package:flutter/material.dart';

import '../../app/theme/widgets.dart';
import '../home/perbug_game_models.dart';
import 'grid_path_puzzle.dart';
import 'puzzle_framework.dart';

class GridPathPuzzleSheet extends StatelessWidget {
  const GridPathPuzzleSheet({
    super.key,
    required this.session,
    required this.onStart,
    required this.onTapCell,
    required this.onUndo,
    required this.onReset,
    required this.onAbandon,
    required this.onClose,
  });

  final GridPathPuzzleSessionState session;
  final VoidCallback onStart;
  final ValueChanged<GridPoint> onTapCell;
  final VoidCallback onUndo;
  final VoidCallback onReset;
  final VoidCallback onAbandon;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(session.puzzle.preview.name, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
                      Text('Node ${session.session.nodeRegion} • Difficulty ${session.puzzle.preview.difficulty.tier} '
                          '(${session.puzzle.preview.difficulty.score.toStringAsFixed(1)})'),
                    ],
                  ),
                ),
                IconButton(onPressed: onClose, icon: const Icon(Icons.close)),
              ],
            ),
            const SizedBox(height: 8),
            if (session.status == PuzzleSessionStatus.preview) _buildPreview(context),
            if (session.status == PuzzleSessionStatus.active) _buildActive(context),
            if (session.status == PuzzleSessionStatus.succeeded || session.status == PuzzleSessionStatus.failed || session.status == PuzzleSessionStatus.abandoned)
              _buildResult(context),
          ],
        ),
      ),
    );
  }

  Widget _buildPreview(BuildContext context) {
    final explanation = session.puzzle.preview.difficulty.explanation;
    return Expanded(
      child: ListView(
        children: [
          AppCard(
            tone: AppCardTone.featured,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(session.puzzle.preview.summary),
                const SizedBox(height: 8),
                ...session.puzzle.preview.rules.map((rule) => Text('• $rule')),
                const SizedBox(height: 8),
                Text('Grid ${session.puzzle.width}x${session.puzzle.height} • Obstacles ${(session.puzzle.difficultyConfig.obstacleDensity * 100).round()}%'),
                const SizedBox(height: 6),
                Text('Generated from node lat/lng seed ${session.puzzle.seed.value}'),
              ],
            ),
          ),
          const SizedBox(height: 10),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Difficulty knobs', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                ...explanation.entries.map((entry) => Text('${entry.key}: ${entry.value}')),
              ],
            ),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(onPressed: onStart, icon: const Icon(Icons.play_arrow_rounded), label: const Text('Start puzzle')),
        ],
      ),
    );
  }

  Widget _buildActive(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          if (session.remainingTime != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('Time left: ${session.remainingTime!.inSeconds}s', style: Theme.of(context).textTheme.titleMedium),
            ),
          if (session.invalidReason != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(session.invalidReason!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          Expanded(child: _GridBoard(session: session, onTapCell: onTapCell)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: onUndo, child: const Text('Undo'))),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton(onPressed: onReset, child: const Text('Retry'))),
              const SizedBox(width: 8),
              Expanded(child: FilledButton.tonal(onPressed: onAbandon, child: const Text('Abandon'))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResult(BuildContext context) {
    final success = session.status == PuzzleSessionStatus.succeeded;
    final result = session.result;
    return Expanded(
      child: ListView(
        children: [
          AppCard(
            tone: success ? AppCardTone.featured : AppCardTone.standard,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(success ? 'Path complete!' : 'Puzzle ended', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 6),
                Text(success ? 'You connected start to end successfully.' : (session.invalidReason ?? 'Try again to find a valid route.')),
                const SizedBox(height: 8),
                if (result != null) ...[
                  Text('Moves: ${result.moveCount}'),
                  Text('Duration: ${result.duration.inSeconds}s'),
                  Text('Retries: ${result.retryCount}'),
                ],
              ],
            ),
          ),
          const SizedBox(height: 10),
          FilledButton(onPressed: onReset, child: const Text('Play again')),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: onClose, child: const Text('Close')),
        ],
      ),
    );
  }
}

class _GridBoard extends StatelessWidget {
  const _GridBoard({required this.session, required this.onTapCell});

  final GridPathPuzzleSessionState session;
  final ValueChanged<GridPoint> onTapCell;

  @override
  Widget build(BuildContext context) {
    final puzzle = session.puzzle;
    final pathSet = session.path.toSet();
    return AspectRatio(
      aspectRatio: puzzle.width / puzzle.height,
      child: GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        itemCount: puzzle.width * puzzle.height,
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: puzzle.width),
        itemBuilder: (context, index) {
          final x = index % puzzle.width;
          final y = index ~/ puzzle.width;
          final point = GridPoint(x, y);
          final cell = puzzle.cells[y][x];
          final inPath = pathSet.contains(point);
          final color = switch (cell) {
            GridCellType.blocked => const Color(0xFF1C2236),
            GridCellType.start => const Color(0xFF2ECC71),
            GridCellType.end => const Color(0xFFE74C3C),
            GridCellType.open => inPath ? const Color(0xFF55A6FF) : const Color(0xFF2F3B5E),
          };

          return Padding(
            padding: const EdgeInsets.all(2),
            child: InkWell(
              onTap: cell == GridCellType.blocked ? null : () => onTapCell(point),
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: cell == GridCellType.start
                    ? const Icon(Icons.flag_circle, color: Colors.white, size: 16)
                    : cell == GridCellType.end
                        ? const Icon(Icons.outlined_flag, color: Colors.white, size: 16)
                        : null,
              ),
            ),
          );
        },
      ),
    );
  }
}
