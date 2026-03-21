enum LeaderboardType { creator, explorer, city, category }

enum LeaderboardWindow { daily, weekly, monthly, allTime }

enum CompetitionState { live, endingSoon, upcoming, locked }

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.entityId,
    required this.displayName,
    required this.score,
    required this.trustLabel,
    required this.delta,
    this.subtitle,
  });

  final int rank;
  final String entityId;
  final String displayName;
  final double score;
  final String trustLabel;
  final int delta;
  final String? subtitle;
}

class StatusHeroModel {
  const StatusHeroModel({
    required this.title,
    required this.seasonLabel,
    required this.rankLabel,
    required this.creatorTier,
    required this.explorerTier,
    required this.cityContribution,
    required this.streakLabel,
    required this.levelLabel,
    required this.recentUnlock,
    required this.nextMilestone,
    required this.progress,
  });

  final String title;
  final String seasonLabel;
  final String rankLabel;
  final String creatorTier;
  final String explorerTier;
  final String cityContribution;
  final String streakLabel;
  final String levelLabel;
  final String recentUnlock;
  final String nextMilestone;
  final double progress;
}

class SeasonModel {
  const SeasonModel({
    required this.name,
    required this.timeRemaining,
    required this.reward,
    required this.isActive,
    required this.resetLabel,
  });

  final String name;
  final String timeRemaining;
  final String reward;
  final bool isActive;
  final String resetLabel;
}

class TierBandModel {
  const TierBandModel({
    required this.label,
    required this.subtitle,
    required this.progressLabel,
    required this.isPromoted,
  });

  final String label;
  final String subtitle;
  final String progressLabel;
  final bool isPromoted;
}

class CompetitionCardModel {
  const CompetitionCardModel({
    required this.title,
    required this.subtitle,
    required this.timeRemaining,
    required this.reward,
    required this.positionLabel,
    required this.leaders,
    required this.ctaLabel,
    required this.state,
  });

  final String title;
  final String subtitle;
  final String timeRemaining;
  final String reward;
  final String positionLabel;
  final List<String> leaders;
  final String ctaLabel;
  final CompetitionState state;
}

class BattleCardModel {
  const BattleCardModel({
    required this.title,
    required this.subtitle,
    required this.status,
    required this.metric,
    required this.yourImpact,
  });

  final String title;
  final String subtitle;
  final String status;
  final String metric;
  final String yourImpact;
}

class QuestCardModel {
  const QuestCardModel({
    required this.title,
    required this.description,
    required this.reward,
    required this.progressLabel,
    required this.progress,
  });

  final String title;
  final String description;
  final String reward;
  final String progressLabel;
  final double progress;
}

class CollectionCardModel {
  const CollectionCardModel({
    required this.title,
    required this.description,
    required this.completionLabel,
    required this.progress,
  });

  final String title;
  final String description;
  final String completionLabel;
  final double progress;
}

class SocialMomentumModel {
  const SocialMomentumModel({
    required this.headline,
    required this.detail,
  });

  final String headline;
  final String detail;
}

class RewardItemModel {
  const RewardItemModel({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;
}

class MilestoneModel {
  const MilestoneModel({
    required this.title,
    required this.description,
    required this.progressLabel,
  });

  final String title;
  final String description;
  final String progressLabel;
}

class GameHubData {
  const GameHubData({
    required this.status,
    required this.season,
    required this.creatorTier,
    required this.explorerTier,
    required this.competitions,
    required this.battles,
    required this.creatorLeaderboard,
    required this.explorerLeaderboard,
    required this.cityLeaderboard,
    required this.categoryLeaderboard,
    required this.quests,
    required this.collections,
    required this.socialMoments,
    required this.recentRewards,
    required this.milestones,
  });

  final StatusHeroModel status;
  final SeasonModel season;
  final TierBandModel creatorTier;
  final TierBandModel explorerTier;
  final List<CompetitionCardModel> competitions;
  final List<BattleCardModel> battles;
  final List<LeaderboardEntry> creatorLeaderboard;
  final List<LeaderboardEntry> explorerLeaderboard;
  final List<LeaderboardEntry> cityLeaderboard;
  final List<LeaderboardEntry> categoryLeaderboard;
  final List<QuestCardModel> quests;
  final List<CollectionCardModel> collections;
  final List<SocialMomentumModel> socialMoments;
  final List<RewardItemModel> recentRewards;
  final List<MilestoneModel> milestones;
}
