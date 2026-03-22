import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/leaderboards/leaderboard_models.dart';
import 'package:perbug/features/leaderboards/leaderboard_providers.dart';
import 'package:perbug/features/leaderboards/leaderboard_tab.dart';

void main() {
  const hub = CompetitionHubModel(
    season: CompetitionSeasonModel(name: 'Season 1 · Perbug Competition', endsAtLabel: '2026-03-29T23:59:59Z', rewardPoolAtomic: '2500000000'),
    score: 84.5,
    streakDays: 3,
    cityRank: 4,
    claimableRewardAtomic: '150000000',
    missions: [
      CompetitionMissionCardModel(id: 'm1', title: 'Upload 1 approved place review today', description: 'Daily mission', rewardAtomic: '25000000', progressValue: 1, goalValue: 1, completed: true, claimed: false),
      CompetitionMissionCardModel(id: 'm2', title: 'Review 3 new coffee shops this week', description: 'Weekly mission', rewardAtomic: '75000000', progressValue: 2, goalValue: 3, completed: false, claimed: false),
      CompetitionMissionCardModel(id: 'm3', title: 'Get 10 likes in the first 48 hours to earn a bonus', description: 'Quality mission', rewardAtomic: '90000000', progressValue: 8, goalValue: 10, completed: false, claimed: false),
    ],
    leaderboards: [
      CompetitionLeaderboardModel(
        id: 'lb1',
        name: 'Global weekly leaderboard',
        type: 'weekly_global',
        myEntry: CompetitionLeaderboardEntryModel(userId: 'u1', score: 84.5, rank: 4),
        topEntries: [
          CompetitionLeaderboardEntryModel(userId: 'u2', score: 99, rank: 1),
          CompetitionLeaderboardEntryModel(userId: 'u3', score: 92, rank: 2),
          CompetitionLeaderboardEntryModel(userId: 'u1', score: 84.5, rank: 4),
        ],
      ),
    ],
    featuredChallenge: CompetitionMissionCardModel(id: 'm3', title: 'Get 10 likes in the first 48 hours to earn a bonus', description: 'Quality mission', rewardAtomic: '90000000', progressValue: 8, goalValue: 10, completed: false, claimed: false),
    rewards: [CompetitionRewardModel(id: 'r1', sourceType: 'mission', rewardAtomic: '90000000', status: 'claimable')],
    rewardHistory: [CompetitionRewardModel(id: 'r2', sourceType: 'leaderboard', rewardAtomic: '200000000', status: 'claimed')],
  );

  Future<void> pumpHub(WidgetTester tester, AsyncValue<CompetitionHubModel> state) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [competitionHubProvider.overrideWith((ref) async => state.requireValue)],
        child: const MaterialApp(home: Scaffold(body: LeaderboardTab())),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('renders mission cards, leaderboard cards, and reward sections', (tester) async {
    await pumpHub(tester, const AsyncData(hub));

    expect(find.text('Earn PERBUG'), findsOneWidget);
    expect(find.text('Daily missions'), findsOneWidget);
    expect(find.text('Weekly missions'), findsOneWidget);
    expect(find.text('Leaderboards'), findsOneWidget);
    expect(find.text('Claimable competition rewards'), findsOneWidget);
    expect(find.text('Competition reward history'), findsOneWidget);
    expect(find.text('Get 10 likes in the first 48 hours to earn a bonus'), findsAtLeastNWidgets(1));
  });

  testWidgets('shows empty-state copy for rewards and missions', (tester) async {
    const emptyHub = CompetitionHubModel(
      season: null,
      score: 0,
      streakDays: 0,
      cityRank: null,
      claimableRewardAtomic: '0',
      missions: [],
      leaderboards: [],
      featuredChallenge: null,
      rewards: [],
      rewardHistory: [],
    );

    await pumpHub(tester, const AsyncData(emptyHub));

    expect(find.text('No active missions right now'), findsNWidgets(2));
    expect(find.text('No claimable competition rewards yet'), findsOneWidget);
    expect(find.text('No competition reward history yet'), findsOneWidget);
  });

  testWidgets('shows error state when backend fails', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [competitionHubProvider.overrideWith((ref) => throw Exception('boom'))],
        child: const MaterialApp(home: Scaffold(body: LeaderboardTab())),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Competition is having trouble loading'), findsOneWidget);
  });
}
