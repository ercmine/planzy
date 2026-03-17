import 'package:flutter_test/flutter_test.dart';
import 'package:planzy/features/challenges/challenge_models.dart';

void main() {
  test('parses challenge summary payload', () {
    final summary = ChallengeSummary.fromJson({
      'totalAvailable': 8,
      'inProgress': 3,
      'completed': 2,
      'weeklyActive': 5,
      'seasonalActive': 3,
      'featuredLocales': ['Minneapolis', 'North Loop']
    });

    expect(summary.totalAvailable, 8);
    expect(summary.inProgress, 3);
    expect(summary.completed, 2);
    expect(summary.weeklyActive, 5);
    expect(summary.seasonalActive, 3);
    expect(summary.featuredLocales, ['Minneapolis', 'North Loop']);
  });

  test('parses quest hub payload', () {
    final hub = QuestHubResponse.fromJson({
      'weekly': [
        {
          'id': 'weekly-1',
          'name': 'Coffee quest',
          'cadence': 'weekly',
          'reward': {'xp': 200},
          'progress': {
            'window': {'secondsRemaining': 1000}
          }
        }
      ],
      'seasonal': [
        {
          'id': 'seasonal-1',
          'name': 'Spring quest',
          'cadence': 'seasonal',
          'reward': {'xp': 500},
          'progress': {
            'window': {'secondsRemaining': 5000}
          }
        }
      ],
      'upcoming': [
        {'id': 'event-1', 'name': 'Waterfront week', 'cadence': 'event'}
      ]
    });

    expect(hub.weekly.first.id, 'weekly-1');
    expect(hub.seasonal.first.rewardXp, 500);
    expect(hub.upcoming.first.cadence, 'event');
  });
}
