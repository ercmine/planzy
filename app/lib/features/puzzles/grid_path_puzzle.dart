import 'dart:collection';

import 'puzzle_framework.dart';

class GridPoint {
  const GridPoint(this.x, this.y);

  final int x;
  final int y;

  @override
  bool operator ==(Object other) => other is GridPoint && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);
}

enum GridCellType { open, blocked, start, end }

class GridPathMovementRules {
  const GridPathMovementRules({
    this.orthogonalOnly = true,
    this.disallowRevisit = true,
    this.moveLimit,
    this.timerSeconds,
  });

  final bool orthogonalOnly;
  final bool disallowRevisit;
  final int? moveLimit;
  final int? timerSeconds;
}

class GridPathDifficultyConfig {
  const GridPathDifficultyConfig({
    required this.width,
    required this.height,
    required this.obstacleDensity,
    required this.branchComplexity,
    required this.falsePathCount,
    required this.rules,
    this.timePressureEnabled = false,
  });

  final int width;
  final int height;
  final double obstacleDensity;
  final int branchComplexity;
  final int falsePathCount;
  final GridPathMovementRules rules;
  final bool timePressureEnabled;
}

class GridPathPuzzleInstance extends PuzzleInstance {
  const GridPathPuzzleInstance({
    required super.id,
    required super.seed,
    required super.preview,
    required this.width,
    required this.height,
    required this.cells,
    required this.start,
    required this.end,
    required this.suggestedSolutionLength,
    required this.debug,
    required this.rules,
    required this.difficultyConfig,
  }) : super(type: PuzzleType.gridPath);

  final int width;
  final int height;
  final List<List<GridCellType>> cells;
  final GridPoint start;
  final GridPoint end;
  final int suggestedSolutionLength;
  final Map<String, Object> debug;
  final GridPathMovementRules rules;
  final GridPathDifficultyConfig difficultyConfig;

  bool isInside(GridPoint point) => point.x >= 0 && point.y >= 0 && point.x < width && point.y < height;

  bool isBlocked(GridPoint point) => cells[point.y][point.x] == GridCellType.blocked;
}

class GridPathDifficulty {
  const GridPathDifficulty();

  PuzzleDifficulty compute(GridPathDifficultyConfig config) {
    final area = config.width * config.height;
    final sizeFactor = (area / 36).clamp(0.8, 3.0);
    final obstacleFactor = (config.obstacleDensity * 1.8).clamp(0.0, 1.2);
    final branchFactor = (config.branchComplexity / 10).clamp(0.0, 1.0);
    final falsePathFactor = (config.falsePathCount / 8).clamp(0.0, 1.0);
    final restrictionFactor = [
      config.rules.moveLimit != null ? 0.35 : 0,
      config.rules.disallowRevisit ? 0.2 : 0,
      config.timePressureEnabled ? 0.35 : 0,
    ].reduce((a, b) => a + b);
    final score = ((sizeFactor * 2.4) + (obstacleFactor * 2.0) + (branchFactor * 1.8) + (falsePathFactor * 1.6) + restrictionFactor)
        .clamp(0.0, 10.0);

    final tier = switch (score) {
      < 2.8 => 'Easy',
      < 5.5 => 'Medium',
      < 7.6 => 'Hard',
      _ => 'Expert',
    };

    return PuzzleDifficulty(
      score: score,
      tier: tier,
      explanation: {
        'grid_size': '${config.width}x${config.height}',
        'obstacle_density': config.obstacleDensity,
        'branch_complexity': config.branchComplexity,
        'false_path_count': config.falsePathCount,
        'move_limit': config.rules.moveLimit,
        'no_revisit': config.rules.disallowRevisit,
        'timer_seconds': config.rules.timerSeconds,
      },
    );
  }
}

class GridPathGenerator {
  const GridPathGenerator({
    PuzzleSeedCodec seedCodec = const PuzzleSeedCodec(),
    GridPathDifficulty difficulty = const GridPathDifficulty(),
  })  : _seedCodec = seedCodec,
        _difficulty = difficulty;

  final PuzzleSeedCodec _seedCodec;
  final GridPathDifficulty _difficulty;

