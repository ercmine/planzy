import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'leaderboard_models.dart';

final leaderboardTypeProvider = StateProvider<LeaderboardType>((_) => LeaderboardType.creator);
final leaderboardWindowProvider = StateProvider<LeaderboardWindow>((_) => LeaderboardWindow.weekly);

final leaderboardGameHubProvider = Provider<GameHubData>((ref) {
  final window = ref.watch(leaderboardWindowProvider);
  final windowLabel = switch (window) {
    LeaderboardWindow.daily => 'today',
    LeaderboardWindow.weekly => 'this week',
    LeaderboardWindow.monthly => 'this month',
    LeaderboardWindow.allTime => 'all time',
  };
  final seasonActive = window != LeaderboardWindow.allTime;
  final seasonName = switch (window) {
    LeaderboardWindow.daily => 'Weekend Sprint',
    LeaderboardWindow.weekly => 'Season 12 · Local Legends',
    LeaderboardWindow.monthly => 'March Masters',
    LeaderboardWindow.allTime => 'Legacy Archive',
  };

  return GameHubData(
    status: StatusHeroModel(
      title: 'Your competition hub',
      seasonLabel: seasonName,
      rankLabel: switch (window) {
        LeaderboardWindow.daily => '#12 in Hidden Gems today',
        LeaderboardWindow.weekly => '#8 creator in Minneapolis this week',
        LeaderboardWindow.monthly => '#21 creator this month',
        LeaderboardWindow.allTime => '#57 all-time prestige',
      },
      creatorTier: 'Scene Builder · Gold',
      explorerTier: 'City Insider · Platinum',
      cityContribution: 'Minneapolis +420 season energy',
      streakLabel: '9 week creator streak',
      levelLabel: 'Level 18 prestige',
      recentUnlock: 'Nightlife curator crest',
      nextMilestone: '78 pts to Trendsetter tier',
      progress: switch (window) {
        LeaderboardWindow.daily => 0.72,
        LeaderboardWindow.weekly => 0.81,
        LeaderboardWindow.monthly => 0.58,
        LeaderboardWindow.allTime => 0.94,
      },
    ),
    season: SeasonModel(
      name: seasonName,
      timeRemaining: switch (window) {
        LeaderboardWindow.daily => '11h left',
        LeaderboardWindow.weekly => '2d 14h left',
        LeaderboardWindow.monthly => '10d left',
        LeaderboardWindow.allTime => 'No active reset',
      },
      reward: switch (window) {
        LeaderboardWindow.allTime => 'Archive badges and prestige history',
        _ => 'Diamond frame + city banner placement',
      },
      isActive: seasonActive,
      resetLabel: switch (window) {
        LeaderboardWindow.daily => 'Resets at midnight local time',
        LeaderboardWindow.weekly => 'Weekly reset every Monday',
        LeaderboardWindow.monthly => 'Monthly reset on April 1',
        LeaderboardWindow.allTime => 'Historical standings only',
      },
    ),
    creatorTier: const TierBandModel(
      label: 'Scene Builder',
      subtitle: 'Trusted creators with consistent quality on canonical place IDs.',
      progressLabel: 'Promotion pressure: top 10% protected by trust score',
      isPromoted: true,
    ),
    explorerTier: const TierBandModel(
      label: 'City Insider',
      subtitle: 'Explorers who finish collections, streaks, and district mastery runs.',
      progressLabel: 'Need 3 verified discoveries for Trendsetter',
      isPromoted: false,
    ),
    competitions: [
      CompetitionCardModel(
        title: 'Top Coffee Explorers',
        subtitle: 'Trusted coffee runs grounded in canonical cafés around Uptown.',
        timeRemaining: seasonActive ? '18h left' : 'Archived',
        reward: '250 XP · barista badge',
        positionLabel: '#3 right now',
        leaders: const ['Luca', 'Mina', 'You'],
        ctaLabel: seasonActive ? 'Keep climbing' : 'Review archive',
        state: seasonActive ? CompetitionState.live : CompetitionState.locked,
      ),
      const CompetitionCardModel(
        title: 'City battle · Minneapolis vs Chicago',
        subtitle: 'Creator quality, explorer momentum, and trust-weighted scene energy.',
        timeRemaining: '2d left',
        reward: 'Winning city gets spotlight slots',
        positionLabel: 'Your city is ahead by 4%',
        leaders: ['Minneapolis', 'Chicago', 'Austin'],
        ctaLabel: 'Boost your city',
        state: CompetitionState.endingSoon,
      ),
      const CompetitionCardModel(
        title: 'Weekend hidden gem sprint',
        subtitle: 'Publish overlooked places with moderation-safe proof and quality captions.',
        timeRemaining: 'Starts in 6h',
        reward: 'Season prestige + trophy variant',
        positionLabel: 'Unlocked for Platinum explorers',
        leaders: ['Ari', 'Nia', 'Jules'],
        ctaLabel: 'Set reminder',
        state: CompetitionState.upcoming,
      ),
    ],
    battles: const [
      BattleCardModel(
        title: 'Neighborhood battle · North Loop',
        subtitle: 'Local scene race across coffee, nightlife, and hidden gems.',
        status: 'North Loop is surging',
        metric: '84% district mastery',
        yourImpact: 'You contributed 6 verified places',
      ),
      BattleCardModel(
        title: 'Category showdown · Nightlife',
        subtitle: 'The hottest category by trusted creator output this cycle.',
        status: 'Nightlife passed Parks',
        metric: '+12% creator energy',
        yourImpact: '1 trophy unlock away from specialist rank',
      ),
    ],
    creatorLeaderboard: _creatorEntries(windowLabel),
    explorerLeaderboard: _explorerEntries(windowLabel),
    cityLeaderboard: _cityEntries(windowLabel),
    categoryLeaderboard: _categoryEntries(windowLabel),
    quests: const [
      QuestCardModel(
        title: 'Publish 3 trusted reviews',
        description: 'Hit three moderation-safe creator posts tied to canonical place IDs.',
        reward: '120 XP · creator streak shield',
        progressLabel: '2 of 3 complete',
        progress: 0.67,
      ),
      QuestCardModel(
        title: 'Complete the hidden gems loop',
        description: 'Visit or review four under-the-radar spots in your city.',
        reward: 'District mastery token',
        progressLabel: '3 of 4 complete',
        progress: 0.75,
      ),
    ],
    collections: const [
      CollectionCardModel(
        title: 'Minneapolis coffee passport',
        description: 'Collect iconic neighborhood cafés to raise local prestige.',
        completionLabel: '9 of 12 cafés',
        progress: 0.75,
      ),
      CollectionCardModel(
        title: 'Warehouse district after-dark',
        description: 'Own the nightlife shelf with verified late-night discoveries.',
        completionLabel: '5 of 8 venues',
        progress: 0.62,
      ),
    ],
    socialMoments: const [
      SocialMomentumModel(
        headline: 'You passed Nia in hidden gems',
        detail: 'Two creators you follow are within 20 points of your coffee rank.',
      ),
      SocialMomentumModel(
        headline: 'Top 3 in your circle for Coffee',
        detail: 'Your followers gained +11% more momentum after your latest review streak.',
      ),
    ],
    recentRewards: const [
      RewardItemModel(
        title: 'Nightlife Curator Crest',
        subtitle: 'Unlocked for 5 high-quality nightlife reviews this month.',
      ),
      RewardItemModel(
        title: 'Minneapolis banner token',
        subtitle: 'Awarded for top-10 city contribution last reset.',
      ),
    ],
    milestones: const [
      MilestoneModel(
        title: 'Trendsetter tier',
        description: 'Gain 78 more trust-weighted score to promote next reset.',
        progressLabel: '78 pts remaining',
      ),
      MilestoneModel(
        title: 'Coffee specialist rank',
        description: 'One more verified café collection completion unlocks prestige.',
        progressLabel: '1 collection left',
      ),
    ],
  );
});

