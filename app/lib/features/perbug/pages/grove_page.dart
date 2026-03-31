import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../app/theme/widgets.dart';
import '../chain/perbug_chain_providers.dart';
import '../perbug_providers.dart';
import '../models/perbug_models.dart';

class PerbugGrovePage extends ConsumerWidget {
  const PerbugGrovePage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final treesAsync = ref.watch(ownedTreesProvider);
    final wallet = ref.watch(walletAddressProvider);
    final snapshotAsync = ref.watch(groveNftSnapshotProvider);

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
            subtitle: 'Owned, planted, portable, and listed Perbug trees from your live wallet state.',
            badge: AppPill(label: 'Ownership', icon: Icons.forest_outlined),
          ),
          const SizedBox(height: 12),
          treesAsync.when(
            data: (trees) {
              if (wallet == null || wallet.trim().isEmpty) {
                return const AppCard(child: Text('Connect your wallet to load your real owned trees.'));
              }
              if (trees.isEmpty) {
                return snapshotAsync.when(
                  data: (snapshot) {
                    if (snapshot == null || snapshot.tokens.isEmpty) {
                      return const AppCard(child: Text('No owned trees yet. Claim and plant from the Planting tab.'));
                    }
                    return AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Detected ${snapshot.tokens.length} on-chain tree NFT(s) for this wallet.'),
                          const SizedBox(height: 8),
                          const Text('These trees are not yet synced into the Perbug trees API inventory.'),
                          const SizedBox(height: 12),
                          ...snapshot.tokens.map(
                            (token) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (token.artwork?.svgMarkup case final svg?)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 8),
                                      child: SizedBox(
                                        width: 80,
                                        height: 80,
                                        child: SvgPicture.string(svg),
                                      ),
                                    ),
                                  Expanded(child: Text('Token #${token.tokenId}')),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                  error: (_, __) => const AppCard(child: Text('No owned trees yet. Claim and plant from the Planting tab.')),
                  loading: () => const AppCard(child: LinearProgressIndicator()),
                );
              }
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
