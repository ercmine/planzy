import 'dart:math' as math;

import 'puzzle_framework.dart';

enum LogicLocksClueType { exactPosition, notPosition, before, adjacent, eitherOr }

class LogicLocksDifficultyConfig {
  const LogicLocksDifficultyConfig({
    this.variableCount = 4,
    this.clueCount = 6,
    this.contradictionComplexity = 0.35,
    this.ambiguityLevel = 0.15,
    this.deductionDepth = 0.45,
    this.gridSize = 4,
    this.requireUniqueSolution = true,
  });

  final int variableCount;
  final int clueCount;
  final double contradictionComplexity;
  final double ambiguityLevel;
  final double deductionDepth;
  final int gridSize;
  final bool requireUniqueSolution;
}

class LogicLocksClue {
  const LogicLocksClue({
    required this.type,
    required this.entityA,
    this.entityB,
    this.slot,
    this.slotB,
    required this.text,
  });

  final LogicLocksClueType type;
  final String entityA;
  final String? entityB;
  final int? slot;
  final int? slotB;
  final String text;
}

class LogicLocksPuzzleData {
  const LogicLocksPuzzleData({
    required this.entities,
    required this.slotLabels,
    required this.solution,
    required this.clues,
    required this.allowedSolutions,
    required this.deductionDepthEstimate,
    required this.contradictionComplexityEstimate,
    required this.ambiguityEstimate,
  });

  final List<String> entities;
  final List<String> slotLabels;
  final List<String> solution;
  final List<LogicLocksClue> clues;
  final int allowedSolutions;
  final double deductionDepthEstimate;
  final double contradictionComplexityEstimate;
  final double ambiguityEstimate;
}

class LogicLocksPlayerState {
  const LogicLocksPlayerState({
    required this.slotAssignments,
    required this.undoStack,
  });

  factory LogicLocksPlayerState.empty(int slots) => LogicLocksPlayerState(
        slotAssignments: List<String?>.filled(slots, null),
        undoStack: const [],
      );

  final List<String?> slotAssignments;
  final List<List<String?>> undoStack;

  LogicLocksPlayerState assign(int slot, String? entity) {
    final next = List<String?>.from(slotAssignments);
    final previousEntitySlot = next.indexOf(entity);
    if (previousEntitySlot >= 0) {
      next[previousEntitySlot] = null;
    }
    next[slot] = entity;
    return LogicLocksPlayerState(slotAssignments: next, undoStack: [slotAssignments, ...undoStack]);
  }

  LogicLocksPlayerState reset() => LogicLocksPlayerState.empty(slotAssignments.length);

  LogicLocksPlayerState undo() {
    if (undoStack.isEmpty) return this;
    return LogicLocksPlayerState(slotAssignments: undoStack.first, undoStack: undoStack.sublist(1));
  }
}

class LogicLocksGenerator implements PuzzleGenerator<LogicLocksDifficultyConfig, LogicLocksPuzzleData> {
  @override
  PuzzleInstance<LogicLocksPuzzleData> generate({
    required PuzzleSeedInput seedInput,
    required LogicLocksDifficultyConfig config,
  }) {
    final rng = seededRandom(seedInput);
    final variableCount = math.max(3, config.variableCount);
    final gridSize = math.min(config.gridSize, variableCount);
    final entities = List<String>.generate(variableCount, (i) => 'Perbug ${String.fromCharCode(65 + i)}');
    final slotLabels = List<String>.generate(gridSize, (i) => 'Slot ${i + 1}');

    final solution = _deterministicSolution(entities, gridSize, rng);
    final cluePool = _buildCluePool(solution, rng);

    final selected = _selectClues(
      cluePool: cluePool,
      solution: solution,
      config: config,
      rng: rng,
    );

    final activeEntities = solution.toList(growable: false);
    final validSolutions = _solveAll(activeEntities, solution.length, selected);
    final contradictionEstimate = _contradictionComplexityEstimate(selected);
    final ambiguityEstimate = validSolutions.length / math.max(1, _factorial(solution.length));
    final depthEstimate = _deductionDepthEstimate(selected, solution.length);

    final difficulty = _computeDifficulty(config, contradictionEstimate, ambiguityEstimate, depthEstimate);

    return PuzzleInstance<LogicLocksPuzzleData>(
      type: PuzzleType.logicLocks,
      seed: seedInput.toDeterministicSeed(),
      difficulty: difficulty,
      data: LogicLocksPuzzleData(
        entities: entities,
        slotLabels: slotLabels,
        solution: solution,
        clues: selected,
        allowedSolutions: validSolutions.length,
        deductionDepthEstimate: depthEstimate,
        contradictionComplexityEstimate: contradictionEstimate,
        ambiguityEstimate: ambiguityEstimate,
      ),
      generatedAt: DateTime.now().toUtc(),
      debug: {
        'allValidSolutionCount': validSolutions.length,
        'targetClues': config.clueCount,
        'activeGridSize': gridSize,
        'seedLatLng': '${seedInput.latitude},${seedInput.longitude}',
      },
    );
  }

