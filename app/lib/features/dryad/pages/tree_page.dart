import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';
import '../data/dryad_seed_data.dart';

class DryadTreePage extends StatelessWidget {
  const DryadTreePage({super.key, required this.treeId});

  final String treeId;

  @override
  Widget build(BuildContext context) {
    final tree = DryadSeedData.trees.firstWhere(
      (item) => item.id == treeId,
      orElse: () => DryadSeedData.trees.first,
    );

    return AppScaffold(
      appBar: AppBar(title: Text(tree.name)),
      child: ListView(
        children: [
          AppCard(
            tone: AppCardTone.featured,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tree.placeName, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                Text(tree.locationLabel),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    AppPill(label: 'Founder ${tree.founderHandle}', icon: Icons.workspace_premium_outlined),
                    AppPill(label: 'Owner ${tree.ownerHandle}', icon: Icons.person_outline),
                    AppPill(label: 'Growth ${tree.growthLevel}', icon: Icons.grass_outlined),
                    AppPill(label: '${tree.contributionCount} contributions', icon: Icons.favorite_outline),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Marketplace', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(tree.isListed ? 'Listed for ${tree.priceEth} ETH / ${tree.priceDryad} DRYAD' : 'Not currently listed.'),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.shopping_cart_checkout), label: const Text('Buy')),
                    OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.sell_outlined), label: const Text('List tree')),
                    OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.eco_outlined), label: const Text('Contribute')),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Provenance history'),
                SizedBox(height: 8),
                Text('Founder provenance persists even after ownership transfers and marketplace sales.'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
