import 'package:flutter/material.dart';

import '../../../app/theme/widgets.dart';
import '../data/dryad_seed_data.dart';
import '../models/dryad_models.dart';

class DryadGrovePage extends StatelessWidget {
  const DryadGrovePage({super.key, required this.onOpenTree});

  final ValueChanged<String> onOpenTree;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const PremiumHeader(
          title: 'My Grove',
          subtitle: 'Portfolio of founded, owned, and contributed Dryad trees with progression milestones.',
          badge: AppPill(label: 'Grove', icon: Icons.forest_outlined),
        ),
        const SizedBox(height: 14),
        _section(context, 'Trees I founded', DryadSeedData.trees.where((tree) => tree.founderHandle == '@jon.seed').toList()),
        _section(context, 'Trees I own', DryadSeedData.trees.where((tree) => tree.ownerHandle == '@jon.seed').toList()),
        _section(context, 'Trees I contributed to', DryadSeedData.trees),
      ],
    );
  }

  Widget _section(BuildContext context, String title, List<DryadTree> trees) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (trees.isEmpty)
          const AppCard(child: Text('No trees yet.'))
        else
          ...trees.map<Widget>(
            (tree) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                child: ListTile(
                  title: Text(tree.name),
                  subtitle: Text('Growth ${tree.growthLevel} • ${tree.contributionCount} contributions'),
                  trailing: TextButton(onPressed: () => onOpenTree(tree.id), child: const Text('Open')),
                ),
              ),
            ),
          ),
        const SizedBox(height: 12),
      ],
    );
  }
}
