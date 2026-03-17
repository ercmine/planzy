class ChallengeSummary {
  ChallengeSummary({
    required this.totalAvailable,
    required this.inProgress,
    required this.completed,
    required this.weeklyActive,
    required this.seasonalActive,
    required this.featuredLocales,
  });

  final int totalAvailable;
  final int inProgress;
  final int completed;
  final int weeklyActive;
  final int seasonalActive;
  final List<String> featuredLocales;

  factory ChallengeSummary.fromJson(Map<String, dynamic> json) {
    return ChallengeSummary(
      totalAvailable: (json['totalAvailable'] as num?)?.toInt() ?? 0,
      inProgress: (json['inProgress'] as num?)?.toInt() ?? 0,
      completed: (json['completed'] as num?)?.toInt() ?? 0,
      weeklyActive: (json['weeklyActive'] as num?)?.toInt() ?? 0,
      seasonalActive: (json['seasonalActive'] as num?)?.toInt() ?? 0,
      featuredLocales: (json['featuredLocales'] as List?)?.map((item) => item.toString()).where((item) => item.isNotEmpty).toList(growable: false) ?? const <String>[],
    );
  }
}

class QuestHubResponse {
  QuestHubResponse({required this.weekly, required this.seasonal, required this.upcoming});

  final List<QuestCard> weekly;
  final List<QuestCard> seasonal;
  final List<UpcomingQuest> upcoming;

  factory QuestHubResponse.fromJson(Map<String, dynamic> json) {
    List<QuestCard> cards(String key) => (json[key] as List?)
            ?.whereType<Map>()
            .map((item) => QuestCard.fromJson(item.cast<String, dynamic>()))
            .toList(growable: false) ??
        const <QuestCard>[];

    return QuestHubResponse(
      weekly: cards('weekly'),
      seasonal: cards('seasonal'),
      upcoming: (json['upcoming'] as List?)
              ?.whereType<Map>()
              .map((item) => UpcomingQuest.fromJson(item.cast<String, dynamic>()))
              .toList(growable: false) ??
          const <UpcomingQuest>[],
    );
  }
}

class QuestCard {
  QuestCard({required this.id, required this.name, required this.cadence, required this.rewardXp, required this.secondsRemaining});

  final String id;
  final String name;
  final String cadence;
  final int rewardXp;
  final int secondsRemaining;

  factory QuestCard.fromJson(Map<String, dynamic> json) {
    final progress = json['progress'] as Map<String, dynamic>?;
    final reward = json['reward'] as Map<String, dynamic>?;
    final window = progress?['window'] as Map<String, dynamic>?;
    return QuestCard(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      cadence: json['cadence']?.toString() ?? 'weekly',
      rewardXp: (reward?['xp'] as num?)?.toInt() ?? 0,
      secondsRemaining: (window?['secondsRemaining'] as num?)?.toInt() ?? 0,
    );
  }
}

class UpcomingQuest {
  UpcomingQuest({required this.id, required this.name, required this.cadence});

  final String id;
  final String name;
  final String cadence;

  factory UpcomingQuest.fromJson(Map<String, dynamic> json) {
    return UpcomingQuest(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      cadence: json['cadence']?.toString() ?? 'event',
    );
  }
}
