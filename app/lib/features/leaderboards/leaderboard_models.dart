enum LeaderboardType { creator, explorer, city, category }

enum LeaderboardWindow { daily, weekly, monthly, allTime }

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.entityId,
    required this.displayName,
    required this.score,
    required this.trustLabel,
    required this.delta,
  });

  final int rank;
  final String entityId;
  final String displayName;
  final double score;
  final String trustLabel;
  final int delta;
}
