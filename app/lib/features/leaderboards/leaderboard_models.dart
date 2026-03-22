class CompetitionSeasonModel {
  const CompetitionSeasonModel({required this.name, required this.endsAtLabel, required this.rewardPoolAtomic});
  final String name;
  final String endsAtLabel;
  final String rewardPoolAtomic;

  factory CompetitionSeasonModel.fromJson(Map<String, dynamic> json) => CompetitionSeasonModel(
        name: (json['name'] ?? 'Competition').toString(),
        endsAtLabel: (json['endsAt'] ?? '').toString(),
        rewardPoolAtomic: (json['rewardPoolAtomic'] ?? '0').toString(),
      );
}

class CompetitionMissionCardModel {
  const CompetitionMissionCardModel({
    required this.id,
    required this.title,
    required this.description,
    required this.rewardAtomic,
    required this.progressValue,
    required this.goalValue,
    required this.completed,
    required this.claimed,
  });
  final String id;
  final String title;
  final String description;
  final String rewardAtomic;
  final int progressValue;
  final int goalValue;
  final bool completed;
  final bool claimed;

  double get progress => goalValue == 0 ? 0 : (progressValue / goalValue).clamp(0, 1).toDouble();

  factory CompetitionMissionCardModel.fromJson(Map<String, dynamic> json) {
    final progress = (json['progress'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
    return CompetitionMissionCardModel(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      rewardAtomic: (json['rewardAtomic'] ?? '0').toString(),
      progressValue: (progress['progressValue'] as num?)?.toInt() ?? 0,
      goalValue: (json['goalValue'] as num?)?.toInt() ?? 0,
      completed: progress['completed'] == true,
      claimed: progress['claimed'] == true,
    );
  }
}

class CompetitionLeaderboardEntryModel {
  const CompetitionLeaderboardEntryModel({required this.userId, required this.score, required this.rank, this.rewardAtomic});
  final String userId;
  final double score;
  final int rank;
  final String? rewardAtomic;
  factory CompetitionLeaderboardEntryModel.fromJson(Map<String, dynamic> json) => CompetitionLeaderboardEntryModel(
        userId: (json['userId'] ?? '').toString(),
        score: (json['score'] as num?)?.toDouble() ?? 0,
        rank: (json['rank'] as num?)?.toInt() ?? 0,
        rewardAtomic: json['rewardAtomic']?.toString(),
      );
}

class CompetitionLeaderboardModel {
  const CompetitionLeaderboardModel({required this.id, required this.name, required this.type, required this.topEntries, this.myEntry});
  final String id;
  final String name;
  final String type;
  final List<CompetitionLeaderboardEntryModel> topEntries;
  final CompetitionLeaderboardEntryModel? myEntry;

  factory CompetitionLeaderboardModel.fromJson(Map<String, dynamic> json) => CompetitionLeaderboardModel(
        id: (json['id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        type: (json['type'] ?? '').toString(),
        topEntries: ((json['topEntries'] as List?) ?? const [])
            .whereType<Map>()
            .map((entry) => CompetitionLeaderboardEntryModel.fromJson(entry.cast<String, dynamic>()))
            .toList(growable: false),
        myEntry: json['myEntry'] is Map ? CompetitionLeaderboardEntryModel.fromJson((json['myEntry'] as Map).cast<String, dynamic>()) : null,
      );
}

class CompetitionRewardModel {
  const CompetitionRewardModel({required this.id, required this.sourceType, required this.rewardAtomic, required this.status});
  final String id;
  final String sourceType;
  final String rewardAtomic;
  final String status;
  factory CompetitionRewardModel.fromJson(Map<String, dynamic> json) => CompetitionRewardModel(
        id: (json['id'] ?? '').toString(),
        sourceType: (json['sourceType'] ?? '').toString(),
        rewardAtomic: (json['rewardAtomic'] ?? '0').toString(),
        status: (json['status'] ?? '').toString(),
      );
}

class CompetitionHubModel {
  const CompetitionHubModel({
    required this.season,
    required this.score,
    required this.streakDays,
    required this.cityRank,
    required this.claimableRewardAtomic,
    required this.missions,
    required this.leaderboards,
    required this.featuredChallenge,
    required this.rewards,
    required this.rewardHistory,
  });

  final CompetitionSeasonModel? season;
  final double score;
  final int streakDays;
  final int? cityRank;
  final String claimableRewardAtomic;
  final List<CompetitionMissionCardModel> missions;
  final List<CompetitionLeaderboardModel> leaderboards;
  final CompetitionMissionCardModel? featuredChallenge;
  final List<CompetitionRewardModel> rewards;
  final List<CompetitionRewardModel> rewardHistory;

  factory CompetitionHubModel.fromJson(Map<String, dynamic> json) => CompetitionHubModel(
        season: json['season'] is Map<String, dynamic> ? CompetitionSeasonModel.fromJson(json['season'] as Map<String, dynamic>) : null,
        score: (json['score'] as num?)?.toDouble() ?? 0,
        streakDays: (json['streakDays'] as num?)?.toInt() ?? 0,
        cityRank: (json['cityRank'] as num?)?.toInt(),
        claimableRewardAtomic: (json['claimableRewardAtomic'] ?? '0').toString(),
        missions: ((json['missions'] as List?) ?? const []).whereType<Map>().map((item) => CompetitionMissionCardModel.fromJson(item.cast<String, dynamic>())).toList(growable: false),
        leaderboards: ((json['leaderboards'] as List?) ?? const []).whereType<Map>().map((item) => CompetitionLeaderboardModel.fromJson(item.cast<String, dynamic>())).toList(growable: false),
        featuredChallenge: json['featuredChallenge'] is Map ? CompetitionMissionCardModel.fromJson((json['featuredChallenge'] as Map).cast<String, dynamic>()) : null,
        rewards: ((json['rewards'] as List?) ?? const []).whereType<Map>().map((item) => CompetitionRewardModel.fromJson(item.cast<String, dynamic>())).toList(growable: false),
        rewardHistory: ((json['rewardHistory'] as List?) ?? const []).whereType<Map>().map((item) => CompetitionRewardModel.fromJson(item.cast<String, dynamic>())).toList(growable: false),
      );
}
