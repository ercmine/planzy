import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/widgets.dart';
import '../chain/dryad_chain_providers.dart';
import '../dryad_providers.dart';
import '../models/dryad_models.dart';

class DryadTreePage extends ConsumerWidget {
  const DryadTreePage({super.key, required this.treeId});

  final String treeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final treeAsync = ref.watch(treeDetailProvider(treeId));
    final wallet = ref.watch(walletAddressProvider);

    return AppScaffold(
      appBar: AppBar(title: const Text('Tree detail')),
      body: treeAsync.when(
        data: (tree) {
          if (tree == null) return const Center(child: Text('Tree not found.'));
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: AspectRatio(aspectRatio: 16 / 9, child: _TreeImage(tree: tree)),
              ),
              const SizedBox(height: 10),
              AppCard(
                tone: AppCardTone.featured,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tree.name, style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 6),
                    Text('${tree.placeName} • ${tree.locationLabel}'),
                    const SizedBox(height: 6),
                    Wrap(spacing: 8, runSpacing: 8, children: [
                      AppPill(label: tree.statusLabel, icon: Icons.park_outlined),
                      AppPill(label: 'Owner ${tree.ownerHandle}', icon: Icons.person_outline),
                      if (tree.isListed) AppPill(label: '${tree.priceEth?.toStringAsFixed(2)} ETH', icon: Icons.sell_outlined),
                    ]),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              _Actions(tree: tree, wallet: wallet),
            ],
          );
        },
        error: (error, _) => Center(child: Text('Could not load tree: $error')),
        loading: () => const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

class _Actions extends ConsumerWidget {
  const _Actions({required this.tree, required this.wallet});

  final DryadTree tree;
  final String? wallet;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Future<void> claimAndPlant() async {
      if (wallet == null) return;
      final repo = await ref.read(dryadRepositoryProvider.future);
      await repo.claimAndPlant(tree.id, wallet: wallet!);
      ref.invalidate(treeDetailProvider(tree.id));
      ref.invalidate(plantingTreesProvider);
    }

    Future<void> buy() async {
      if (wallet == null) return;
      final repo = await ref.read(dryadRepositoryProvider.future);
      await repo.buyTree(tree.id, buyerWallet: wallet!);
      ref.invalidate(treeDetailProvider(tree.id));
      ref.invalidate(marketplaceTreesProvider);
    }

    Future<void> list() async {
      if (wallet == null) return;
      final repo = await ref.read(dryadRepositoryProvider.future);
      await repo.listTree(tree.id, wallet: wallet!, priceEth: tree.priceEth ?? 0.2);
      ref.invalidate(treeDetailProvider(tree.id));
      ref.invalidate(marketplaceTreesProvider);
    }

    Future<void> unlist() async {
      if (wallet == null) return;
      final repo = await ref.read(dryadRepositoryProvider.future);
      await repo.unlistTree(tree.id, wallet: wallet!);
      ref.invalidate(treeDetailProvider(tree.id));
      ref.invalidate(marketplaceTreesProvider);
    }

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Ownership & marketplace actions', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: wallet == null || tree.claimState == TreeClaimState.unavailable ? null : claimAndPlant,
                icon: const Icon(Icons.forest_outlined),
                label: const Text('CLAIM AND PLANT'),
              ),
              if (tree.isListed)
                FilledButton.icon(onPressed: wallet == null ? null : buy, icon: const Icon(Icons.shopping_cart_checkout), label: const Text('Buy')),
              if (!tree.isListed)
                OutlinedButton.icon(onPressed: wallet == null ? null : list, icon: const Icon(Icons.sell_outlined), label: const Text('List tree')),
              if (tree.isListed)
                OutlinedButton.icon(onPressed: wallet == null ? null : unlist, icon: const Icon(Icons.cancel_outlined), label: const Text('Unlist')),
            ],
          ),
        ],
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
