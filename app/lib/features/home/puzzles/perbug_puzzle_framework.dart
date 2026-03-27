import 'dart:math' as math;

/// Shared puzzle type registry used by node challenges.
enum PuzzleType { gridPath, patternRecall, logicLocks, symbolMatch }

class PuzzleSeedInput {
  const PuzzleSeedInput({
    required this.nodeId,
    required this.latitude,
    required this.longitude,
    this.salt = 0,
  });

  final String nodeId;
  final double latitude;
  final double longitude;
  final int salt;

  /// Stable seed derived from node id + quantized lat/lng.
  ///
  /// We quantize coordinates at 1e6 precision so the same node always
  /// resolves to the same integer seed value.
  int toSeed() {
    final lat = (latitude * 1000000).round();
    final lng = (longitude * 1000000).round();
    final nodeHash = _stableStringHash(nodeId);
    var value = 146959810;
    value = (value * 16777619) ^ lat;
    value = (value * 16777619) ^ lng;
    value = (value * 16777619) ^ nodeHash;
    value = (value * 16777619) ^ salt;
    return value & 0x7fffffff;
  }
}

int _stableStringHash(String input) {
  var hash = 2166136261;
  for (final codeUnit in input.codeUnits) {
    hash ^= codeUnit;
    hash *= 16777619;
  }
  return hash & 0x7fffffff;
}

class PuzzleDifficulty {
  const PuzzleDifficulty({
    required this.score,
    required this.tier,
    required this.explainers,
  });

  final double score;
  final String tier;
  final Map<String, double> explainers;
}

abstract class PuzzleInstance {
  const PuzzleInstance({
    required this.id,
    required this.type,
    required this.seedInput,
    required this.difficulty,
  });

  final String id;
  final PuzzleType type;
  final PuzzleSeedInput seedInput;
  final PuzzleDifficulty difficulty;
}

class PuzzleSession {
  const PuzzleSession({
    required this.puzzleId,
    required this.puzzleType,
    required this.nodeId,
    required this.startedAt,
    required this.currentRound,
    required this.mistakes,
    required this.retries,
    this.endedAt,
    this.abandoned = false,
  });

  final String puzzleId;
  final PuzzleType puzzleType;
  final String nodeId;
  final DateTime startedAt;
  final DateTime? endedAt;
  final int currentRound;
  final int mistakes;
  final int retries;
  final bool abandoned;

  PuzzleSession copyWith({
    DateTime? endedAt,
    int? currentRound,
    int? mistakes,
    int? retries,
    bool? abandoned,
  }) {
    return PuzzleSession(
      puzzleId: puzzleId,
      puzzleType: puzzleType,
      nodeId: nodeId,
      startedAt: startedAt,
      endedAt: endedAt ?? this.endedAt,
      currentRound: currentRound ?? this.currentRound,
      mistakes: mistakes ?? this.mistakes,
      retries: retries ?? this.retries,
      abandoned: abandoned ?? this.abandoned,
    );
  }
}

class PuzzleResult {
  const PuzzleResult({
    required this.success,
    required this.completedRounds,
    required this.totalRounds,
    required this.mistakes,
    required this.startedAt,
    required this.endedAt,
    this.failureReason,
  });

  final bool success;
  final int completedRounds;
  final int totalRounds;
  final int mistakes;
  final DateTime startedAt;
  final DateTime endedAt;
  final String? failureReason;

  Duration get duration => endedAt.difference(startedAt);
}

class DeterministicRng {
  DeterministicRng(int seed) : _state = seed & 0x7fffffff;

  int _state;

  int nextInt(int max) {
    if (max <= 0) return 0;
    _state = (1103515245 * _state + 12345) & 0x7fffffff;
    return _state % max;
  }

  double nextDouble() {
    _state = (1103515245 * _state + 12345) & 0x7fffffff;
    return _state / 0x7fffffff;
  }

  T pick<T>(List<T> values) => values[nextInt(values.length)];

  List<T> shuffled<T>(List<T> values) {
    final mutable = [...values];
    for (var i = mutable.length - 1; i > 0; i--) {
      final j = nextInt(i + 1);
      final swap = mutable[i];
      mutable[i] = mutable[j];
      mutable[j] = swap;
    }
    return mutable;
  }
}

double normalizedScore(double value, double min, double max) {
  if (max <= min) return 0;
  return ((value - min) / (max - min)).clamp(0, 1);
}

String tierFromScore(double score) {
  if (score < 0.24) return 'Trivial';
  if (score < 0.45) return 'Easy';
  if (score < 0.65) return 'Moderate';
  if (score < 0.82) return 'Hard';
  return 'Brutal';
}

int deterministicIdFromSeed(PuzzleType type, int seed) {
  return ((type.index + 1) * 100000000 + seed) & 0x7fffffff;
}

int boundInt(int value, int min, int max) => math.max(min, math.min(max, value));
