import 'dart:math';

import 'puzzle_framework.dart';

enum SequenceFamily { arithmetic, multiplicative, alternating, symbolicCycle }

class SequenceForgeDifficultyKnobs {
  const SequenceForgeDifficultyKnobs({
    required this.sequenceDepth,
    required this.transformationLayers,
    required this.hiddenSteps,
    required this.operatorComplexity,
    required this.answerChoices,
    required this.misleadingSymmetry,
  });

  final int sequenceDepth;
  final int transformationLayers;
  final int hiddenSteps;
  final int operatorComplexity;
  final int answerChoices;
  final int misleadingSymmetry;
}

class SequenceForgePuzzleData {
  const SequenceForgePuzzleData({
    required this.family,
    required this.visibleSequence,
    required this.fullSequence,
    required this.hiddenIndices,
    required this.correctAnswers,
    required this.choicesByHiddenIndex,
    required this.ruleDescription,
    required this.misleadingSymmetryApplied,
  });

  final SequenceFamily family;
  final List<String> visibleSequence;
  final List<String> fullSequence;
  final List<int> hiddenIndices;
  final Map<int, String> correctAnswers;
  final Map<int, List<String>> choicesByHiddenIndex;
  final String ruleDescription;
  final bool misleadingSymmetryApplied;
}

class SequenceForgeGenerator extends PuzzleGenerator<SequenceForgePuzzleData, SequenceForgeDifficultyKnobs> {
  const SequenceForgeGenerator();

  @override
  PuzzleType get type => PuzzleType.perbugSequenceForge;

  @override
  PuzzleInstance<SequenceForgePuzzleData> generate({
    required PuzzleSeedInput seedInput,
    required SequenceForgeDifficultyKnobs knobs,
  }) {
    final seed = seedInput.deterministicSeed;
    final random = Random(seed);
    final difficulty = _computeDifficulty(knobs);
    final family = _selectFamily(knobs, random);
    final fullSequence = _buildSequence(family, knobs, random);
    final hiddenIndices = _pickHiddenIndices(fullSequence.length, knobs.hiddenSteps, random);
    final correct = {for (final index in hiddenIndices) index: fullSequence[index]};
    final misleading = knobs.misleadingSymmetry > 0 && random.nextDouble() < knobs.misleadingSymmetry / 5;
    final choices = {
      for (final index in hiddenIndices)
        index: _buildChoices(
          fullSequence: fullSequence,
          hiddenIndex: index,
          correctAnswer: fullSequence[index],
          count: knobs.answerChoices,
          random: random,
          misleadingSymmetry: misleading,
        ),
    };
    final visible = [for (var i = 0; i < fullSequence.length; i++) hiddenIndices.contains(i) ? '?' : fullSequence[i]];

    final data = SequenceForgePuzzleData(
      family: family,
      visibleSequence: visible,
      fullSequence: fullSequence,
      hiddenIndices: hiddenIndices,
      correctAnswers: correct,
      choicesByHiddenIndex: choices,
      ruleDescription: _ruleDescription(family, knobs),
      misleadingSymmetryApplied: misleading,
    );

    return PuzzleInstance<SequenceForgePuzzleData>(
      type: type,
      instanceId: '${seedInput.nodeId}-sequence-forge-${difficulty.tier.name}-$seed',
      seed: seed,
      difficulty: difficulty,
      data: data,
      debugMetadata: {
        'seedMaterial': seedInput.material,
        'family': family.name,
        'sequenceDepth': knobs.sequenceDepth,
        'transformationLayers': knobs.transformationLayers,
        'hiddenSteps': knobs.hiddenSteps,
        'operatorComplexity': knobs.operatorComplexity,
        'answerChoices': knobs.answerChoices,
        'misleadingSymmetry': knobs.misleadingSymmetry,
        'ruleDescription': data.ruleDescription,
        'visibleSequence': data.visibleSequence,
        'fullSequence': data.fullSequence,
        'hiddenIndices': data.hiddenIndices,
        'correctAnswers': data.correctAnswers,
        'choices': data.choicesByHiddenIndex,
      },
    );
  }

  PuzzleDifficulty _computeDifficulty(SequenceForgeDifficultyKnobs knobs) {
    final contributions = <String, int>{
      'sequenceDepth': knobs.sequenceDepth * 4,
      'transformationLayers': knobs.transformationLayers * 8,
      'hiddenSteps': knobs.hiddenSteps * 10,
      'operatorComplexity': knobs.operatorComplexity * 9,
      'answerChoices': knobs.answerChoices * 3,
      'misleadingSymmetry': knobs.misleadingSymmetry * 7,
    };
    final score = contributions.values.fold<int>(0, (sum, value) => sum + value);
    final tier = score < 60
        ? PuzzleDifficultyTier.novice
        : score < 95
            ? PuzzleDifficultyTier.standard
            : score < 130
                ? PuzzleDifficultyTier.advanced
                : PuzzleDifficultyTier.expert;
    final explainer = contributions.entries.map((e) => '${e.key}:${e.value}').join(', ');
    return PuzzleDifficulty(score: score, tier: tier, contributions: contributions, explainer: explainer);
  }

  SequenceFamily _selectFamily(SequenceForgeDifficultyKnobs knobs, Random random) {
    final familyPool = knobs.operatorComplexity <= 2
        ? [SequenceFamily.arithmetic, SequenceFamily.multiplicative]
        : SequenceFamily.values;
    return familyPool[pickDeterministically(random, familyPool.length)];
  }