  GridPathPuzzleInstance generate({required PuzzleSeedInput seedInput, required GridPathDifficultyConfig config}) {
    final seed = _seedCodec.derive(seedInput);
    final rng = DeterministicRng(seed.value);
    final difficulty = _difficulty.compute(config);

    final width = clampInt(config.width, 4, 12);
    final height = clampInt(config.height, 4, 12);
    final start = GridPoint(0, rng.nextInt(height));
    final end = GridPoint(width - 1, rng.nextInt(height));

    final guaranteedPath = _carveMainPath(width: width, height: height, start: start, end: end, rng: rng);
    final openCells = <GridPoint>{...guaranteedPath};

    final branchStats = _injectBranches(
      openCells: openCells,
      width: width,
      height: height,
      fromPath: guaranteedPath,
      branchCount: config.branchComplexity,
      maxBranchLength: 3,
      rng: rng,
    );

    final falseStats = _injectFalseRoutes(
      openCells: openCells,
      width: width,
      height: height,
      fromPath: guaranteedPath,
      falseCount: config.falsePathCount,
      rng: rng,
    );

    final area = width * height;
    final blockedTarget = (area * clampDouble(config.obstacleDensity, 0.0, 0.6)).round();
    final blockedCells = <GridPoint>{};
    final candidates = rng.shuffle(
      List.generate(area, (i) => GridPoint(i % width, i ~/ width))
          .where((point) => !openCells.contains(point) && point != start && point != end),
    );
    for (final point in candidates) {
      if (blockedCells.length >= blockedTarget) break;
      blockedCells.add(point);
    }

    final cells = List<List<GridCellType>>.generate(
      height,
      (y) => List<GridCellType>.generate(width, (x) => blockedCells.contains(GridPoint(x, y)) ? GridCellType.blocked : GridCellType.open),
      growable: false,
    );
    cells[start.y][start.x] = GridCellType.start;
    cells[end.y][end.x] = GridCellType.end;

    if (!GridPathValidator.hasPath(cells: cells, start: start, end: end)) {
      throw StateError('Generated unsolvable grid for seed ${seed.value}');
    }

    return GridPathPuzzleInstance(
      id: 'grid_path_${seed.value}',
      seed: seed,
      preview: PuzzlePreview(
        name: 'Perbug Grid Path',
        summary: 'Connect start to end without entering blocked tiles.',
        rules: _rulesSummary(config.rules),
        difficulty: difficulty,
      ),
      width: width,
      height: height,
      cells: cells,
      start: start,
      end: end,
      suggestedSolutionLength: guaranteedPath.length,
      rules: config.rules,
      difficultyConfig: config,
      debug: {
        'generated_solution_length': guaranteedPath.length,
        'dead_end_branches': branchStats['dead_end_branches'] ?? 0,
        'false_routes': falseStats['false_routes'] ?? 0,
        'blocked_tiles': blockedCells.length,
        'obstacle_density_actual': blockedCells.length / area,
        'seed': seed.value,
        'solvable_verified': true,
      },
    );
  }

  List<String> _rulesSummary(GridPathMovementRules rules) {
    final values = <String>['Orthogonal movement only'];
    if (rules.disallowRevisit) values.add('Cannot revisit tiles');
    if (rules.moveLimit != null) values.add('Move limit: ${rules.moveLimit}');
    if (rules.timerSeconds != null) values.add('Timer: ${rules.timerSeconds}s');
    return values;
  }

  List<GridPoint> _carveMainPath({
    required int width,
    required int height,
    required GridPoint start,
    required GridPoint end,
    required DeterministicRng rng,
  }) {
    final path = <GridPoint>[start];
    var current = start;
    var guard = 0;
    while (current != end && guard < width * height * 4) {
      guard += 1;
      final candidates = <GridPoint>[];
      final horizontalStep = current.x < end.x ? 1 : -1;
      if (current.x != end.x) {
        candidates.add(GridPoint(current.x + horizontalStep, current.y));
      }
      if (current.y < end.y) candidates.add(GridPoint(current.x, current.y + 1));
      if (current.y > end.y) candidates.add(GridPoint(current.x, current.y - 1));
      if (rng.chance(0.35)) {
        candidates.add(GridPoint(current.x, current.y + (rng.chance(0.5) ? 1 : -1)));
      }

      final valid = candidates.where((p) {
        final inside = p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
        if (!inside) return false;
        if (path.contains(p) && p != end) return false;
        return true;
      }).toList(growable: false);

      if (valid.isEmpty) {
        current = path[path.length - 2];
        path.removeLast();
        continue;
      }

      current = valid[rng.nextInt(valid.length)];
      if (path.isEmpty || path.last != current) {
        path.add(current);
      }
    }

    if (path.last != end) path.add(end);
    return path;
  }