final leaderboardEntriesProvider = Provider<List<LeaderboardEntry>>((ref) {
  final data = ref.watch(leaderboardGameHubProvider);
  final type = ref.watch(leaderboardTypeProvider);
  return switch (type) {
    LeaderboardType.creator => data.creatorLeaderboard,
    LeaderboardType.explorer => data.explorerLeaderboard,
    LeaderboardType.city => data.cityLeaderboard,
    LeaderboardType.category => data.categoryLeaderboard,
  };
});

List<LeaderboardEntry> _creatorEntries(String windowLabel) => [
      LeaderboardEntry(
        rank: 1,
        entityId: 'creator_1',
        displayName: 'Ari @ari',
        subtitle: 'Coffee + hidden gems · $windowLabel',
        score: 98.2,
        trustLabel: 'Trusted',
        delta: 2,
      ),
      LeaderboardEntry(
        rank: 2,
        entityId: 'creator_2',
        displayName: 'You',
        subtitle: 'Minneapolis nightlife specialist',
        score: 95.8,
        trustLabel: 'Trusted+',
        delta: 4,
      ),
      LeaderboardEntry(
        rank: 3,
        entityId: 'creator_3',
        displayName: 'Nia @nia',
        subtitle: 'District mastery runner',
        score: 94.1,
        trustLabel: 'High',
        delta: -1,
      ),
    ];

