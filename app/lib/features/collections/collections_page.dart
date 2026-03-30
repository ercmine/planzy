import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/spacing.dart';
import '../../app/theme/widgets.dart';
import '../../app/app_routes.dart';
import '../home/perbug_asset_registry.dart';
import '../home/perbug_economy_models.dart';
import '../home/perbug_game_controller.dart';
import 'collection_models.dart';

class CollectionsPage extends ConsumerWidget {
  final List<CollectionCardModel> collections;

  const CollectionsPage({super.key, required this.collections});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final gameState = ref.watch(perbugGameControllerProvider);

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.m),
      children: [
        const PremiumHeader(
          title: 'Vault',
          subtitle: 'Manage your collectible roster, hero loadout, and crafting economy in one place.',
          badge: AppPill(label: 'Collector mode', icon: Icons.workspace_premium_rounded),
        ),
        const SizedBox(height: AppSpacing.m),
        AppCard(
          tone: AppCardTone.featured,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hero loadout', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Active power ${gameState.squad.equippedPower} • Slots ${gameState.squad.activeSquad.unitIdsBySlot.length}/${gameState.squad.maxSlots}',
              ),
              const SizedBox(height: AppSpacing.s),
              ...List.generate(gameState.squad.activeSquad.maxSlots, (slotIndex) {
                final assignedId = gameState.squad.activeSquad.unitIdsBySlot[slotIndex];
                final assigned = assignedId == null || gameState.squad.roster.isEmpty
                    ? null
                    : gameState.squad.roster.firstWhere(
                        (unit) => unit.id == assignedId,
                        orElse: () => gameState.squad.roster.first,
                      );
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(child: Text('${slotIndex + 1}')),
                  title: Text(assigned?.name ?? 'Unassigned hero'),
                  subtitle: Text(
                    assigned == null
                        ? 'Tap Squad to assign this slot.'
                        : '${PerbugAssetRegistry.roleVisual(assigned.role).label} • ${assigned.unitClass.name} • Lv ${assigned.progression.level}',
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.s),
              FilledButton.tonalIcon(
                onPressed: () => context.go(AppRoutes.squad),
                icon: const Icon(Icons.groups_2_outlined),
                label: const Text('Open full loadout editor'),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.m),
        AppCard(
          tone: AppCardTone.kpi,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Crafting mechanics', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: AppSpacing.xs),
              Text('Perbug balance: ${gameState.economy.wallet.balance} • Energy ${gameState.energy}/${gameState.maxEnergy}'),
              const SizedBox(height: AppSpacing.s),
              ...perbugCraftingRecipes.take(3).map((recipe) {
                final canCraft = gameState.progression.level >= recipe.unlockLevel &&
                    gameState.economy.wallet.balance >= recipe.perbugCost &&
                    gameState.energy >= recipe.energyCost &&
                    gameState.economy.inventory.canAfford(recipe.inputs.map((entry) => entry.toStack()).toList(growable: false));
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(canCraft ? Icons.handyman : Icons.lock_outline),
                  title: Text(recipe.label),
                  subtitle: Text(
                    '${recipe.category.name} • Cost ${recipe.perbugCost}Ⓟ + ${recipe.energyCost}⚡ • unlock L${recipe.unlockLevel}',
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.s),
              FilledButton.tonalIcon(
                onPressed: () => context.go(AppRoutes.crafting),
                icon: const Icon(Icons.precision_manufacturing),
                label: const Text('Open crafting station'),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.m),
        if (collections.isEmpty)
          AppCard(
            tone: AppCardTone.muted,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Collection sets', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                const Text('No collection cards yet. Explore the world map and clear encounters to fill your vault.'),
                const SizedBox(height: AppSpacing.s),
                FilledButton.tonal(
                  onPressed: () => context.go(AppRoutes.liveMap),
                  child: const Text('Start exploring'),
                ),
              ],
            ),
          )
        else
          ...collections.map((collection) {
            final rewardUnlocked = collection.progress >= 1;
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.m),
              child: AppCard(
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
              ),
            );
          }),
      ],
    );
  }
}
