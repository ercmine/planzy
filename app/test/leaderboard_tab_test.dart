import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/leaderboards/leaderboard_models.dart';
import 'package:perbug/features/leaderboards/leaderboard_providers.dart';
import 'package:perbug/features/leaderboards/leaderboard_tab.dart';

void main() {
  Future<void> pumpHub(WidgetTester tester, {List<Override> overrides = const []}) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: const MaterialApp(home: Scaffold(body: LeaderboardTab())),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('renders the game hub hero and core modules', (tester) async {
    await pumpHub(tester);

    expect(find.text('Your competition hub'), findsOneWidget);
    expect(find.text('Live competitions'), findsOneWidget);
    expect(find.text('Quests and challenge progress'), findsOneWidget);
    expect(find.text('Recent rewards and trophy shelf'), findsOneWidget);
    expect(find.text('Top Coffee Explorers'), findsOneWidget);
  });

  testWidgets('switches family filters across creator and city ladders', (tester) async {
    await pumpHub(tester);

    expect(find.text('Ari @ari'), findsOneWidget);

    await tester.tap(find.text('Explorers'));
    await tester.pumpAndSettle();
    expect(find.text('Luca'), findsOneWidget);

    await tester.tap(find.text('Cities'));
    await tester.pumpAndSettle();
    expect(find.text('Minneapolis'), findsOneWidget);
    expect(find.text('Chicago'), findsOneWidget);
  });

  testWidgets('updates seasonal state for all-time archive', (tester) async {
    await pumpHub(tester);

    await tester.tap(find.text('All-time'));
    await tester.pumpAndSettle();

    expect(find.text('Archive'), findsOneWidget);
    expect(find.text('Legacy Archive'), findsOneWidget);
    expect(find.text('Historical standings only'), findsOneWidget);
    expect(find.text('Review archive'), findsOneWidget);
  });

  testWidgets('supports sparse backend-driven empty modules', (tester) async {
    const sparseData = GameHubData(
      status: StatusHeroModel(
        title: 'Your competition hub',
        seasonLabel: 'Sparse Season',
        rankLabel: '#98 explorer in a new market',
        creatorTier: 'Local Scout · Bronze',
        explorerTier: 'Local Scout · Bronze',
        cityContribution: 'No city battle yet',
        streakLabel: '1 day streak',
        levelLabel: 'Level 2',
        recentUnlock: 'Welcome badge',
        nextMilestone: 'Complete your first collection',
        progress: 0.1,
      ),
      season: SeasonModel(
        name: 'Sparse Season',
        timeRemaining: '5d left',
        reward: 'Starter rewards',
        isActive: true,
        resetLabel: 'Weekly reset every Monday',
      ),
      creatorTier: TierBandModel(
        label: 'Local Scout',
        subtitle: 'Early creator tier.',
        progressLabel: '2 posts to next tier',
        isPromoted: false,
      ),
      explorerTier: TierBandModel(
        label: 'Local Scout',
        subtitle: 'Early explorer tier.',
        progressLabel: '1 discovery to next tier',
        isPromoted: false,
      ),
      competitions: [],
      battles: [],
      creatorLeaderboard: [
        LeaderboardEntry(rank: 1, entityId: 'u1', displayName: 'Starter Sam', score: 22, trustLabel: 'Developing', delta: 0),
      ],
      explorerLeaderboard: [
        LeaderboardEntry(rank: 1, entityId: 'u1', displayName: 'Starter Sam', score: 22, trustLabel: 'Developing', delta: 0),
      ],
      cityLeaderboard: [],
      categoryLeaderboard: [],
      quests: [],
      collections: [],
      socialMoments: [],
      recentRewards: [],
      milestones: [],
    );

    await pumpHub(
      tester,
      overrides: [leaderboardGameHubProvider.overrideWithValue(sparseData)],
    );

    expect(find.text('Your competition hub'), findsOneWidget);
    expect(find.text('Starter Sam'), findsOneWidget);
    expect(find.text('Live competitions'), findsOneWidget);
    expect(find.text('Collections and mastery'), findsOneWidget);
  });
}
