import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/widgets.dart';
import '../chain/dryad_chain_providers.dart';
import '../dryad_providers.dart';
import '../models/dryad_models.dart';

class DryadMarketPage extends ConsumerWidget {
  const DryadMarketPage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listings = ref.watch(marketplaceTreesProvider);
    final wallet = ref.watch(walletAddressProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'Marketplace',
          subtitle: 'Global listings for live Dryad trees. Buy from anywhere and jump back to local planting context.',
          badge: AppPill(label: 'Global Listings', icon: Icons.public),
        ),
        const SizedBox(height: 12),
        listings.when(
          data: (trees) {
            if (trees.isEmpty) return const AppCard(child: Text('No active listings yet.'));
            return Column(children: trees.map((tree) => _TreeListingCard(tree: tree, wallet: wallet, onOpenTree: onOpenTree)).toList(growable: false));
          },
          error: (error, _) => AppCard(child: Text('Marketplace unavailable: $error')),
          loading: () => const AppCard(child: LinearProgressIndicator()),
        ),
      ],
    );
  }
}

class _TreeListingCard extends ConsumerWidget {
  const _TreeListingCard({required this.tree, required this.wallet, required this.onOpenTree});

  final DryadTree tree;
  final String? wallet;
  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> buy() async {
      if (wallet == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connect wallet to buy listed trees.')));
        return;
      }
      final repo = await ref.read(dryadRepositoryProvider.future);
      await repo.buyTree(tree.id, buyerWallet: wallet!);
      ref.invalidate(marketplaceTreesProvider);
      ref.invalidate(plantingTreesProvider);
      ref.invalidate(treeDetailProvider(tree.id));
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(aspectRatio: 16 / 9, child: _TreeImage(tree: tree)),
            ),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(tree.name),
              subtitle: Text('${tree.placeName} • ${tree.locationLabel}'),
              trailing: Text('${tree.priceEth?.toStringAsFixed(2)} ETH'),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                AppPill(label: 'Seller ${tree.ownerHandle}', icon: Icons.sell_outlined),
                AppPill(label: tree.lifecycleLabel, icon: Icons.forest_outlined),
                AppPill(label: tree.rarity, icon: Icons.auto_awesome),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                TextButton(onPressed: () => onOpenTree(tree.id), child: const Text('Open tree')),
                const Spacer(),
                FilledButton.icon(onPressed: buy, icon: const Icon(Icons.shopping_cart_checkout), label: const Text('Buy from anywhere')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


class _TreeImage extends StatelessWidget {
  const _TreeImage({required this.tree});

  final DryadTree tree;

  @override
  Widget build(BuildContext context) {
    final image = tree.treeImageUrl;
    if (image == null || image.isEmpty) return Container(color: Colors.green.shade50, child: const Icon(Icons.park, size: 56));
    final url = image.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/${image.replaceFirst('ipfs://', '')}' : image;
    return Image.network(url, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: Colors.green.shade50, child: const Icon(Icons.park, size: 56)));
  }
}
