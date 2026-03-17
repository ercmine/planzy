import 'package:flutter_test/flutter_test.dart';
import 'package:planzy/features/challenges/challenge_models.dart';

void main() {
  test('parses challenge summary payload', () {
    final summary = ChallengeSummary.fromJson({
      'totalAvailable': 8,
      'inProgress': 3,
      'completed': 2,
      'featuredLocales': ['Minneapolis', 'North Loop']
    });

    expect(summary.totalAvailable, 8);
    expect(summary.inProgress, 3);
    expect(summary.completed, 2);
    expect(summary.featuredLocales, ['Minneapolis', 'North Loop']);
  });
}
