import 'package:dryad/features/home/puzzles/logic_locks_puzzle.dart';
import 'package:dryad/features/home/puzzles/puzzle_framework.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final generator = LogicLocksGenerator();

  test('deterministic generation from same lat/lng + node', () {
    const seed = PuzzleSeedInput(nodeId: 'node-1', latitude: 30.2672, longitude: -97.7431, difficultySalt: '4:6:4');
    const config = LogicLocksDifficultyConfig(variableCount: 4, clueCount: 6, gridSize: 4);

    final a = generator.generate(seedInput: seed, config: config);
    final b = generator.generate(seedInput: seed, config: config);

    expect(a.seed, b.seed);
    expect(a.data.solution, b.data.solution);
    expect(a.data.clues.map((c) => c.text), b.data.clues.map((c) => c.text));
  });

  test('different nodes generate different puzzles', () {
    const config = LogicLocksDifficultyConfig(variableCount: 4, clueCount: 6, gridSize: 4);
    const seedA = PuzzleSeedInput(nodeId: 'node-1', latitude: 30.2672, longitude: -97.7431);
    const seedB = PuzzleSeedInput(nodeId: 'node-2', latitude: 30.2800, longitude: -97.7600);

    final a = generator.generate(seedInput: seedA, config: config);
    final b = generator.generate(seedInput: seedB, config: config);

    expect(a.seed == b.seed && a.data.solution.join(',') == b.data.solution.join(','), isFalse);
  });

  test('generated puzzle is solvable and unique when required', () {
    const config = LogicLocksDifficultyConfig(variableCount: 5, clueCount: 7, gridSize: 5, requireUniqueSolution: true);
    const seed = PuzzleSeedInput(nodeId: 'node-u', latitude: 37.7749, longitude: -122.4194);

    final instance = generator.generate(seedInput: seed, config: config);

    expect(instance.data.allowedSolutions, 1);
    expect(instance.data.clues, isNotEmpty);
  });

  test('difficulty knobs increase difficulty score at higher settings', () {
    const seed = PuzzleSeedInput(nodeId: 'node-d', latitude: 40.7128, longitude: -74.0060);
    const easy = LogicLocksDifficultyConfig(variableCount: 3, clueCount: 8, contradictionComplexity: 0.1, ambiguityLevel: 0.1, deductionDepth: 0.2, gridSize: 3);
    const hard = LogicLocksDifficultyConfig(variableCount: 6, clueCount: 4, contradictionComplexity: 0.7, ambiguityLevel: 0.45, deductionDepth: 0.8, gridSize: 6);

    final easyInstance = generator.generate(seedInput: seed, config: easy);
    final hardInstance = generator.generate(seedInput: seed, config: hard);

    expect(hardInstance.difficulty.score, greaterThan(easyInstance.difficulty.score));
  });

  test('validator accepts correct arrangement and rejects incorrect one', () {
    const config = LogicLocksDifficultyConfig(variableCount: 4, clueCount: 7, gridSize: 4);
    const seed = PuzzleSeedInput(nodeId: 'node-v', latitude: 48.8566, longitude: 2.3522);
    final instance = generator.generate(seedInput: seed, config: config);
    final validator = LogicLocksValidator();

    final correct = LogicLocksPlayerState(slotAssignments: List<String?>.from(instance.data.solution), undoStack: const []);
    final wrong = LogicLocksPlayerState(slotAssignments: List<String?>.from(instance.data.solution.reversed), undoStack: const []);

    final success = validator.validate(
      instance: instance,
      playerState: correct,
      attempts: 1,
      startedAt: DateTime.utc(2026, 3, 27, 10),
      endedAt: DateTime.utc(2026, 3, 27, 10, 1),
    );
    final failure = validator.validate(
      instance: instance,
      playerState: wrong,
      attempts: 2,
      startedAt: DateTime.utc(2026, 3, 27, 10),
      endedAt: DateTime.utc(2026, 3, 27, 10, 2),
    );

    expect(success.success, isTrue);
    expect(failure.success, isFalse);
  });
}
