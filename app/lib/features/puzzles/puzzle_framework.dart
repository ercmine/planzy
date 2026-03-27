import 'dart:math' as math;

enum PuzzleType { gridPath }

class PuzzleSeedInput {
  const PuzzleSeedInput({
    required this.nodeId,
    required this.latitude,
    required this.longitude,
    this.salt,
  });

  final String nodeId;
  final double latitude;
  final double longitude;
  final String? salt;
}

class PuzzleSeed {
  const PuzzleSeed({required this.source, required this.value});

  final String source;
  final int value;
}

class PuzzleDifficulty {
  const PuzzleDifficulty({
    required this.score,
    required this.tier,
    required this.explanation,
  });

  final double score;
  final String tier;
  final Map<String, Object> explanation;
}

class PuzzlePreview {
  const PuzzlePreview({
    required this.name,
    required this.summary,
    required this.rules,
    required this.difficulty,
  });

  final String name;
  final String summary;
  final List<String> rules;
  final PuzzleDifficulty difficulty;
}

class PuzzleInstance {
  const PuzzleInstance({
    required this.id,
    required this.type,
    required this.seed,
    required this.preview,
  });

  final String id;
  final PuzzleType type;
  final PuzzleSeed seed;
  final PuzzlePreview preview;
}

enum PuzzleSessionStatus { preview, active, succeeded, failed, abandoned }

class PuzzleSession {
  const PuzzleSession({
    required this.sessionId,
    required this.nodeId,
    required this.nodeRegion,
    required this.instance,
    required this.status,
    required this.startedAt,
    required this.retryCount,
    required this.moveCount,
    required this.elapsed,
  });

  final String sessionId;
  final String nodeId;
  final String nodeRegion;
  final PuzzleInstance instance;
  final PuzzleSessionStatus status;
  final DateTime startedAt;
  final int retryCount;
  final int moveCount;
  final Duration elapsed;
}

class PuzzleResult {
  const PuzzleResult({
    required this.sessionId,
    required this.nodeId,
    required this.status,
    required this.duration,
    required this.moveCount,
    required this.retryCount,
    required this.difficulty,
    required this.seed,
    required this.metadata,
  });

  final String sessionId;
  final String nodeId;
  final PuzzleSessionStatus status;
  final Duration duration;
  final int moveCount;
  final int retryCount;
  final PuzzleDifficulty difficulty;
  final PuzzleSeed seed;
  final Map<String, Object> metadata;
}

class PuzzleCompletionHooks {
  const PuzzleCompletionHooks({
    this.onStarted,
    this.onAbandoned,
    this.onFailed,
    this.onSucceeded,
    this.onRewardDispatch,
    this.onEnergyAward,
  });

  final void Function(PuzzleSession session)? onStarted;
  final void Function(PuzzleResult result)? onAbandoned;
  final void Function(PuzzleResult result)? onFailed;
  final void Function(PuzzleResult result)? onSucceeded;
  final void Function(PuzzleResult result)? onRewardDispatch;
  final void Function(PuzzleResult result)? onEnergyAward;
}

class PuzzleSeedCodec {
  const PuzzleSeedCodec();

  PuzzleSeed derive(PuzzleSeedInput input) {
    final normalizedLat = input.latitude.toStringAsFixed(6);
    final normalizedLng = input.longitude.toStringAsFixed(6);
    final source = '${input.nodeId}|$normalizedLat|$normalizedLng|${input.salt ?? 'base'}';
    final value = _fnv1a32(source);
    return PuzzleSeed(source: source, value: value);
  }

  int _fnv1a32(String text) {
    var hash = 0x811C9DC5;
    for (final code in text.codeUnits) {
      hash ^= code;
      hash = (hash * 0x01000193) & 0xFFFFFFFF;
    }
    return hash;
  }
}

class DeterministicRng {
  DeterministicRng(int seed) : _state = seed & 0x7fffffff;

  int _state;

  double nextDouble() {
    _state = (1103515245 * _state + 12345) & 0x7fffffff;
    return _state / 0x7fffffff;
  }

  int nextInt(int max) {
    if (max <= 0) return 0;
    return (nextDouble() * max).floor();
  }

  bool chance(double probability) => nextDouble() < probability;

  T pick<T>(List<T> values) {
    if (values.isEmpty) {
      throw StateError('Cannot pick from empty list');
    }
    return values[nextInt(values.length)];
  }

  List<T> shuffle<T>(Iterable<T> values) {
    final list = values.toList(growable: true);
    for (var i = list.length - 1; i > 0; i -= 1) {
      final j = nextInt(i + 1);
      final tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }
}

int clampInt(int value, int min, int max) => math.max(min, math.min(max, value));

double clampDouble(double value, double min, double max) => math.max(min, math.min(max, value));
