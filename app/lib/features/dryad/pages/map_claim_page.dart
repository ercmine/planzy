import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';
import '../data/dryad_seed_data.dart';

class DryadMapClaimPage extends StatelessWidget {
  const DryadMapClaimPage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'Claim Map',
          subtitle: 'Map-first discovery for planted trees and nearby unclaimed spots.',
          badge: AppPill(label: 'Map + Claim', icon: Icons.map_outlined),
        ),
        const SizedBox(height: 12),
        AppCard(
          tone: AppCardTone.featured,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Plant eligibility'),
              SizedBox(height: 8),
              Text('Planting unlocks only when GPS verification confirms you are within range of an unclaimed place.'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        ...DryadSeedData.unclaimedSpots.map(
          (spot) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(spot.placeName, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text('${spot.locationLabel} • ${spot.eligibilityHint}'),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.spa_outlined),
                      label: const Text('Plant'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        ...DryadSeedData.trees.map(
          (tree) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              child: ListTile(
                title: Text(tree.name),
                subtitle: Text('${tree.placeName} • Founder ${tree.founderHandle}'),
                trailing: TextButton(onPressed: () => onOpenTree(tree.id), child: const Text('View tree')),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
