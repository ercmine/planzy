import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../providers/app_providers.dart';

class CreatorRewardsPage extends ConsumerWidget {
  const CreatorRewardsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(rewardDashboardProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Creator earnings'),
        actions: [
          IconButton(
            tooltip: 'Perbug balance hub',
            onPressed: () => context.push('/economy'),
            icon: const Icon(Icons.account_balance_wallet_outlined),
          )
        ],
      ),
      body: dashboard.when(
        data: (data) => ListView(
          padding: const EdgeInsets.all(AppSpacing.m),
          children: [
            const PremiumHeader(
              title: 'Creator earnings',
              subtitle: 'Track claimable rewards, payout momentum, and historical performance in one place.',
              badge: AppPill(label: 'Creator Pro', icon: Icons.insights_rounded),
            ),
            const SizedBox(height: AppSpacing.m),
            AppCard(
              glow: true,
              tone: AppCardTone.reward,
              child: ListTile(
                title: AnimatedCountText(
                  value: _asDouble(data.claimableDisplay),
                  suffix: ' PERBUG claimable',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                subtitle: Text('Claimed ${data.claimedDisplay} · Pending ${data.pendingCount}'),
                trailing: Text(data.walletPublicKey == null ? 'Connect wallet' : _mask(data.walletPublicKey!)),
              ),
            ),
            const SizedBox(height: AppSpacing.m),
            Text('Claimable rewards', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.s),
            if (data.claimable.isEmpty)
              const AppCard(tone: AppCardTone.kpi, child: ListTile(title: Text('No claimable rewards yet'), subtitle: Text('Approved reviews become claimable after moderation and wallet verification.'))),
            ...data.claimable.map((item) => AppCard(tone: AppCardTone.reward, child: ListTile(title: Text(item.place.name), subtitle: Text('Creator reward · Claim now · Position #${item.review.rewardPosition ?? '-'}'), trailing: Text(item.review.finalRewardAmount ?? '0')))),
            const SizedBox(height: AppSpacing.m),
            Text('Reward history', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.s),
            ...data.history.map((item) => AppCard(tone: AppCardTone.kpi, child: ListTile(title: Text(item.place.name), subtitle: Text('Claimed reward · ${item.review.rewardStatus}'), trailing: item.claim?.explorerUrl == null ? null : const Icon(Icons.open_in_new)))),
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

double _asDouble(String value) {
  final normalized = value.replaceAll(RegExp(r'[^0-9\.-]'), '');
  return double.tryParse(normalized) ?? 0;
}