  List<String> _deterministicSolution(List<String> entities, int gridSize, math.Random rng) {
    final available = List<String>.from(entities)..shuffle(rng);
    return available.take(gridSize).toList(growable: false);
  }

  List<LogicLocksClue> _buildCluePool(List<String> solution, math.Random rng) {
    final clues = <LogicLocksClue>[];
    for (var slot = 0; slot < solution.length; slot++) {
      final e = solution[slot];
      clues.add(LogicLocksClue(type: LogicLocksClueType.exactPosition, entityA: e, slot: slot, text: '$e is in position ${slot + 1}.'));
      clues.add(LogicLocksClue(type: LogicLocksClueType.notPosition, entityA: e, slot: (slot + 1) % solution.length, text: '$e is not in position ${((slot + 1) % solution.length) + 1}.'));
    }

    for (var i = 0; i < solution.length; i++) {
      for (var j = i + 1; j < solution.length; j++) {
        final a = solution[i];
        final b = solution[j];
        clues.add(LogicLocksClue(type: LogicLocksClueType.before, entityA: a, entityB: b, text: '$a appears before $b.'));
        if ((j - i).abs() == 1) {
          clues.add(LogicLocksClue(type: LogicLocksClueType.adjacent, entityA: a, entityB: b, text: '$a is adjacent to $b.'));
        }
      }
    }

    for (var i = 0; i < solution.length - 1; i++) {
      final a = solution[i];
      final b = solution[i + 1];
      final aSlot = solution.indexOf(a);
      final bSlot = solution.indexOf(b);
      clues.add(
        LogicLocksClue(
          type: LogicLocksClueType.eitherOr,
          entityA: a,
          entityB: b,
          slot: aSlot,
          slotB: bSlot,
          text: 'Either $a is in position ${aSlot + 1} or $b is in position ${bSlot + 1}.',
        ),
      );
    }

    clues.shuffle(rng);
    return clues;
  }

  List<LogicLocksClue> _selectClues({
    required List<LogicLocksClue> cluePool,
    required List<String> solution,
    required LogicLocksDifficultyConfig config,
    required math.Random rng,
  }) {
    final selected = <LogicLocksClue>[];
    final entities = List<String>.from(solution);

    for (final clue in cluePool) {
      if (selected.length >= config.clueCount) break;

      final shouldPreferComplex = clue.type == LogicLocksClueType.eitherOr || clue.type == LogicLocksClueType.before;
      if (shouldPreferComplex && rng.nextDouble() > config.contradictionComplexity + 0.15) {
        continue;
      }

      selected.add(clue);
      final candidates = _solveAll(entities, solution.length, selected);
      final ambiguityRatio = candidates.length / math.max(1, _factorial(solution.length));
      final withinAmbiguity = ambiguityRatio <= (config.ambiguityLevel + 0.2);
      if (!withinAmbiguity && selected.length > 2) {
        selected.removeLast();
      }
    }

    if (config.requireUniqueSolution) {
      for (final clue in cluePool) {
        final candidates = _solveAll(entities, solution.length, selected);
        if (candidates.length <= 1) break;
        if (selected.contains(clue)) continue;
        selected.add(clue);
      }
    }

    return selected;
  }

