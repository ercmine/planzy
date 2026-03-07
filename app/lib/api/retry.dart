import 'dart:io';
import 'dart:math';

import 'package:http/http.dart' as http;

class RetryPolicy {
  const RetryPolicy({
    this.maxRetries = 3,
    this.baseDelay = const Duration(milliseconds: 300),
    this.factor = 2,
    this.jitterRatio = 0.2,
  });

  final int maxRetries;
  final Duration baseDelay;
  final int factor;
  final double jitterRatio;

  bool shouldRetryException(Object error) {
    return error is SocketException || error is http.ClientException;
  }

  bool shouldRetryStatusCode(int statusCode) {
    return statusCode == 429 || statusCode == 502 || statusCode == 503 || statusCode == 504;
  }

  Duration delayForAttempt(int attempt, {Random? random}) {
    final randomizer = random ?? Random();
    final exponentialMs = baseDelay.inMilliseconds * pow(factor, attempt).toInt();
    final jitter = ((randomizer.nextDouble() * 2 - 1) * jitterRatio * exponentialMs).round();
    final computed = exponentialMs + jitter;
    final safe = computed <= 0 ? baseDelay.inMilliseconds : computed;
    return Duration(milliseconds: safe);
  }
}
