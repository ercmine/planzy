import 'dart:math' as math;

enum PuzzleType { gridPath, patternRecall }

class PuzzleSeedInput {
  const PuzzleSeedInput({
    required this.nodeId,
    required this.latitude,
    required this.longitude,
    this.salt = '',
    this.modifier = 0,
  });

  final String nodeId;
  final double latitude;
  final double longitude;
  final String salt;
  final int modifier;

  String stableSeedKey() {
    final lat = latitude.toStringAsFixed(6);
    final lng = longitude.toStringAsFixed(6);
    return '$nodeId|$lat|$lng|$salt|$modifier';
  }
}

class PuzzleDifficulty {
  const PuzzleDifficulty({
    required this.score,
    required this.tier,
    required this.explainer,
  });

  final double score;
  final String tier;
  final Map<String, double> explainer;
}

class PuzzleResult {
  const PuzzleResult({
    required this.success,
    required this.mistakes,
    required this.elapsed,
    required this.analytics,
  });

  final bool success;
  final int mistakes;
  final Duration elapsed;
  final Map<String, Object> analytics;
}

class PuzzleLifecycleEvent {
  const PuzzleLifecycleEvent({
    required this.name,
    required this.timestamp,
    required this.payload,
  });

  final String name;
  final DateTime timestamp;
  final Map<String, Object> payload;
}

abstract class PuzzleInstance {
  PuzzleType get type;

  PuzzleDifficulty get difficulty;

  PuzzleSeedInput get seedInput;

  Map<String, Object> debugMetadata();
}

abstract class PuzzleGenerator<T extends PuzzleInstance> {
  T generate({
    required PuzzleNodeContext node,
    required PuzzleSeedInput seedInput,
    required Map<String, Object> tuning,
  });
}

class PuzzleNodeContext {
  const PuzzleNodeContext({
    required this.nodeId,
    required this.latitude,
    required this.longitude,
    required this.region,
  });

  final String nodeId;
  final double latitude;
  final double longitude;
  final String region;
}

abstract class PuzzleValidator<T extends PuzzleInstance> {
  PuzzleResult validate({
    required T instance,
    required List<int> input,
    required Duration elapsed,
  });
}

/// Deterministic RNG using FNV-1a hash over node-derived seed data.
///
/// This ensures the same node lat/lng and salt/modifier produce the same
/// pseudo-random sequence across launches and sessions.
math.Random seededRandom(PuzzleSeedInput input) {
  final hash = _fnv1a32(input.stableSeedKey());
  return math.Random(hash);
}

int _fnv1a32(String value) {
  const offsetBasis = 0x811c9dc5;
  const fnvPrime = 0x01000193;
  var hash = offsetBasis;
  for (final codeUnit in value.codeUnits) {
    hash ^= codeUnit;
    hash = (hash * fnvPrime) & 0xffffffff;
  }
  return hash & 0x7fffffff;
}
