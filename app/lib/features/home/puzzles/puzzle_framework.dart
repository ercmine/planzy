import 'dart:math';

/// Canonical puzzle types for node gameplay. Sequence Forge is #6.
enum PuzzleType {
  signalLock,
  pathWeave,
  glyphMatch,
  parityGrid,
  relaySwitch,
  perbugSequenceForge,
}

class PuzzleSeedInput {
  const PuzzleSeedInput({
    required this.nodeId,
    required this.latitude,
    required this.longitude,
    required this.difficultyBand,
    this.salt = '',
  });

  final String nodeId;
  final double latitude;
  final double longitude;
  final int difficultyBand;
  final String salt;

  /// Stable string used by all puzzle generators.
  String get material =>
      '$nodeId|${latitude.toStringAsFixed(6)}|${longitude.toStringAsFixed(6)}|$difficultyBand|$salt';

  /// FNV-1a hash for deterministic RNG seeding.
  int get deterministicSeed {
    var hash = 0x811c9dc5;
    for (final unit in material.codeUnits) {
      hash ^= unit;
      hash = (hash * 0x01000193) & 0xffffffff;
    }
    return hash & 0x7fffffff;
  }
}

enum PuzzleDifficultyTier { novice, standard, advanced, expert }

class PuzzleDifficulty {
  const PuzzleDifficulty({
    required this.score,
    required this.tier,
    required this.contributions,
    required this.explainer,
  });

  final int score;
  final PuzzleDifficultyTier tier;
  final Map<String, int> contributions;
  final String explainer;
}

class PuzzleInstance<TData> {
  const PuzzleInstance({
    required this.type,
    required this.instanceId,
    required this.seed,
    required this.difficulty,
    required this.data,
    required this.debugMetadata,
  });

  final PuzzleType type;
  final String instanceId;
  final int seed;
  final PuzzleDifficulty difficulty;
  final TData data;
  final Map<String, Object?> debugMetadata;
}

enum PuzzleSessionStatus { generated, started, submitted, succeeded, failed, abandoned }

class PuzzleSession<TData> {
  const PuzzleSession({
    required this.instance,
    required this.status,
    required this.selectedAnswers,
    required this.startedAt,
    required this.retries,
  });

  final PuzzleInstance<TData> instance;
  final PuzzleSessionStatus status;
  final Map<int, String> selectedAnswers;
  final DateTime? startedAt;
  final int retries;

  PuzzleSession<TData> copyWith({
    PuzzleSessionStatus? status,
    Map<int, String>? selectedAnswers,
    DateTime? startedAt,
    bool clearStartedAt = false,
    int? retries,
  }) {
    return PuzzleSession<TData>(
      instance: instance,
      status: status ?? this.status,
      selectedAnswers: selectedAnswers ?? this.selectedAnswers,
      startedAt: clearStartedAt ? null : (startedAt ?? this.startedAt),
      retries: retries ?? this.retries,
    );
  }
}

class PuzzleResult {
  const PuzzleResult({
    required this.type,
    required this.success,
    required this.nodeId,
    required this.duration,
    required this.retries,
    required this.difficulty,
    required this.telemetry,
  });

  final PuzzleType type;
  final bool success;
  final String nodeId;
  final Duration duration;
  final int retries;
  final PuzzleDifficulty difficulty;
  final Map<String, Object?> telemetry;
}

abstract class PuzzleGenerator<TData, TKnobs> {
  PuzzleType get type;

  PuzzleInstance<TData> generate({
    required PuzzleSeedInput seedInput,
    required TKnobs knobs,
  });
}

int pickDeterministically(Random random, int maxExclusive) => random.nextInt(maxExclusive);
