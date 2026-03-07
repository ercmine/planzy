import 'dart:math';

class TelemetryBackoff {
  TelemetryBackoff({
    this.baseDelay = const Duration(milliseconds: 500),
    this.factor = 2,
    this.maxDelay = const Duration(seconds: 30),
    this.jitterPercent = 0.2,
    Random? random,
  }) : _random = random ?? Random();

  final Duration baseDelay;
  final int factor;
  final Duration maxDelay;
  final double jitterPercent;
  final Random _random;

  Duration nextDelay(int attempt) {
    final safeAttempt = attempt < 0 ? 0 : attempt;
    final exponentialMs =
        baseDelay.inMilliseconds * pow(factor, safeAttempt).toDouble();
    final cappedMs = min(exponentialMs, maxDelay.inMilliseconds.toDouble());

    final jitterRange = cappedMs * jitterPercent;
    final jitter = (_random.nextDouble() * 2 * jitterRange) - jitterRange;

    final withJitter = (cappedMs + jitter).round();
    final bounded = withJitter.clamp(
      baseDelay.inMilliseconds,
      maxDelay.inMilliseconds,
    );

    return Duration(milliseconds: bounded);
  }
}
