import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';
import '../data/dryad_seed_data.dart';
import '../models/dryad_models.dart';

class DryadMarketPage extends StatelessWidget {
  const DryadMarketPage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context) {
    final trees = DryadSeedData.trees;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'Tree Marketplace',
          subtitle: 'Discover planted Dryad trees, active listings, and claimable spots near you.',
          badge: AppPill(label: 'Dryad Market', icon: Icons.park_rounded),
        ),
        const SizedBox(height: 16),
        _sectionHeader(context, 'Trees for sale'),
        ...trees.where((tree) => tree.isListed).map((tree) => _TreeCard(tree: tree, onOpen: () => onOpenTree(tree.id))),
        const SizedBox(height: 12),
        _sectionHeader(context, 'New trees'),
        ...trees.map((tree) => _TreeCard(tree: tree, onOpen: () => onOpenTree(tree.id))),
        const SizedBox(height: 12),
        _sectionHeader(context, 'Unclaimed spots nearby'),
        ...DryadSeedData.unclaimedSpots.map(
          (spot) => AppCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(child: Icon(Icons.location_searching_rounded)),
              title: Text(spot.placeName),
              subtitle: Text('${spot.locationLabel} • ${spot.distanceMeters}m'),
              trailing: const AppPill(label: 'Plant', icon: Icons.spa_outlined),
            ),
          ),
        ),
      ],
    );
  }

  Widget _sectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title, style: Theme.of(context).textTheme.titleLarge),
    );
  }
}

class _TreeCard extends StatelessWidget {
  const _TreeCard({required this.tree, required this.onOpen});

  final DryadTree tree;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(tree.name, style: Theme.of(context).textTheme.titleMedium)),
                AppPill(label: tree.rarity, icon: Icons.auto_awesome_rounded),
              ],
            ),
            const SizedBox(height: 6),
            Text('${tree.placeName} • ${tree.locationLabel}'),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                AppPill(label: 'Founder ${tree.founderHandle}', icon: Icons.workspace_premium_outlined),
                AppPill(label: 'Owner ${tree.ownerHandle}', icon: Icons.person_outline),
                AppPill(label: 'Growth ${tree.growthLevel}', icon: Icons.trending_up),
                AppPill(label: '${tree.contributionCount} contributions', icon: Icons.favorite_border),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (tree.isListed)
                  Text(
                    '${tree.priceEth?.toStringAsFixed(2)} ETH • ${tree.priceDryad?.toStringAsFixed(0)} DRYAD',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
                  )
                else
                  const Text('Not listed'),
                const Spacer(),
                TextButton(onPressed: onOpen, child: const Text('View')),
                if (tree.isListed) FilledButton(onPressed: onOpen, child: const Text('Buy')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
