import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'viewer_reward_models.dart';
import 'viewer_reward_providers.dart';

class ViewerRewardsDashboardPage extends ConsumerWidget {
  const ViewerRewardsDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(viewerRewardSummaryProvider);
    final history = ref.watch(viewerRewardHistoryProvider);
    return AppScaffold(
      appBar: AppBar(title: const Text('Viewer earnings')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(viewerRewardSummaryProvider);
          ref.invalidate(viewerRewardHistoryProvider);
          await Future.wait([
            ref.read(viewerRewardSummaryProvider.future),
            ref.read(viewerRewardHistoryProvider.future),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.m),
          children: [
            summary.when(
              data: (data) => Column(
                children: [
                  AppCard(
                    tone: AppCardTone.reward,
                    glow: true,
                    child: ListTile(
                      title: Text('${data.totalEarned.toStringAsFixed(1)} PERBUG earned'),
                      subtitle: Text('Watch ${data.watchEarned.toStringAsFixed(1)} · Rating ${data.ratingEarned.toStringAsFixed(1)} · Comment ${data.commentEarned.toStringAsFixed(1)}'),
                      trailing: Text('Pending ${data.pending.toStringAsFixed(1)}'),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.s),
                  AppCard(
                    child: ListTile(
                      leading: const Icon(Icons.speed_outlined),
                      title: Text('Daily cap ${data.dailyCapRemaining}/${data.dailyCap ?? '-'} remaining'),
                      subtitle: Text(data.dailyCapRemaining == 0 ? 'Daily cap reached. Come back tomorrow to keep earning.' : 'Meaningful engagement is required for rewards.'),
                    ),
                  ),
                  if (data.notifications.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.s),
                    AppCard(
                      child: Column(
                        children: data.notifications
                            .map((note) => ListTile(leading: const Icon(Icons.notifications_active_outlined), title: Text(note)))
                            .toList(growable: false),
                      ),
                    ),
                  ],
                ],
              ),
              loading: () => const AppCard(child: ListTile(title: Text('Loading viewer rewards...'))),
              error: (error, _) => AppCard(child: ListTile(title: const Text('Viewer rewards unavailable'), subtitle: Text('$error'))),
            ),
            const SizedBox(height: AppSpacing.m),
            Text('Reward history', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.s),
            history.when(
              data: (items) {
                if (items.isEmpty) {
                  return const AppCard(
                    child: ListTile(
                      title: Text('No engagement earnings yet'),
                      subtitle: Text('Watch eligible videos, rate after qualifying watch time, and post thoughtful comments to start earning.'),
                    ),
                  );
                }
                return Column(
                  children: items
                      .map(
                        (item) => AppCard(
                          tone: _tone(item.status),
                          child: ListTile(
                            leading: Icon(_icon(item.action)),
                            title: Text(_title(item)),
                            subtitle: Text(_subtitle(item)),
                            trailing: Text(_amount(item)),
                          ),
                        ),
                      )
                      .toList(growable: false),
                );
              },
              loading: () => const AppCard(child: ListTile(title: Text('Loading activity...'))),
              error: (error, _) => AppCard(child: ListTile(title: const Text('Could not load reward activity'), subtitle: Text('$error'))),
            ),
          ],
        ),
      ),
    );
  }
}

String _title(ViewerRewardHistoryItem item) {
  return '${item.action[0].toUpperCase()}${item.action.substring(1)} · ${item.videoTitle}';
}

String _subtitle(ViewerRewardHistoryItem item) {
  final parts = <String>[
    item.status.name,
    if (item.placeName?.isNotEmpty == true) item.placeName!,
    if (item.campaignLabel?.isNotEmpty == true) item.campaignLabel!,
    if (item.reason?.isNotEmpty == true) item.reason!,
  ];
  return parts.join(' · ');
}

String _amount(ViewerRewardHistoryItem item) {
  final sign = item.perbug > 0 ? '+' : '';
  return '$sign${item.perbug.toStringAsFixed(1)}';
}

IconData _icon(String action) {
  if (action.contains('comment')) return Icons.comment_outlined;
  if (action.contains('rating')) return Icons.star_outline_rounded;
  return Icons.play_circle_outline_rounded;
}

AppCardTone _tone(ViewerRewardStatusType status) {
  switch (status) {
    case ViewerRewardStatusType.earned:
      return AppCardTone.reward;
    case ViewerRewardStatusType.pending:
    case ViewerRewardStatusType.eligibleSoon:
      return AppCardTone.kpi;
    case ViewerRewardStatusType.denied:
    case ViewerRewardStatusType.suspicious:
      return AppCardTone.kpi;
    default:
      return AppCardTone.standard;
  }
}
