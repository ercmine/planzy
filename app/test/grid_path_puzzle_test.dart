import 'package:perbug/features/puzzles/grid_path_puzzle.dart';
import 'package:perbug/features/puzzles/puzzle_framework.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const generator = GridPathGenerator();

  GridPathDifficultyConfig config({int falsePaths = 3}) => const GridPathDifficultyConfig(
        width: 7,
        height: 6,
        obstacleDensity: 0.3,
        branchComplexity: 4,
        falsePathCount: 3,
        timePressureEnabled: true,
        rules: GridPathMovementRules(
          orthogonalOnly: true,
          disallowRevisit: true,
          moveLimit: 22,
          timerSeconds: 45,
        ),
      ).copyWith(falsePathCount: falsePaths);

  test('generation is deterministic for same lat/lng and node id', () {
    final a = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n1', latitude: 30.2672, longitude: -97.7431),
      config: config(),
    );
    final b = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n1', latitude: 30.2672, longitude: -97.7431),
      config: config(),
    );

    expect(a.seed.value, b.seed.value);
    expect(_serializeCells(a.cells), _serializeCells(b.cells));
    expect(a.start, b.start);
    expect(a.end, b.end);
  });

  test('different node coordinates produce different seed outputs', () {
    final a = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n1', latitude: 30.2672, longitude: -97.7431),
      config: config(),
    );
    final b = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n2', latitude: 30.2682, longitude: -97.7419),
      config: config(),
    );

    expect(a.seed.value, isNot(b.seed.value));
  });

  test('generated puzzle is solvable', () {
    final puzzle = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n1', latitude: 30.2672, longitude: -97.7431),
      config: config(),
    );

    expect(
      GridPathValidator.hasPath(cells: puzzle.cells, start: puzzle.start, end: puzzle.end),
      isTrue,
    );
  });

  test('difficulty increases with tougher knobs', () {
    const difficulty = GridPathDifficulty();
    final easy = difficulty.compute(
      const GridPathDifficultyConfig(
        width: 5,
        height: 5,
        obstacleDensity: 0.12,
        branchComplexity: 1,
        falsePathCount: 0,
        rules: GridPathMovementRules(disallowRevisit: false),
      ),
    );
    final hard = difficulty.compute(
      const GridPathDifficultyConfig(
        width: 9,
        height: 9,
        obstacleDensity: 0.45,
        branchComplexity: 7,
        falsePathCount: 6,
        timePressureEnabled: true,
        rules: GridPathMovementRules(disallowRevisit: true, moveLimit: 40, timerSeconds: 40),
      ),
    );

    expect(hard.score, greaterThan(easy.score));
  });

  test('invalid moves are rejected and completion is detected', () {
    final puzzle = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n1', latitude: 30.2672, longitude: -97.7431),
      config: config(falsePaths: 2),
    );

    final invalidFirst = GridPathValidator.validateMove(
      instance: puzzle,
      path: const [],
      move: GridPoint(puzzle.start.x + 1, puzzle.start.y),
    );
    expect(invalidFirst.isValid, isFalse);

    final start = GridPathValidator.validateMove(instance: puzzle, path: const [], move: puzzle.start);
    expect(start.isValid, isTrue);

    final diagonal = GridPathValidator.validateMove(
      instance: puzzle,
      path: [puzzle.start],
      move: GridPoint(puzzle.start.x + 1, puzzle.start.y + 1),
    );
    expect(diagonal.isValid, isFalse);

    expect(GridPathValidator.isCompleted(instance: puzzle, path: [puzzle.start, puzzle.end]), isTrue);
  });

  test('dead-end branches and false routes preserve solvability', () {
    final puzzle = generator.generate(
      seedInput: const PuzzleSeedInput(nodeId: 'n9', latitude: 37.7749, longitude: -122.4194),
      config: const GridPathDifficultyConfig(
        width: 8,
        height: 8,
        obstacleDensity: 0.28,
        branchComplexity: 6,
        falsePathCount: 5,
        rules: GridPathMovementRules(orthogonalOnly: true, disallowRevisit: true),
      ),
    );

    expect((puzzle.debug['dead_end_branches'] as int) >= 1, isTrue);
    expect((puzzle.debug['false_routes'] as int) >= 1, isTrue);
    expect(GridPathValidator.hasPath(cells: puzzle.cells, start: puzzle.start, end: puzzle.end), isTrue);
  });
}

String _serializeCells(List<List<GridCellType>> cells) {
  return cells.map((row) => row.map((cell) => cell.name).join()).join('|');
}

extension on GridPathDifficultyConfig {
  GridPathDifficultyConfig copyWith({int? falsePathCount}) {
    return GridPathDifficultyConfig(
      width: width,
      height: height,
      obstacleDensity: obstacleDensity,
      branchComplexity: branchComplexity,
      falsePathCount: falsePathCount ?? this.falsePathCount,
      rules: rules,
      timePressureEnabled: timePressureEnabled,
    );
  }
}
