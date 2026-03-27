import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/widgets.dart';
import '../chain/dryad_chain_providers.dart';
import '../dryad_providers.dart';
import '../models/dryad_models.dart';

class DryadGrovePage extends ConsumerWidget {
  const DryadGrovePage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final treesAsync = ref.watch(ownedTreesProvider);
    final wallet = ref.watch(walletAddressProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(ownedTreesProvider);
        ref.invalidate(plantingTreesProvider);
        ref.invalidate(marketplaceTreesProvider);
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          const PremiumHeader(
            title: 'My Trees',
            subtitle: 'Owned, planted, portable, and listed Dryad trees from your live wallet state.',
            badge: AppPill(label: 'Ownership', icon: Icons.forest_outlined),
          ),
          const SizedBox(height: 12),
          treesAsync.when(
            data: (trees) {
              if (wallet == null || wallet.trim().isEmpty) {
                return const AppCard(child: Text('Connect your wallet to load your real owned trees.'));
              }
              if (trees.isEmpty) return const AppCard(child: Text('No owned trees yet. Claim and plant from the Planting tab.'));
              return Column(
                children: trees
                    .map((tree) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: AppCard(
                            child: ListTile(
                              title: Text(tree.name),
                              subtitle: Text('${tree.placeName} • ${tree.lifecycleLabel}${tree.isPortable ? ' • Portable' : ''}${tree.isListed ? ' • Listed' : ''}'),
                              trailing: TextButton(onPressed: () => onOpenTree(tree.id), child: const Text('Open')),
                            ),
                          ),
                        ))
                    .toList(growable: false),
              );
            },
            error: (error, _) => AppCard(child: Text('Could not load inventory: $error')),
            loading: () => const AppCard(child: LinearProgressIndicator()),
          ),
        ],
      ),
    );
  }
}
