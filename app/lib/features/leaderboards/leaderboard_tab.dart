import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'leaderboard_models.dart';
import 'leaderboard_providers.dart';

class LeaderboardTab extends ConsumerWidget {
  const LeaderboardTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = ref.watch(leaderboardTypeProvider);
    final window = ref.watch(leaderboardWindowProvider);
    final entries = ref.watch(leaderboardEntriesProvider);

    return Column(
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: SegmentedButton<LeaderboardType>(
            segments: const [
              ButtonSegment(value: LeaderboardType.creator, label: Text('Creators')),
              ButtonSegment(value: LeaderboardType.explorer, label: Text('Explorers')),
              ButtonSegment(value: LeaderboardType.city, label: Text('Cities')),
              ButtonSegment(value: LeaderboardType.category, label: Text('Categories')),
            ],
            selected: {type},
            onSelectionChanged: (value) => ref.read(leaderboardTypeProvider.notifier).state = value.first,
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: SegmentedButton<LeaderboardWindow>(
            segments: const [
              ButtonSegment(value: LeaderboardWindow.daily, label: Text('Daily')),
              ButtonSegment(value: LeaderboardWindow.weekly, label: Text('Weekly')),
              ButtonSegment(value: LeaderboardWindow.monthly, label: Text('Monthly')),
              ButtonSegment(value: LeaderboardWindow.allTime, label: Text('All-time')),
            ],
            selected: {window},
            onSelectionChanged: (value) => ref.read(leaderboardWindowProvider.notifier).state = value.first,
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: entries.length,
            itemBuilder: (_, index) {
              final row = entries[index];
              final deltaLabel = row.delta == 0 ? '—' : row.delta > 0 ? '+${row.delta}' : '${row.delta}';
              return Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text('${row.rank}')),
                  title: Text(row.displayName),
                  subtitle: Text('Trust: ${row.trustLabel}'),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(row.score.toStringAsFixed(1), style: Theme.of(context).textTheme.titleMedium),
                      Text(deltaLabel),
                    ],
                  ),
                ),
              );
            },
          ),
        )
      ],
    );
  }
}