List<LeaderboardEntry> _explorerEntries(String windowLabel) => [
      LeaderboardEntry(
        rank: 1,
        entityId: 'explorer_1',
        displayName: 'Luca',
        subtitle: '12 verified discoveries · $windowLabel',
        score: 122.6,
        trustLabel: 'Trusted',
        delta: 1,
      ),
      LeaderboardEntry(
        rank: 2,
        entityId: 'explorer_2',
        displayName: 'You',
        subtitle: 'Collection streak active',
        score: 118.4,
        trustLabel: 'Trusted+',
        delta: 3,
      ),
      LeaderboardEntry(
        rank: 3,
        entityId: 'explorer_3',
        displayName: 'Mina',
        subtitle: 'Neighborhood completion race',
        score: 117.0,
        trustLabel: 'Developing',
        delta: 0,
      ),
    ];

List<LeaderboardEntry> _cityEntries(String windowLabel) => [
      LeaderboardEntry(
        rank: 1,
        entityId: 'city_mpls',
        displayName: 'Minneapolis',
        subtitle: 'Trusted creator energy · $windowLabel',
        score: 410.3,
        trustLabel: 'High trust',
        delta: 1,
      ),
      LeaderboardEntry(
        rank: 2,
        entityId: 'city_chi',
        displayName: 'Chicago',
        subtitle: 'Category battle leader',
        score: 397.0,
        trustLabel: 'Trusted',
        delta: 3,
      ),
      LeaderboardEntry(
        rank: 3,
        entityId: 'city_atx',
        displayName: 'Austin',
        subtitle: 'Explorer surge',
        score: 389.4,
        trustLabel: 'High',
        delta: -1,
      ),
    ];

List<LeaderboardEntry> _categoryEntries(String windowLabel) => [
      LeaderboardEntry(
        rank: 1,
        entityId: 'cat_coffee',
        displayName: 'Coffee',
        subtitle: 'Most completed collections · $windowLabel',
        score: 255.8,
        trustLabel: 'Trusted',
        delta: 2,
      ),
      LeaderboardEntry(
        rank: 2,
        entityId: 'cat_nightlife',
        displayName: 'Nightlife',
        subtitle: 'Fastest creator growth',
        score: 252.7,
        trustLabel: 'High',
        delta: 4,
      ),
      LeaderboardEntry(
        rank: 3,
        entityId: 'cat_parks',
        displayName: 'Parks',
        subtitle: 'Explorer-friendly leader',
        score: 249.7,
        trustLabel: 'Trusted',
        delta: -1,
      ),
    ];
