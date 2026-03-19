import 'package:flutter/material.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import 'collection_models.dart';

class CollectionsPage extends StatelessWidget {
  final List<CollectionCardModel> collections;

  const CollectionsPage({super.key, required this.collections});

  @override
  Widget build(BuildContext context) {
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
      itemCount: collections.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.m),
      itemBuilder: (context, index) {
        final collection = collections[index];
        return AppCard(
          glow: collection.progress >= 1,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const AppPill(label: 'Collection', icon: Icons.auto_awesome_rounded),
                  const Spacer(),
                  AppPill(label: collection.status.replaceAll('_', ' '), icon: Icons.bolt_rounded),
                ],
              ),
              const SizedBox(height: AppSpacing.s),
              Text(collection.title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: AppSpacing.xs),
              Text('${collection.completedItems}/${collection.totalItems} collected • ${collection.type}'),
              const SizedBox(height: AppSpacing.m),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(value: collection.progress, minHeight: 10),
              ),
            ],
          ),
        );
      },
    );
  }
}
