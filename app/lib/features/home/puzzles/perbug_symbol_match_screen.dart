import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';
import '../perbug_game_models.dart';
import 'perbug_puzzle_framework.dart';
import 'perbug_symbol_match.dart';

class SymbolMatchPuzzleSheet extends StatefulWidget {
  const SymbolMatchPuzzleSheet({
    required this.node,
    required this.puzzle,
    required this.onEvent,
    super.key,
  });

  final PerbugNode node;
  final SymbolMatchPuzzleInstance puzzle;
  final void Function(String event, Map<String, Object?> data) onEvent;

  @override
  State<SymbolMatchPuzzleSheet> createState() => _SymbolMatchPuzzleSheetState();
}

class _SymbolMatchPuzzleSheetState extends State<SymbolMatchPuzzleSheet> {
  late final DateTime _startedAt;
  int _roundIndex = 0;
  int _mistakes = 0;
  int? _selected;
  bool _showResult = false;
  bool _resultIsCorrect = false;
  int _remainingSeconds = 0;
  Timer? _timer;
  bool _started = false;

  SymbolMatchRound get _currentRound => widget.puzzle.rounds[_roundIndex];

  @override
  void initState() {
    super.initState();
    _startedAt = DateTime.now();
    widget.onEvent('puzzle_generated', {
      'nodeId': widget.node.id,
      'puzzleId': widget.puzzle.id,
      'difficulty': widget.puzzle.difficulty.score,
      'knobs': widget.puzzle.difficulty.explainers,
      'seed': widget.puzzle.seedInput.toSeed(),
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startPuzzle() {
    setState(() => _started = true);
    widget.onEvent('puzzle_started', {'puzzleId': widget.puzzle.id, 'nodeId': widget.node.id});
    _startRoundTimer();
  }

  void _startRoundTimer() {
    _timer?.cancel();
    final seconds = _currentRound.timerSeconds;
    if (seconds <= 0) {
      _remainingSeconds = 0;
      widget.onEvent('round_started', {'round': _roundIndex, 'timed': false});
      return;
    }

    _remainingSeconds = seconds;
    widget.onEvent('round_started', {'round': _roundIndex, 'timed': true, 'seconds': seconds});
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() => _remainingSeconds -= 1);
      if (_remainingSeconds <= 0) {
        timer.cancel();
        _finishPuzzle(success: false, reason: 'Time expired on round ${_roundIndex + 1}');
      }
    });
  }

  void _submitSelection() {
    final selected = _selected;
    if (selected == null) return;
    final correct = validateSymbolMatchAnswer(round: _currentRound, selectedIndex: selected);

    setState(() {
      _showResult = true;
      _resultIsCorrect = correct;
      if (!correct) _mistakes += 1;
    });

    widget.onEvent('round_completed', {
      'round': _roundIndex,
      'correct': correct,
      'mistakes': _mistakes,
      'selectedIndex': selected,
      'correctIndex': _currentRound.correctCandidateIndex,
    });
  }

  void _nextRound() {
    if (!_resultIsCorrect) {
      _finishPuzzle(success: false, reason: 'Incorrect match on round ${_roundIndex + 1}');
      return;
    }

    if (_roundIndex >= widget.puzzle.rounds.length - 1) {
      _finishPuzzle(success: true);
      return;
    }

    setState(() {
      _roundIndex += 1;
      _selected = null;
      _showResult = false;
      _resultIsCorrect = false;
    });
    _startRoundTimer();
  }

  void _finishPuzzle({required bool success, String? reason}) {
    _timer?.cancel();
    final result = PuzzleResult(
      success: success,
      completedRounds: success ? widget.puzzle.rounds.length : _roundIndex,
      totalRounds: widget.puzzle.rounds.length,
      mistakes: _mistakes,
      startedAt: _startedAt,
      endedAt: DateTime.now(),
      failureReason: reason,
    );

    widget.onEvent(success ? 'puzzle_succeeded' : 'puzzle_failed', {
      'nodeId': widget.node.id,
      'puzzleId': widget.puzzle.id,
      'completedRounds': result.completedRounds,
      'mistakes': _mistakes,
      'durationMs': result.duration.inMilliseconds,
      'failureReason': reason,
    });

    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    if (!_started) {
      return _buildEntry(context);
    }

    final round = _currentRound;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Perbug Symbol Match', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text('Node: ${widget.node.label} • Round ${_roundIndex + 1}/${widget.puzzle.rounds.length}'),
          if (round.timerSeconds > 0) ...[
            const SizedBox(height: 6),
            Text('Timer: ${_remainingSeconds}s', style: TextStyle(color: _remainingSeconds < 6 ? Colors.redAccent : null)),
          ],
          const SizedBox(height: 10),
          Text(round.partialHint),
          const SizedBox(height: 12),
          Center(child: _SymbolChip(symbol: round.anchorSymbol, size: 72, label: 'Anchor')),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: round.candidates.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: 1.15, crossAxisSpacing: 8, mainAxisSpacing: 8),
            itemBuilder: (_, index) {
              final selected = index == _selected;
              return InkWell(
                onTap: _showResult ? null : () => setState(() => _selected = index),
                borderRadius: BorderRadius.circular(12),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.outlineVariant,
                      width: selected ? 2 : 1,
                    ),
                  ),
                  child: Center(child: _SymbolChip(symbol: round.candidates[index], size: 54)),
                ),
              );
            },
          ),
          const SizedBox(height: 12),
          if (_showResult)
            Text(
              _resultIsCorrect ? 'Correct! Proceed to next round.' : 'That match is invalid for this hidden rule.',
              style: TextStyle(color: _resultIsCorrect ? Colors.greenAccent : Colors.orangeAccent),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: SecondaryButton(label: 'Abandon', onPressed: () => _finishPuzzle(success: false, reason: 'Abandoned by player')),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: PrimaryButton(
                  label: _showResult ? 'Continue' : 'Submit',
                  onPressed: _showResult ? _nextRound : (_selected == null ? null : _submitSelection),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEntry(BuildContext context) {
    final score = (widget.puzzle.difficulty.score * 100).toStringAsFixed(0);
    final knobs = widget.puzzle.knobs;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Perbug Symbol Match', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('Generated from node seed (${widget.node.latitude.toStringAsFixed(4)}, ${widget.node.longitude.toStringAsFixed(4)}).'),
          const SizedBox(height: 10),
          AppCard(
            tone: AppCardTone.featured,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Difficulty: ${widget.puzzle.difficulty.tier} ($score/100)'),
                const SizedBox(height: 4),
                Text('Pool ${knobs.symbolPoolSize} • Rule ${knobs.ruleComplexity} • Decoys ${knobs.decoyCount} • Rounds ${knobs.rounds}'),
                Text('Overlap ${(knobs.overlapSimilarity * 100).toStringAsFixed(0)}% • Timer pressure ${knobs.timerPressure}'),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text('Find the single valid counterpart for each anchor symbol using hidden relation rules.'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: SecondaryButton(label: 'Cancel', onPressed: () => Navigator.of(context).pop())),
              const SizedBox(width: 8),
              Expanded(child: PrimaryButton(label: 'Start Puzzle', onPressed: _startPuzzle)),
            ],
          ),
        ],
      ),
    );
  }
}

