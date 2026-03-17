import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'leaderboard_models.dart';

final leaderboardTypeProvider = StateProvider<LeaderboardType>((_) => LeaderboardType.creator);
final leaderboardWindowProvider = StateProvider<LeaderboardWindow>((_) => LeaderboardWindow.weekly);

final leaderboardEntriesProvider = Provider<List<LeaderboardEntry>>((ref) {
  final type = ref.watch(leaderboardTypeProvider);
  final window = ref.watch(leaderboardWindowProvider);
  final suffix = window.name.toUpperCase();

  switch (type) {
    case LeaderboardType.creator:
      return [
        LeaderboardEntry(rank: 1, entityId: 'creator_1', displayName: 'Ari @ari', score: 98.2, trustLabel: 'Trusted', delta: 2),
        LeaderboardEntry(rank: 2, entityId: 'creator_2', displayName: 'Nia @nia', score: 95.4, trustLabel: 'High', delta: -1),
      ];
    case LeaderboardType.explorer:
      return [
        LeaderboardEntry(rank: 1, entityId: 'explorer_1', displayName: 'Luca', score: 122.6, trustLabel: 'Trusted', delta: 1),
        LeaderboardEntry(rank: 2, entityId: 'explorer_2', displayName: 'Mina', score: 118.1, trustLabel: 'Developing', delta: 0),
      ];
    case LeaderboardType.city:
      return [
        LeaderboardEntry(rank: 1, entityId: 'city_nyc', displayName: 'New York · $suffix', score: 410.3, trustLabel: 'High', delta: 1),
        LeaderboardEntry(rank: 2, entityId: 'city_mx', displayName: 'Mexico City · $suffix', score: 397.0, trustLabel: 'Trusted', delta: 3),
      ];
    case LeaderboardType.category:
      return [
        LeaderboardEntry(rank: 1, entityId: 'cat_coffee', displayName: 'Coffee · $suffix', score: 255.8, trustLabel: 'Trusted', delta: 2),
        LeaderboardEntry(rank: 2, entityId: 'cat_parks', displayName: 'Parks · $suffix', score: 249.7, trustLabel: 'High', delta: -1),
      ];
  }
});