  List<List<String>> _solveAll(List<String> entities, int size, List<LogicLocksClue> clues) {
    final all = <List<String>>[];
    void permute(List<String> arr, int l) {
      if (l == arr.length) {
        final candidate = List<String>.from(arr);
        if (_satisfiesAll(candidate, clues)) {
          all.add(candidate);
        }
        return;
      }
      for (var i = l; i < arr.length; i++) {
        final next = List<String>.from(arr);
        final t = next[l];
        next[l] = next[i];
        next[i] = t;
        permute(next, l + 1);
      }
    }

    permute(List<String>.from(entities.take(size)), 0);
    return all;
  }

  bool _satisfiesAll(List<String> arrangement, List<LogicLocksClue> clues) {
    for (final clue in clues) {
      final aSlot = arrangement.indexOf(clue.entityA);
      final bSlot = clue.entityB == null ? null : arrangement.indexOf(clue.entityB!);
      switch (clue.type) {
        case LogicLocksClueType.exactPosition:
          if (aSlot != clue.slot) return false;
          break;
        case LogicLocksClueType.notPosition:
          if (aSlot == clue.slot) return false;
          break;
        case LogicLocksClueType.before:
          if (bSlot == null || aSlot >= bSlot) return false;
          break;
        case LogicLocksClueType.adjacent:
          if (bSlot == null || (aSlot - bSlot).abs() != 1) return false;
          break;
        case LogicLocksClueType.eitherOr:
          final condA = aSlot == clue.slot;
          final condB = bSlot == clue.slotB;
          if (!(condA || condB)) return false;
          break;
      }
    }
    return true;
  }

  PuzzleDifficulty _computeDifficulty(
    LogicLocksDifficultyConfig config,
    double contradictionEstimate,
    double ambiguityEstimate,
    double depthEstimate,
  ) {
    final contributions = <String, double>{
      'variables': config.variableCount / 7,
      'clues': (1 - (config.clueCount / 12)).clamp(0, 1).toDouble(),
      'contradictionComplexity': contradictionEstimate,
      'ambiguity': ambiguityEstimate,
      'deductionDepth': depthEstimate,
      'gridSize': config.gridSize / 7,
    };

    final score = contributions.values.reduce((a, b) => a + b) / contributions.length;
    final tier = score < 0.35
        ? 'Easy'
        : score < 0.58
            ? 'Moderate'
            : score < 0.78
                ? 'Hard'
                : 'Expert';

    return PuzzleDifficulty(
      score: score,
      tier: tier,
      contributions: contributions,
      debug: {
        'targetDepth': config.deductionDepth,
        'targetAmbiguity': config.ambiguityLevel,
        'targetContradictionComplexity': config.contradictionComplexity,
      },
    );
  }

  double _contradictionComplexityEstimate(List<LogicLocksClue> clues) {
    if (clues.isEmpty) return 0;
    final complex = clues.where((c) => c.type == LogicLocksClueType.eitherOr || c.type == LogicLocksClueType.before).length;
    return complex / clues.length;
  }

  double _deductionDepthEstimate(List<LogicLocksClue> clues, int variables) {
    if (clues.isEmpty) return 0;
    final nonDirect = clues.where((c) => c.type != LogicLocksClueType.exactPosition).length;
    return (nonDirect / clues.length) * (clues.length / math.max(variables, 1));
  }

  int _factorial(int n) {
    var value = 1;
    for (var i = 2; i <= n; i++) {
      value *= i;
    }
    return value;
  }
}

class LogicLocksValidator implements PuzzleValidator<LogicLocksPuzzleData, LogicLocksPlayerState> {
  @override
  PuzzleResult validate({
    required PuzzleInstance<LogicLocksPuzzleData> instance,
    required LogicLocksPlayerState playerState,
    required int attempts,
    required DateTime startedAt,
    required DateTime endedAt,
  }) {
    final expected = instance.data.solution;
    final success = playerState.slotAssignments.length == expected.length &&
        playerState.slotAssignments.asMap().entries.every((entry) => entry.value == expected[entry.key]);

    return PuzzleResult(
      success: success,
      timeToSolve: endedAt.difference(startedAt),
      attempts: attempts,
      reason: success ? 'Solved' : 'Incorrect arrangement',
      rewardEnergyHook: success,
    );
  }
}
