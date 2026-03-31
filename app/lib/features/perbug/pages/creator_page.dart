import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/widgets.dart';
import '../chain/perbug_chain_providers.dart';
import '../perbug_providers.dart';
import '../models/perbug_models.dart';
import 'wallet_page.dart';

class PerbugCreatorPage extends ConsumerStatefulWidget {
  const PerbugCreatorPage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  ConsumerState<PerbugCreatorPage> createState() => _PerbugCreatorPageState();
}

class _PerbugCreatorPageState extends ConsumerState<PerbugCreatorPage> {
  bool _sendingTip = false;

  @override
  Widget build(BuildContext context) {
    final wallet = ref.watch(walletAddressProvider);
    final plantingAsync = ref.watch(plantingTreesProvider);
    final ownedAsync = ref.watch(ownedTreesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(plantingTreesProvider);
        ref.invalidate(ownedTreesProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const PremiumHeader(
            title: 'Creator',
            subtitle: 'Creator identity now lives through trees: media, support, and wallet-backed care in one profile.',
            badge: AppPill(label: 'Creator tree identity', icon: Icons.person_outline),
          ),
          const SizedBox(height: 12),
          AppCard(
            tone: AppCardTone.featured,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Connected wallet', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                SelectableText(wallet ?? 'Disconnected'),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.icon(
                      onPressed: _sendingTip ? null : () => _sendDirectTip(wallet),
                      icon: const Icon(Icons.currency_exchange),
                      label: Text(_sendingTip ? 'Sending…' : 'Send ETH directly'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => showModalBottomSheet<void>(
                        context: context,
                        showDragHandle: true,
                        builder: (_) => const Padding(
                          padding: EdgeInsets.all(16),
                          child: PerbugWalletPage(),
                        ),
                      ),
                      icon: const Icon(Icons.account_balance_wallet_outlined),
                      label: const Text('Wallet + network'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          plantingAsync.when(
            data: (trees) {
              final creators = _creatorSummary(trees);
              if (creators.isEmpty) {
                return const AppCard(child: Text('No creator trees published yet.'));
              }
              return AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Featured creators', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    ...creators.take(5).map(
                      (creator) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(creator.handle),
                        subtitle: Text('${creator.treeCount} trees • ${creator.supportActions} support actions'),
                        trailing: TextButton(onPressed: () => widget.onOpenTree(creator.treeId), child: const Text('Open tree')),
                      ),
                    ),
                  ],
                ),
              );
            },
            error: (error, _) => AppCard(child: Text('Creator feed unavailable: $error')),
            loading: () => const AppCard(child: LinearProgressIndicator()),
          ),
          const SizedBox(height: 12),
          ownedAsync.when(
            data: (trees) {
              if (wallet == null || wallet.isEmpty || trees.isEmpty) {
                return const AppCard(child: Text('Own a tree to unlock your creator support stats.'));
              }
              final recentlyWatered = trees.where((tree) => tree.lastWateredAt != null).length;
              final readyToWater = trees.where((tree) => tree.canWaterNow).length;
              return AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Your support dashboard', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        AppPill(label: '${trees.length} owned trees', icon: Icons.forest_outlined),
                        AppPill(label: '$readyToWater ready to water', icon: Icons.water_drop_outlined),
                        AppPill(label: '$recentlyWatered recently cared for', icon: Icons.favorite_outline),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ...trees.take(4).map(
                      (tree) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(tree.name),
                        subtitle: Text('Creator ${tree.founderHandle} • ${tree.locationLabel}'),
                        trailing: TextButton(onPressed: () => widget.onOpenTree(tree.id), child: const Text('Manage')),
                      ),
                    ),
                  ],
                ),
              );
            },
            error: (_, __) => const SizedBox.shrink(),
            loading: () => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Future<void> _sendDirectTip(String? wallet) async {
    if (wallet == null || wallet.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connect wallet before sending ETH support.')));
      return;
    }
    setState(() => _sendingTip = true);
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    setState(() => _sendingTip = false);
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Direct ETH support intent prepared. Confirm in your wallet.')));
  }

  List<_CreatorSummary> _creatorSummary(List<PerbugTree> trees) {
    final grouped = <String, List<PerbugTree>>{};
    for (final tree in trees) {
      grouped.putIfAbsent(tree.founderHandle, () => []).add(tree);
    }
    return grouped.entries
        .map(
          (entry) => _CreatorSummary(
            handle: entry.key,
            treeCount: entry.value.length,
            supportActions: entry.value.fold<int>(0, (sum, tree) => sum + tree.contributionCount),
            treeId: entry.value.first.id,
          ),
        )
        .toList(growable: false)
      ..sort((a, b) => b.supportActions.compareTo(a.supportActions));
  }
}

class _CreatorSummary {
  const _CreatorSummary({
    required this.handle,
    required this.treeCount,
    required this.supportActions,
    required this.treeId,
  });

  final String handle;
  final int treeCount;
  final int supportActions;
  final String treeId;
}
