import 'dart:math' as math;

import '../../perbug_game_models.dart';
import '../perbug_puzzle_framework.dart';
import 'pattern_recall_models.dart';

class PatternRecallGenerator implements PuzzleGenerator<PatternRecallInstance> {
  const PatternRecallGenerator();

  static const _symbols = ['◆', '●', '▲', '■', '✦', '⬟', '✚', '⬢', '★', '⬣'];

  @override
  PatternRecallInstance generate({
    required PerbugNode node,
    required PuzzleSeedInput seedInput,
    required Map<String, Object> tuning,
  }) {
    final rng = seededRandom(seedInput);
    final knobs = _knobsFor(node: node, tuning: tuning, rng: rng);
    final symbolSet = _symbols.take(knobs.symbolVariety.clamp(3, _symbols.length)).toList(growable: false);
    final sequence = _buildSequence(rng: rng, length: knobs.sequenceLength, symbolVariety: symbolSet.length);

    final isMirrored = rng.nextDouble() < knobs.mirroredChance;
    final isReversed = isMirrored && rng.nextBool();
    final expected = isReversed ? sequence.reversed.toList(growable: false) : sequence;

    final distractions = List.generate(knobs.distractionCount, (index) {
      final step = rng.nextInt(sequence.length);
      var decoy = rng.nextInt(symbolSet.length);
      if (decoy == sequence[step]) {
        decoy = (decoy + 1) % symbolSet.length;
      }
      return PatternRecallDistraction(step: step, symbolIndex: decoy);
    }, growable: false);

    final difficulty = _computeDifficulty(knobs: knobs, mirrored: isMirrored, reversed: isReversed);

    final previewStepMs = math.max(300, (knobs.previewDurationMs / knobs.sequenceLength).floor());
    return PatternRecallInstance(
      seedInput: seedInput,
      difficulty: difficulty,
      knobs: knobs,
      symbolSet: symbolSet,
      generatedSequence: sequence,
      expectedAnswer: expected,
      previewStepDuration: Duration(milliseconds: previewStepMs),
      isMirrored: isMirrored,
      isReversed: isReversed,
      distractions: distractions,
      debug: {
        'seed_key': seedInput.stableSeedKey(),
        'sequence': sequence.join(','),
        'expected_answer': expected.join(','),
        'distraction_steps': distractions.map((d) => '${d.step}:${d.symbolIndex}').join('|'),
      },
    );
  }

  PatternRecallDifficultyKnobs _knobsFor({
    required PerbugNode node,
    required Map<String, Object> tuning,
    required math.Random rng,
  }) {
    final progressionStage = (tuning['progressionStage'] as num?)?.toDouble() ?? 0.0;
    final rarityBoost = (tuning['rarityBoost'] as num?)?.toDouble() ?? 0.0;
    final regionBoost = (node.region.toLowerCase().contains('downtown') ? 0.25 : 0.0);
    final combined = progressionStage + rarityBoost + regionBoost + (rng.nextDouble() * 0.2);

    final sequenceLength = (4 + (combined * 4).round()).clamp(4, 9);
    final symbolVariety = (4 + (combined * 3).round()).clamp(4, 8);
    final previewDurationMs = (4500 - (combined * 1400).round()).clamp(1800, 4800);
    final distractionCount = (combined * 3).round().clamp(0, 5);
    final mirroredChance = (0.08 + combined * 0.22).clamp(0.05, 0.65);
    final errorTolerance = combined < 0.6 ? 1 : 0;

    return PatternRecallDifficultyKnobs(
      sequenceLength: sequenceLength,
      symbolVariety: symbolVariety,
      previewDurationMs: previewDurationMs,
      distractionCount: distractionCount,
      mirroredChance: mirroredChance,
      errorTolerance: errorTolerance,
    );
  }

  List<int> _buildSequence({
    required math.Random rng,
    required int length,
    required int symbolVariety,
  }) {
    final output = <int>[];
    while (output.length < length) {
      final next = rng.nextInt(symbolVariety);
      final canRepeat = output.length < 2;
      if (!canRepeat && output[output.length - 1] == next && output[output.length - 2] == next) {
        continue;
      }
      output.add(next);
    }
    return output;
  }

  PuzzleDifficulty _computeDifficulty({
    required PatternRecallDifficultyKnobs knobs,
    required bool mirrored,
    required bool reversed,
  }) {
    final sequenceWeight = (knobs.sequenceLength - 4) / 5;
    final varietyWeight = (knobs.symbolVariety - 4) / 4;
    final previewWeight = (4800 - knobs.previewDurationMs) / 3000;
    final distractionWeight = knobs.distractionCount / 5;
    final mirrorWeight = mirrored ? (reversed ? 1.0 : 0.75) : 0.0;
    final toleranceWeight = knobs.errorTolerance == 0 ? 1.0 : 0.35;

    final weighted = <String, double>{
      'sequence_length': sequenceWeight * 0.28,
      'symbol_variety': varietyWeight * 0.18,
      'preview_duration': previewWeight * 0.2,
      'distractions': distractionWeight * 0.14,
      'mirrored_reversed': mirrorWeight * 0.12,
      'tolerance': toleranceWeight * 0.08,
    };

    final score = (weighted.values.fold<double>(0, (sum, e) => sum + e) * 100).clamp(0, 100);
    final tier = score < 35
        ? 'Easy'
        : score < 60
            ? 'Medium'
            : score < 80
                ? 'Hard'
                : 'Extreme';

    return PuzzleDifficulty(score: score.toDouble(), tier: tier, explainer: weighted);
  }
}
