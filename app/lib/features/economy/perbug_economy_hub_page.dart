import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart' show DateFormat;

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../models/reward_dashboard.dart';
import '../../providers/app_providers.dart';
import '../challenges/challenge_models.dart';
import '../collections/collection_models.dart';
import '../home/map_discovery_tab.dart';
import '../home/home_page.dart';
import 'economy_models.dart';

class PerbugEconomyHubPage extends ConsumerWidget {
  const PerbugEconomyHubPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rewardDashboard = ref.watch(rewardDashboardProvider);
    final economy = ref.watch(economyDashboardProvider);
    final questHub = ref.watch(profileChallengeSummaryProvider);
    final collections = ref.watch(profileCollectionsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Perbug Balance')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(rewardDashboardProvider);
          ref.invalidate(economyDashboardProvider);
          ref.invalidate(profileChallengeSummaryProvider);
          ref.invalidate(profileCollectionsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.m),
          children: [
            const PremiumHeader(
              title: 'Perbug Balance',
              subtitle: 'A premium view of your earnings, claim flow, active quests, and collection loops.',
              badge: AppPill(label: 'Rewards hub', icon: Icons.auto_awesome_rounded),
            ),
            const SizedBox(height: AppSpacing.m),
            economy.when(
              data: (data) => _BalanceHero(data: data),
              loading: () => const AppCard(child: LinearProgressIndicator()),
              error: (e, _) => AppCard(child: Text('Could not load wallet: $e')),
            ),
            const SizedBox(height: AppSpacing.m),
            rewardDashboard.when(
              data: (data) => _RewardSnapshots(data: data),
              loading: () => const AppCard(child: ListTile(title: Text('Loading reward ledger...'))),
              error: (e, _) => AppCard(child: ListTile(title: Text('Reward feed unavailable'), subtitle: Text('$e'))),
            ),
            const SizedBox(height: AppSpacing.m),
            AppSectionHeader(
              title: 'Nearby earning loops',
              subtitle: 'Quests, sponsored rewards, and collection streaks available now.',
              trailing: IconButton(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const MapDiscoveryTab())),
                icon: const Icon(Icons.map_outlined),
              ),
            ),
            const SizedBox(height: AppSpacing.s),
            economy.when(
              data: (data) => _QuestAndCollectionGrid(
                quests: data.activeQuests,
                economyCollections: data.collections,
                collectionCards: collections.valueOrNull ?? const [],
                summary: questHub.valueOrNull,
              ),
              loading: () => const AppCard(child: ListTile(title: Text('Loading quest and collection opportunities...'))),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _BalanceHero extends StatelessWidget {
  const _BalanceHero({required this.data});

  final EconomyDashboard data;

  @override
  Widget build(BuildContext context) {
    final membership = data.membership;
    return AppCard(
      glow: true,
      tone: AppCardTone.reward,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AppPill(label: 'Perbug Balance', icon: Icons.account_balance_wallet_outlined),
              const Spacer(),
              if (membership?.active == true)
                AppPill(label: 'PERBUG ${membership!.tier.toUpperCase()}', icon: Icons.workspace_premium_outlined),
            ],
          ),
          const SizedBox(height: AppSpacing.m),
          AnimatedCountText(
            value: data.wallet.balancePerbug,
            suffix: ' PERBUG',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            membership?.active == true
                ? 'Membership renews ${_formatDate(membership!.expiresAt)}'
                : 'No premium membership active yet',
          ),
        ],
      ),
    );
  }
}

class _RewardSnapshots extends StatelessWidget {
  const _RewardSnapshots({required this.data});

  final RewardDashboard data;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AppSectionHeader(title: 'Reward activity', subtitle: 'Readable ledger with pending, claimable, and claimed states.'),
        const SizedBox(height: AppSpacing.s),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            AppPill(label: 'Earn available ${data.claimableDisplay}', icon: Icons.savings_outlined),
            AppPill(label: 'Claimed ${data.claimedDisplay}', icon: Icons.check_circle_outline),
            AppPill(label: 'Pending ${data.pendingCount}', icon: Icons.timelapse_outlined),
          ],
        ),
        const SizedBox(height: AppSpacing.s),
        if (data.claimable.isEmpty)
          const AppCard(tone: AppCardTone.kpi, child: ListTile(title: Text('No claimable rewards yet'), subtitle: Text('Visit reward-enabled places, complete quests, and finish collections.'))),
        ...data.claimable.take(4).map((item) => _RewardRow(item: item, claimable: true)),
        ...data.history.take(6).map((item) => _RewardRow(item: item, claimable: false)),
      ],
    );
  }
}

class _RewardRow extends StatelessWidget {
  const _RewardRow({required this.item, required this.claimable});

  final RewardOverviewItem item;
  final bool claimable;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: AppCard(
        tone: claimable ? AppCardTone.reward : AppCardTone.kpi,
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(claimable ? Icons.bolt_outlined : Icons.receipt_long_outlined),
          title: Text(item.place.name),
          subtitle: Text(claimable ? 'Claim now · ${item.review.rewardStatus}' : item.review.rewardStatus),
          trailing: Text(item.review.finalRewardAmount ?? '0'),
        ),
      ),
    );
  }
}

class _QuestAndCollectionGrid extends StatelessWidget {
  const _QuestAndCollectionGrid({
    required this.quests,
    required this.economyCollections,
    required this.collectionCards,
    required this.summary,
  });

  final List<EconomyQuest> quests;
  final List<EconomyCollection> economyCollections;
  final List<CollectionCardModel> collectionCards;
  final ChallengeSummary? summary;

  @override
  Widget build(BuildContext context) {
    if (quests.isEmpty && collectionCards.isEmpty && economyCollections.isEmpty) {
      return const AppCard(
        child: ListTile(
          title: Text('Nothing unlocked yet'),
          subtitle: Text('Explore map hotspots to unlock quests, collections, and sponsored opportunities.'),
        ),
      );
    }

    return Column(
      children: [
        if (summary != null)
          AppCard(
            tone: AppCardTone.kpi,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Active quests: ${summary!.inProgress}'),
                Text('Completed: ${summary!.completed}'),
                Text('Available: ${summary!.totalAvailable}'),
              ],
            ),
          ),
        const SizedBox(height: 8),
        ...quests.take(4).map(
          (quest) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: AppCard(
              tone: AppCardTone.featured,
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.flag_outlined),
                title: Text(quest.title),
                subtitle: Text('Quest reward · ${quest.rewardPerbug.toStringAsFixed(1)} PERBUG · Ends ${_formatDate(quest.endsAt)}'),
                trailing: const AppPill(label: 'Claim now', icon: Icons.arrow_forward),
              ),
            ),
          ),
        ),
        ...collectionCards.take(3).map(
          (collection) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: AppCard(
              tone: AppCardTone.collection,
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.collections_bookmark_outlined),
                title: Text(collection.title),
                subtitle: Text(collection.remainingItems == 1
                    ? '1 more place to complete'
                    : '${collection.completedItems}/${collection.totalItems} places completed'),
                trailing: Text('${(collection.progress * 100).round()}%'),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

String _formatDate(String iso) {
  final value = DateTime.tryParse(iso);
  if (value == null) return 'soon';
  return DateFormat.MMMd().format(value.toLocal());
}
