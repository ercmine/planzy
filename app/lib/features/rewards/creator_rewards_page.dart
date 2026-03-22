import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/spacing.dart';
import '../../providers/app_providers.dart';

class CreatorRewardsPage extends ConsumerWidget {
  const CreatorRewardsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(rewardDashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Creator earnings')),
      body: dashboard.when(
        data: (data) => ListView(
          padding: const EdgeInsets.all(AppSpacing.m),
          children: [
            Card(
              child: ListTile(
                title: Text('${data.claimableDisplay} PERBUG claimable'),
                subtitle: Text('Claimed: ${data.claimedDisplay} PERBUG · Pending reviews: ${data.pendingCount}'),
                trailing: Text(data.walletPublicKey == null ? 'Connect Phantom to claim PERBUG' : _mask(data.walletPublicKey!)),
              ),
            ),
            const SizedBox(height: AppSpacing.m),
            Text('Claimable rewards', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.s),
            if (data.claimable.isEmpty)
              const Card(child: ListTile(title: Text('No claimable rewards yet'), subtitle: Text('Your review was approved and is now claimable once it passes moderation and wallet auth.'))),
            ...data.claimable.map((item) => Card(child: ListTile(title: Text(item.place.name), subtitle: Text('Status: ${item.review.rewardStatus}'), trailing: Text('${item.review.finalRewardAmount ?? 0} PERBUG')))),
            const SizedBox(height: AppSpacing.m),
            Text('Reward history', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.s),
            ...data.history.map((item) => Card(child: ListTile(title: Text(item.place.name), subtitle: Text('Status: ${item.review.rewardStatus}'), trailing: item.claim?.explorerUrl == null ? null : const Icon(Icons.open_in_new)))),
          ],
        ),
        error: (error, _) => Center(child: Text('Failed to load rewards: $error')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

String _mask(String value) {
  if (value.length <= 8) return value;
  return '${value.substring(0, 4)}…${value.substring(value.length - 4)}';
}