  Map<String, int> _injectBranches({
    required Set<GridPoint> openCells,
    required int width,
    required int height,
    required List<GridPoint> fromPath,
    required int branchCount,
    required int maxBranchLength,
    required DeterministicRng rng,
  }) {
    var deadEnds = 0;
    for (var i = 0; i < branchCount; i += 1) {
      final anchor = fromPath[rng.nextInt(fromPath.length)];
      var current = anchor;
      var carved = 0;
      for (var step = 0; step < maxBranchLength; step += 1) {
        final neighbors = _neighbors(current, width, height).where((point) => !openCells.contains(point)).toList(growable: false);
        if (neighbors.isEmpty) break;
        current = neighbors[rng.nextInt(neighbors.length)];
        openCells.add(current);
        carved += 1;
      }
      if (carved > 0) deadEnds += 1;
    }
    return {'dead_end_branches': deadEnds};
  }

  Map<String, int> _injectFalseRoutes({
    required Set<GridPoint> openCells,
    required int width,
    required int height,
    required List<GridPoint> fromPath,
    required int falseCount,
    required DeterministicRng rng,
  }) {
    var falseRoutes = 0;
    final nearStart = fromPath.take((fromPath.length / 2).ceil()).toList(growable: false);
    for (var i = 0; i < falseCount; i += 1) {
      final anchor = nearStart[rng.nextInt(nearStart.length)];
      final options = _neighbors(anchor, width, height).where((point) => !openCells.contains(point)).toList(growable: false);
      if (options.isEmpty) continue;
      final routeStart = options[rng.nextInt(options.length)];
      openCells.add(routeStart);
      if (rng.chance(0.55)) {
        final ext = _neighbors(routeStart, width, height).where((point) => !openCells.contains(point)).toList(growable: false);
        if (ext.isNotEmpty) {
          openCells.add(ext[rng.nextInt(ext.length)]);
        }
      }
      falseRoutes += 1;
    }
    return {'false_routes': falseRoutes};
  }

  List<GridPoint> _neighbors(GridPoint point, int width, int height) {
    return [
      GridPoint(point.x + 1, point.y),
      GridPoint(point.x - 1, point.y),
      GridPoint(point.x, point.y + 1),
      GridPoint(point.x, point.y - 1),
    ].where((p) => p.x >= 0 && p.y >= 0 && p.x < width && p.y < height).toList(growable: false);
  }
}

class GridPathMoveValidation {
  const GridPathMoveValidation({required this.isValid, this.reason});

  final bool isValid;
  final String? reason;
}

class GridPathValidator {
  static GridPathMoveValidation validateMove({
    required GridPathPuzzleInstance instance,
    required List<GridPoint> path,
    required GridPoint move,
  }) {
    if (!instance.isInside(move)) {
      return const GridPathMoveValidation(isValid: false, reason: 'Out of bounds');
    }
    if (instance.isBlocked(move)) {
      return const GridPathMoveValidation(isValid: false, reason: 'Blocked tile');
    }
    if (path.isEmpty && move != instance.start) {
      return const GridPathMoveValidation(isValid: false, reason: 'Path must start from start tile');
    }
    if (path.isNotEmpty) {
      final prev = path.last;
      final distance = (prev.x - move.x).abs() + (prev.y - move.y).abs();
      if (instance.rules.orthogonalOnly && distance != 1) {
        return const GridPathMoveValidation(isValid: false, reason: 'Move must be orthogonal and adjacent');
      }
      if (instance.rules.disallowRevisit && path.contains(move)) {
        return const GridPathMoveValidation(isValid: false, reason: 'Cannot revisit a tile');
      }
    }
    if (instance.rules.moveLimit != null && path.length + 1 > instance.rules.moveLimit!) {
      return const GridPathMoveValidation(isValid: false, reason: 'Move limit reached');
    }
    return const GridPathMoveValidation(isValid: true);
  }

  static bool isCompleted({required GridPathPuzzleInstance instance, required List<GridPoint> path}) {
    if (path.isEmpty) return false;
    return path.last == instance.end;
  }

  static bool hasPath({
    required List<List<GridCellType>> cells,
    required GridPoint start,
    required GridPoint end,
  }) {
    final height = cells.length;
    final width = cells.first.length;
    final visited = <GridPoint>{start};
    final queue = Queue<GridPoint>()..add(start);

    while (queue.isNotEmpty) {
      final current = queue.removeFirst();
      if (current == end) return true;
      final neighbors = [
        GridPoint(current.x + 1, current.y),
        GridPoint(current.x - 1, current.y),
        GridPoint(current.x, current.y + 1),
        GridPoint(current.x, current.y - 1),
      ];
      for (final next in neighbors) {
        if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
        if (visited.contains(next)) continue;
        if (cells[next.y][next.x] == GridCellType.blocked) continue;
        visited.add(next);
        queue.add(next);
      }
    }

    return false;
  }
}
