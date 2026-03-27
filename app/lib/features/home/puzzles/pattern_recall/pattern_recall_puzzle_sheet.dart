import 'dart:async';

import 'package:flutter/material.dart';

import '../../perbug_game_controller.dart';
import '../../perbug_game_models.dart';
import 'pattern_recall_models.dart';

class PatternRecallPuzzleSheet extends StatefulWidget {
  const PatternRecallPuzzleSheet({
    super.key,
    required this.controller,
    required this.state,
  });

  final PerbugGameController controller;
  final PerbugGameState state;

  @override
  State<PatternRecallPuzzleSheet> createState() => _PatternRecallPuzzleSheetState();
}

class _PatternRecallPuzzleSheetState extends State<PatternRecallPuzzleSheet> {
  Timer? _previewTimer;

  @override
  void dispose() {
    _previewTimer?.cancel();
    super.dispose();
  }

  void _runPreview(PatternRecallSession session) {
    _previewTimer?.cancel();
    widget.controller.startPatternPreview();
    if (session.instance.generatedSequence.isEmpty) {
      widget.controller.completePatternPreview();
      return;
    }
    widget.controller.setPatternPreviewStep(0);
    var step = 1;
    final total = session.instance.generatedSequence.length;
    _previewTimer = Timer.periodic(session.instance.previewStepDuration, (timer) {
      widget.controller.setPatternPreviewStep(step);
      step += 1;
      if (step >= total) {
        timer.cancel();
        widget.controller.completePatternPreview();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.state.activePatternRecall;
    if (session == null) {
      return const SizedBox.shrink();
    }
    final instance = session.instance;
    final activeSymbol = session.currentPreviewStep >= 0 && session.currentPreviewStep < instance.generatedSequence.length
        ? instance.generatedSequence[session.currentPreviewStep]
        : null;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Perbug Pattern Recall', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                ),
                IconButton(
                  onPressed: () {
                    widget.controller.abandonPatternRecall();
                    widget.controller.closePatternRecall();
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Difficulty ${instance.difficulty.tier} (${instance.difficulty.score.toStringAsFixed(0)}) · '
              'Length ${instance.knobs.sequenceLength} · Symbols ${instance.knobs.symbolVariety} · '
              'Tolerance ${instance.knobs.errorTolerance}',
            ),
            if (instance.isMirrored)
              Text('Rule: Recall the ${instance.isReversed ? 'reversed' : 'mirrored'} pattern as previewed.'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: List.generate(instance.symbolSet.length, (index) {
                final symbol = instance.symbolSet[index];
                final isPreview = activeSymbol == index;
                final isDistraction = session.phase == PatternRecallPhase.preview &&
                    instance.distractions.any((d) => d.step == session.currentPreviewStep && d.symbolIndex == index);
                final selectedCount = session.input.where((i) => i == index).length;
                return GestureDetector(
                  onTap: session.phase == PatternRecallPhase.recall ? () => widget.controller.inputPatternSymbol(index) : null,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    width: 56,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isPreview
                          ? Colors.lightBlueAccent
                          : isDistraction
                              ? Colors.deepOrangeAccent
                              : Colors.blueGrey.shade900,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Text('$symbol${selectedCount > 0 ? ' $selectedCount' : ''}', style: const TextStyle(fontSize: 22)),
                  ),
                );
              }),
            ),
            const SizedBox(height: 12),
            if (session.phase == PatternRecallPhase.briefing)
              Row(
                children: [
                  ElevatedButton(onPressed: () => _runPreview(session), child: const Text('Start preview')),
                  const SizedBox(width: 8),
                  Text('Preview ${instance.knobs.previewDurationMs}ms total'),
                ],
              ),
            if (session.phase == PatternRecallPhase.preview)
              Text('Previewing step ${session.currentPreviewStep + 1} / ${instance.generatedSequence.length}'),
            if (session.phase == PatternRecallPhase.recall)
              Row(
                children: [
                  Text('Recreate sequence: ${session.input.length}/${instance.expectedAnswer.length}'),
                  const SizedBox(width: 12),
                  TextButton(onPressed: widget.controller.clearPatternInput, child: const Text('Reset input')),
                ],
              ),
            if (session.phase == PatternRecallPhase.success)
              const Text('Success! Node memory stabilized.', style: TextStyle(color: Colors.greenAccent)),
            if (session.phase == PatternRecallPhase.failure)
              Text('Failed. Mistakes ${session.mistakes} (tolerance ${instance.knobs.errorTolerance}).', style: const TextStyle(color: Colors.orangeAccent)),
            if (session.phase == PatternRecallPhase.success || session.phase == PatternRecallPhase.failure)
              Row(
                children: [
                  ElevatedButton(onPressed: widget.controller.retryPatternRecall, child: const Text('Retry')),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: () {
                      widget.controller.closePatternRecall();
                      Navigator.of(context).pop();
                    },
                    child: const Text('Close'),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