  List<String> _buildSequence(SequenceFamily family, SequenceForgeDifficultyKnobs knobs, Random random) {
    switch (family) {
      case SequenceFamily.arithmetic:
        return _arithmetic(knobs, random).map((v) => '$v').toList(growable: false);
      case SequenceFamily.multiplicative:
        return _multiplicative(knobs, random).map((v) => '$v').toList(growable: false);
      case SequenceFamily.alternating:
        return _alternating(knobs, random).map((v) => '$v').toList(growable: false);
      case SequenceFamily.symbolicCycle:
        return _symbolicCycle(knobs, random);
    }
  }

  List<int> _arithmetic(SequenceForgeDifficultyKnobs knobs, Random random) {
    final start = random.nextInt(15) + 2;
    var delta = random.nextInt(5) + 1;
    final layerBoost = knobs.transformationLayers > 1 ? random.nextInt(3) + 1 : 0;
    final values = <int>[];
    var current = start;
    for (var i = 0; i < knobs.sequenceDepth; i++) {
      values.add(current);
      current += delta;
      if (knobs.transformationLayers > 1 && i.isEven) {
        current += layerBoost;
      }
      if (knobs.operatorComplexity >= 4 && i % 3 == 2) {
        delta += 1;
      }
    }
    return values;
  }

  List<int> _multiplicative(SequenceForgeDifficultyKnobs knobs, Random random) {
    final start = random.nextInt(4) + 2;
    final multiplier = random.nextInt(2) + 2;
    final additive = knobs.transformationLayers > 1 ? random.nextInt(3) + 1 : 0;
    final values = <int>[];
    var current = start;
    for (var i = 0; i < knobs.sequenceDepth; i++) {
      values.add(current);
      current = current * multiplier + additive;
      if (knobs.operatorComplexity >= 4 && i.isOdd) {
        current -= 1;
      }
    }
    return values;
  }

  List<int> _alternating(SequenceForgeDifficultyKnobs knobs, Random random) {
    final addA = random.nextInt(5) + 2;
    final addB = random.nextInt(4) + 1;
    final start = random.nextInt(20) + 5;
    final values = <int>[];
    var current = start;
    for (var i = 0; i < knobs.sequenceDepth; i++) {
      values.add(current);
      final step = i.isEven ? addA : -addB;
      current += step;
      if (knobs.transformationLayers > 1 && i % 3 == 1) {
        current += 2;
      }
    }
    return values;
  }

  List<String> _symbolicCycle(SequenceForgeDifficultyKnobs knobs, Random random) {
    const symbols = ['△', '○', '□', '◇', '⬟', '✶'];
    final start = random.nextInt(symbols.length);
    final jump = random.nextInt(2) + 1;
    final colorCycle = ['R', 'G', 'B'];
    final values = <String>[];
    for (var i = 0; i < knobs.sequenceDepth; i++) {
      final symbolIndex = (start + (i * jump)) % symbols.length;
      final colorIndex = knobs.transformationLayers > 1 ? i % colorCycle.length : 0;
      final suffix = knobs.transformationLayers > 1 ? colorCycle[colorIndex] : '';
      values.add('${symbols[symbolIndex]}$suffix');
    }
    return values;
  }

  List<int> _pickHiddenIndices(int length, int hiddenSteps, Random random) {
    final target = hiddenSteps.clamp(1, max(1, length - 2));
    final candidates = [for (var i = 1; i < length - 1; i++) i]..shuffle(random);
    final picked = candidates.take(target).toList()..sort();
    return picked;
  }

  List<String> _buildChoices({
    required List<String> fullSequence,
    required int hiddenIndex,
    required String correctAnswer,
    required int count,
    required Random random,
    required bool misleadingSymmetry,
  }) {
    final targetCount = max(2, count);
    final options = <String>{correctAnswer};

    String numericNoise(int delta) {
      final asInt = int.tryParse(correctAnswer);
      if (asInt == null) return '$correctAnswer*';
      return '${max(0, asInt + delta)}';
    }

    if (misleadingSymmetry && hiddenIndex > 0) {
      options.add(fullSequence[hiddenIndex - 1]);
    }

    options
      ..add(numericNoise(1))
      ..add(numericNoise(-1))
      ..add(numericNoise(2));

    while (options.length < targetCount + 2) {
      final suffix = random.nextInt(9) + 1;
      final baseInt = int.tryParse(correctAnswer);
      options.add(baseInt == null ? '$correctAnswer$suffix' : '${baseInt + suffix}');
    }

    final filtered = options.where((value) => value != correctAnswer || options.length == 1).toSet();
    final decoys = filtered.where((value) => value != correctAnswer).toList()..shuffle(random);
    final finalOptions = <String>[correctAnswer, ...decoys.take(targetCount - 1)]..shuffle(random);
    return finalOptions;
  }

  String _ruleDescription(SequenceFamily family, SequenceForgeDifficultyKnobs knobs) {
    final layerLabel = knobs.transformationLayers > 1 ? '${knobs.transformationLayers} layers' : 'single layer';
    switch (family) {
      case SequenceFamily.arithmetic:
        return 'Arithmetic progression with $layerLabel.';
      case SequenceFamily.multiplicative:
        return 'Multiplicative progression with $layerLabel.';
      case SequenceFamily.alternating:
        return 'Alternating operators with $layerLabel.';
      case SequenceFamily.symbolicCycle:
        return 'Symbol cycle transform with $layerLabel.';
    }
  }
}

bool validateSequenceForgeSubmission({
  required SequenceForgePuzzleData data,
  required Map<int, String> selectedAnswers,
}) {
  if (selectedAnswers.length != data.hiddenIndices.length) return false;
  for (final entry in data.correctAnswers.entries) {
    if (selectedAnswers[entry.key] != entry.value) return false;
  }
  return true;
}
