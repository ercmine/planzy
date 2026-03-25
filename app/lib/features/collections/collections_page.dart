import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'collection_models.dart';

class CollectionsPage extends StatelessWidget {
  final List<CollectionCardModel> collections;

  const CollectionsPage({super.key, required this.collections});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (collections.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.l),
          child: BrandHeroCard(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.collections_bookmark_outlined, size: 40),
                const SizedBox(height: AppSpacing.s),
                Text('No collections yet', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Saved places, quests, and progress stacks will appear here once you start exploring.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.m),
      itemCount: collections.length + 1,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.m),
      itemBuilder: (context, index) {
        if (index == 0) {
          return const PremiumHeader(
            title: 'Collections',
            subtitle: 'Track collectible streaks, complete sets, and unlock richer rewards.',
            badge: AppPill(label: 'Collector mode', icon: Icons.workspace_premium_rounded),
          );
        }
        final collection = collections[index - 1];
        final rewardUnlocked = collection.progress >= 1;
        return AppCard(
          glow: rewardUnlocked,
          tone: rewardUnlocked ? AppCardTone.reward : AppCardTone.collection,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const AppPill(label: 'Collection', icon: Icons.auto_awesome_rounded),
                  const Spacer(),
                  AppPill(
                    label: collection.status.replaceAll('_', ' '),
                    icon: rewardUnlocked ? Icons.workspace_premium_rounded : Icons.bolt_rounded,
                    backgroundColor: rewardUnlocked ? scheme.secondary.withOpacity(0.16) : null,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.s),
              Text(collection.title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.xs),
              Text('${collection.completedItems}/${collection.totalItems} collected • ${collection.type}'),
              const SizedBox(height: AppSpacing.m),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: collection.progress,
                  minHeight: 10,
                  valueColor: AlwaysStoppedAnimation<Color>(rewardUnlocked ? scheme.secondary : scheme.primary),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
