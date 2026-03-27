import 'package:dryad/features/home/puzzles/puzzle_framework.dart';
import 'package:dryad/features/home/puzzles/sequence_forge_puzzle.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const generator = SequenceForgeGenerator();

  const knobs = SequenceForgeDifficultyKnobs(
    sequenceDepth: 7,
    transformationLayers: 2,
    hiddenSteps: 2,
    operatorComplexity: 3,
    answerChoices: 4,
    misleadingSymmetry: 1,
  );

  test('deterministic generation from same node lat/lng seed', () {
    const input = PuzzleSeedInput(
      nodeId: 'node-a',
      latitude: 30.2672,
      longitude: -97.7431,
      difficultyBand: 3,
    );

    final first = generator.generate(seedInput: input, knobs: knobs);
    final second = generator.generate(seedInput: input, knobs: knobs);

    expect(first.seed, second.seed);
    expect(first.data.fullSequence, second.data.fullSequence);
    expect(first.data.hiddenIndices, second.data.hiddenIndices);
    expect(first.data.choicesByHiddenIndex, second.data.choicesByHiddenIndex);
  });

  test('different nodes produce different sequences', () {
    const a = PuzzleSeedInput(nodeId: 'a', latitude: 30.2672, longitude: -97.7431, difficultyBand: 2);
    const b = PuzzleSeedInput(nodeId: 'b', latitude: 30.2682, longitude: -97.7421, difficultyBand: 2);

    final first = generator.generate(seedInput: a, knobs: knobs);
    final second = generator.generate(seedInput: b, knobs: knobs);

    expect(first.data.fullSequence.join(','), isNot(second.data.fullSequence.join(',')));
  });

  test('difficulty score increases with knob complexity', () {
    const easy = SequenceForgeDifficultyKnobs(
      sequenceDepth: 5,
      transformationLayers: 1,
      hiddenSteps: 1,
      operatorComplexity: 1,
      answerChoices: 3,
      misleadingSymmetry: 0,
    );
    const hard = SequenceForgeDifficultyKnobs(
      sequenceDepth: 9,
      transformationLayers: 3,
      hiddenSteps: 3,
      operatorComplexity: 5,
      answerChoices: 6,
      misleadingSymmetry: 3,
    );

    final easyInstance = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n', latitude: 10, longitude: 10, difficultyBand: 1),
      knobs: easy,
    );
    final hardInstance = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n', latitude: 10, longitude: 10, difficultyBand: 1),
      knobs: hard,
    );

    expect(hardInstance.difficulty.score, greaterThan(easyInstance.difficulty.score));
  });

  test('hidden positions and choices are valid and deterministic', () {
    final instance = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'node-z', latitude: 1, longitude: 2, difficultyBand: 4),
      knobs: knobs,
    );

    for (final hiddenIndex in instance.data.hiddenIndices) {
      expect(hiddenIndex, inInclusiveRange(1, instance.data.fullSequence.length - 2));
      final choices = instance.data.choicesByHiddenIndex[hiddenIndex]!;
      expect(choices.length, 4);
      expect(choices.toSet().length, 4);
      expect(choices, contains(instance.data.correctAnswers[hiddenIndex]));
    }
  });

  test('submission validator rejects ambiguous/incorrect answer sets', () {
    final instance = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'node-k', latitude: 40, longitude: -74, difficultyBand: 5),
      knobs: knobs,
    );

    expect(
      validateSequenceForgeSubmission(data: instance.data, selectedAnswers: instance.data.correctAnswers),
      isTrue,
    );

    final oneWrong = Map<int, String>.from(instance.data.correctAnswers);
    final firstIndex = instance.data.hiddenIndices.first;
    oneWrong[firstIndex] = '${instance.data.correctAnswers[firstIndex]}x';

    expect(validateSequenceForgeSubmission(data: instance.data, selectedAnswers: oneWrong), isFalse);
  });
}
