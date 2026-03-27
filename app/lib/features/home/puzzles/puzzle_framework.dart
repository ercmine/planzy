import 'dart:math' as math;

enum PuzzleType { gridPath, patternRecall, logicLocks }

class PuzzleSeedInput {
  const PuzzleSeedInput({
    required this.nodeId,
    required this.latitude,
    required this.longitude,
    this.difficultySalt = 'normal',
    this.extraSalt,
  });

  final String nodeId;
  final double latitude;
  final double longitude;
  final String difficultySalt;
  final String? extraSalt;

  /// Deterministic seed derivation from node coordinates + stable salts.
  ///
  /// Coordinates are normalized to fixed precision to avoid floating drift,
  /// then mixed with node id and optional salts.
  int toDeterministicSeed() {
    final lat = (latitude * 1e6).round();
    final lng = (longitude * 1e6).round();
    final base = '$nodeId|$lat|$lng|$difficultySalt|${extraSalt ?? ''}';
    var hash = 2166136261;
    for (final code in base.codeUnits) {
      hash ^= code;
      hash = (hash * 16777619) & 0x7fffffff;
    }
    return hash;
  }
}

class PuzzleDifficulty {
  const PuzzleDifficulty({
    required this.score,
    required this.tier,
    required this.contributions,
    this.debug = const {},
  });

  final double score;
  final String tier;
  final Map<String, double> contributions;
  final Map<String, Object?> debug;
}

class PuzzleInstance<TPuzzleData> {
  const PuzzleInstance({
    required this.type,
    required this.seed,
    required this.difficulty,
    required this.data,
    required this.generatedAt,
    this.debug = const {},
  });

  final PuzzleType type;
  final int seed;
  final PuzzleDifficulty difficulty;
  final TPuzzleData data;
  final DateTime generatedAt;
  final Map<String, Object?> debug;
}

enum PuzzleSessionStatus { generated, started, succeeded, failed, abandoned }

class PuzzleSession<TPuzzleData, TPlayerState> {
  const PuzzleSession({
    required this.instance,
    required this.status,
    required this.playerState,
    required this.attempts,
    required this.createdAt,
    this.startedAt,
    this.endedAt,
    this.lastError,
    this.analyticsEvents = const [],
  });

  final PuzzleInstance<TPuzzleData> instance;
  final PuzzleSessionStatus status;
  final TPlayerState playerState;
  final int attempts;
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final String? lastError;
  final List<PuzzleAnalyticsEvent> analyticsEvents;

  PuzzleSession<TPuzzleData, TPlayerState> copyWith({
    PuzzleSessionStatus? status,
    TPlayerState? playerState,
    int? attempts,
    DateTime? startedAt,
    DateTime? endedAt,
    String? lastError,
    List<PuzzleAnalyticsEvent>? analyticsEvents,
  }) {
    return PuzzleSession<TPuzzleData, TPlayerState>(
      instance: instance,
      status: status ?? this.status,
      playerState: playerState ?? this.playerState,
      attempts: attempts ?? this.attempts,
      createdAt: createdAt,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      lastError: lastError ?? this.lastError,
      analyticsEvents: analyticsEvents ?? this.analyticsEvents,
    );
  }
}

class PuzzleResult {
  const PuzzleResult({
    required this.success,
    required this.timeToSolve,
    required this.attempts,
    this.reason,
    this.rewardEnergyHook = false,
  });

  final bool success;
  final Duration timeToSolve;
  final int attempts;
  final String? reason;
  final bool rewardEnergyHook;
}

class PuzzleAnalyticsEvent {
  const PuzzleAnalyticsEvent({
    required this.name,
    required this.timestamp,
    this.payload = const {},
  });

  final String name;
  final DateTime timestamp;
  final Map<String, Object?> payload;
}

abstract class PuzzleGenerator<TConfig, TPuzzleData> {
  PuzzleInstance<TPuzzleData> generate({
    required PuzzleSeedInput seedInput,
    required TConfig config,
  });
}

abstract class PuzzleValidator<TPuzzleData, TPlayerState> {
  PuzzleResult validate({
    required PuzzleInstance<TPuzzleData> instance,
    required TPlayerState playerState,
    required int attempts,
    required DateTime startedAt,
    required DateTime endedAt,
  });
}

math.Random seededRandom(PuzzleSeedInput seedInput) => math.Random(seedInput.toDeterministicSeed());
