import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

enum PuzzleType {
  gridPath,
  patternRecall,
  logicLocks,
  symbolMatch,
  wordWeave,
}

class PuzzleSeedInput {
  const PuzzleSeedInput({
    required this.nodeId,
    required this.latitude,
    required this.longitude,
    this.salt = '',
  });

  final String nodeId;
  final double latitude;
  final double longitude;
  final String salt;

  /// Seed derivation policy used by all modular puzzle generators:
  /// 1) normalize lat/lng to 6 decimals to avoid platform float drift.
  /// 2) hash [nodeId|lat|lng|salt] with sha256.
  /// 3) read first 8 hex chars as a stable 32-bit int for Random(seed).
  int toDeterministicSeed() {
    final normalized = '$nodeId|${latitude.toStringAsFixed(6)}|${longitude.toStringAsFixed(6)}|$salt';
    final digest = sha256.convert(utf8.encode(normalized)).toString();
    final first32Bits = digest.substring(0, 8);
    return int.parse(first32Bits, radix: 16);
  }
}

class PuzzleDifficulty {
  const PuzzleDifficulty({
    required this.score,
    required this.tier,
    required this.explainer,
    required this.knobs,
  });

  final double score;
  final String tier;
  final Map<String, double> explainer;
  final Map<String, Object> knobs;
}

class PuzzleInstance<TBoard, TSolution> {
  const PuzzleInstance({
    required this.id,
    required this.type,
    required this.seed,
    required this.difficulty,
    required this.board,
    required this.solution,
    required this.debug,
  });

  final String id;
  final PuzzleType type;
  final PuzzleSeedInput seed;
  final PuzzleDifficulty difficulty;
  final TBoard board;
  final TSolution solution;
  final Map<String, Object> debug;
}

enum PuzzleSessionStatus { generated, started, succeeded, failed, abandoned }

class PuzzleSession<TBoard, TSolution, TInput> {
  const PuzzleSession({
    required this.instance,
    required this.status,
    required this.startedAt,
    required this.attemptsUsed,
    required this.maxRetries,
    required this.currentInput,
    required this.invalidSubmissions,
    required this.lifecycleEvents,
  });

  final PuzzleInstance<TBoard, TSolution> instance;
  final PuzzleSessionStatus status;
  final DateTime? startedAt;
  final int attemptsUsed;
  final int maxRetries;
  final TInput currentInput;
  final List<String> invalidSubmissions;
  final List<PuzzleLifecycleEvent> lifecycleEvents;

  int get retriesRemaining => max(0, maxRetries - attemptsUsed);
}

class PuzzleLifecycleEvent {
  const PuzzleLifecycleEvent({
    required this.name,
    required this.at,
    required this.metadata,
  });

  final String name;
  final DateTime at;
  final Map<String, Object?> metadata;
}

class PuzzleResult {
  const PuzzleResult({
    required this.success,
    required this.reason,
    required this.metadata,
  });

  final bool success;
  final String reason;
  final Map<String, Object?> metadata;
}

abstract class PuzzleGenerator<TConfig, TBoard, TSolution> {
  PuzzleInstance<TBoard, TSolution> generate({
    required PuzzleSeedInput seed,
    required TConfig config,
  });
}

abstract class PuzzleValidator<TBoard, TSolution, TInput> {
  PuzzleResult validate({
    required TBoard board,
    required TSolution solution,
    required TInput input,
  });
}