class _SymbolChip extends StatelessWidget {
  const _SymbolChip({required this.symbol, required this.size, this.label});

  final PerbugSymbol symbol;
  final double size;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CustomPaint(painter: _SymbolPainter(symbol: symbol)),
        ),
        if (label != null) ...[
          const SizedBox(height: 4),
          Text(label!),
        ],
      ],
    );
  }
}

class _SymbolPainter extends CustomPainter {
  const _SymbolPainter({required this.symbol});

  final PerbugSymbol symbol;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) * 0.34;
    final fill = Paint()..color = _color(symbol.color);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = Colors.white;

    final path = _shapePath(center, radius, symbol.shape, symbol.rotationQuarterTurns * math.pi / 2);
    canvas.drawPath(path, fill);
    canvas.drawPath(path, stroke);
    _drawMark(canvas, center, radius, symbol.mark);
  }

  Path _shapePath(Offset center, double radius, SymbolShape shape, double angle) {
    switch (shape) {
      case SymbolShape.circle:
        return Path()..addOval(Rect.fromCircle(center: center, radius: radius));
      default:
        final points = switch (shape) {
          SymbolShape.triangle => 3,
          SymbolShape.square => 4,
          SymbolShape.diamond => 4,
          SymbolShape.hexagon => 6,
          SymbolShape.star => 10,
          SymbolShape.circle => 0,
        };
        final isStar = shape == SymbolShape.star;
        final path = Path();
        for (var i = 0; i < points; i++) {
          final ratio = isStar && i.isOdd ? 0.45 : 1.0;
          final theta = angle + (2 * math.pi * i / points) - math.pi / 2;
          final point = Offset(center.dx + math.cos(theta) * radius * ratio, center.dy + math.sin(theta) * radius * ratio);
          if (i == 0) {
            path.moveTo(point.dx, point.dy);
          } else {
            path.lineTo(point.dx, point.dy);
          }
        }
        path.close();
        return path;
    }
  }

  void _drawMark(Canvas canvas, Offset center, double radius, SymbolMark mark) {
    final p = Paint()
      ..color = Colors.white
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    switch (mark) {
      case SymbolMark.dot:
        canvas.drawCircle(center, radius * 0.16, Paint()..color = Colors.white);
      case SymbolMark.line:
        canvas.drawLine(Offset(center.dx - radius * 0.4, center.dy), Offset(center.dx + radius * 0.4, center.dy), p);
      case SymbolMark.ring:
        canvas.drawCircle(center, radius * 0.3, p);
      case SymbolMark.cross:
        canvas.drawLine(Offset(center.dx - radius * 0.3, center.dy - radius * 0.3), Offset(center.dx + radius * 0.3, center.dy + radius * 0.3), p);
        canvas.drawLine(Offset(center.dx + radius * 0.3, center.dy - radius * 0.3), Offset(center.dx - radius * 0.3, center.dy + radius * 0.3), p);
    }
  }

  Color _color(SymbolColorFamily family) {
    switch (family) {
      case SymbolColorFamily.ember:
        return const Color(0xFFE76F51);
      case SymbolColorFamily.ocean:
        return const Color(0xFF4EA8DE);
      case SymbolColorFamily.moss:
        return const Color(0xFF2A9D8F);
      case SymbolColorFamily.dusk:
        return const Color(0xFF6C5CE7);
      case SymbolColorFamily.sun:
        return const Color(0xFFF4A261);
      case SymbolColorFamily.violet:
        return const Color(0xFFB5179E);
    }
  }

  @override
  bool shouldRepaint(covariant _SymbolPainter oldDelegate) => oldDelegate.symbol != symbol;
}
