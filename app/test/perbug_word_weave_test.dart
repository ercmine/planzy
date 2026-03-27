import 'package:dryad/features/home/perbug_puzzles/puzzle_framework.dart';
import 'package:dryad/features/home/perbug_puzzles/word_weave.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const baseConfig = WordWeaveDifficultyConfig(
    letterPoolSize: 9,
    targetWordLength: 5,
    decoyDensity: 0.3,
    branchingOptions: 3,
    retryAllowance: 3,
    dictionaryStrictness: WordWeaveDictionaryStrictness.standardDictionary,
  );

  test('deterministic generation from same lat/lng seed', () {
    const seed = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);
    final generator = WordWeaveGenerator();
    final one = generator.generate(seed: seed, config: baseConfig);
    final two = generator.generate(seed: seed, config: baseConfig);

    expect(one.solution.primaryTarget, two.solution.primaryTarget);
    expect(one.board.letterPool, two.board.letterPool);
    expect(one.board.branchPreview, two.board.branchPreview);
  });

  test('different nodes produce different deterministic puzzles', () {
    final generator = WordWeaveGenerator();
    const a = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);
    const b = PuzzleSeedInput(nodeId: 'node-b', latitude: 30.2679, longitude: -97.7420);

    final one = generator.generate(seed: a, config: baseConfig);
    final two = generator.generate(seed: b, config: baseConfig);

    expect('${one.solution.primaryTarget}${one.board.letterPool.join()}' == '${two.solution.primaryTarget}${two.board.letterPool.join()}', isFalse);
  });

  test('difficulty score increases with harder knobs', () {
    const easy = WordWeaveDifficultyConfig(
      letterPoolSize: 7,
      targetWordLength: 4,
      decoyDensity: 0.1,
      branchingOptions: 2,
      retryAllowance: 4,
      dictionaryStrictness: WordWeaveDictionaryStrictness.targetSetOnly,
    );
    const hard = WordWeaveDifficultyConfig(
      letterPoolSize: 12,
      targetWordLength: 7,
      decoyDensity: 0.6,
      branchingOptions: 5,
      retryAllowance: 1,
      dictionaryStrictness: WordWeaveDictionaryStrictness.standardDictionary,
    );

    final easyDifficulty = computeWordWeaveDifficulty(easy);
    final hardDifficulty = computeWordWeaveDifficulty(hard);

    expect(hardDifficulty.score, greaterThan(easyDifficulty.score));
  });

  test('target is always assemble-able from pool', () {
    const seed = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);
    final generator = WordWeaveGenerator();
    final puzzle = generator.generate(seed: seed, config: baseConfig);

    final validator = WordWeaveValidator();
    final result = validator.validateSubmission(
      board: puzzle.board,
      solution: puzzle.solution,
      input: puzzle.solution.primaryTarget,
      config: baseConfig,
    );
    expect(result.success, isTrue);
  });

  test('decoy density influences pool noise', () {
    const seed = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);
    final generator = WordWeaveGenerator();
    const lowNoise = WordWeaveDifficultyConfig(
      letterPoolSize: 10,
      targetWordLength: 5,
      decoyDensity: 0.1,
      branchingOptions: 3,
      retryAllowance: 3,
      dictionaryStrictness: WordWeaveDictionaryStrictness.standardDictionary,
    );
    const highNoise = WordWeaveDifficultyConfig(
      letterPoolSize: 10,
      targetWordLength: 5,
      decoyDensity: 0.6,
      branchingOptions: 3,
      retryAllowance: 3,
      dictionaryStrictness: WordWeaveDictionaryStrictness.standardDictionary,
    );

    final low = generator.generate(seed: seed, config: lowNoise);
    final high = generator.generate(seed: seed, config: highNoise);
    final targetLetters = low.solution.primaryTarget.split('').toSet();

    final lowDecoys = low.board.letterPool.where((l) => !targetLetters.contains(l)).length;
    final highDecoys = high.board.letterPool.where((l) => !targetLetters.contains(l)).length;
    expect(highDecoys, greaterThanOrEqualTo(lowDecoys));
  });

  test('dictionary strictness affects non-target validation', () {
    const seed = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);
    final generator = WordWeaveGenerator();
    final puzzle = generator.generate(seed: seed, config: baseConfig);
    final validator = WordWeaveValidator();

    final exactConfig = baseConfig;
    final exact = validator.validateSubmission(board: puzzle.board, solution: puzzle.solution, input: 'APPLE', config: exactConfig);

    const strictTargetOnlyConfig = WordWeaveDifficultyConfig(
      letterPoolSize: 9,
      targetWordLength: 5,
      decoyDensity: 0.3,
      branchingOptions: 3,
      retryAllowance: 3,
      dictionaryStrictness: WordWeaveDictionaryStrictness.exactTargetOnly,
    );
    final targetOnly = validator.validateSubmission(
      board: puzzle.board,
      solution: puzzle.solution,
      input: 'APPLE',
      config: strictTargetOnlyConfig,
    );

    expect(exact.reason == targetOnly.reason && exact.success == targetOnly.success, isFalse);
  });

  test('retry handling can exhaust puzzle state', () {
    const seed = PuzzleSeedInput(nodeId: 'node-a', latitude: 30.2672, longitude: -97.7431);
    const config = WordWeaveDifficultyConfig(
      letterPoolSize: 9,
      targetWordLength: 5,
      decoyDensity: 0.3,
      branchingOptions: 3,
      retryAllowance: 2,
      dictionaryStrictness: WordWeaveDictionaryStrictness.exactTargetOnly,
    );

    var session = createWordWeaveSession(seed: seed, config: config).copyWith(status: PuzzleSessionStatus.started);
    final validator = WordWeaveValidator();

    for (var i = 0; i < 2; i++) {
      final submission = validator.validateSubmission(
        board: session.instance.board,
        solution: session.instance.solution,
        input: 'ZZZZZ',
        config: config,
      );
      session = session.copyWith(
        attemptsUsed: session.attemptsUsed + 1,
        status: session.attemptsUsed + 1 >= session.maxRetries ? PuzzleSessionStatus.failed : session.status,
        invalidSubmissions: [...session.invalidSubmissions, submission.reason],
      );
    }

    expect(session.status, PuzzleSessionStatus.failed);
    expect(session.retriesRemaining, 0);
  });
}
