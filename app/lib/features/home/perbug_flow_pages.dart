import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/theme/rpg_bar.dart';
import '../../app/theme/widgets.dart';
import 'perbug_economy_models.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';

class PerbugNodeDetailsPage extends ConsumerWidget {
  const PerbugNodeDetailsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    final node = state.currentNode;
    final controller = ref.read(perbugGameControllerProvider.notifier);

    return _PerbugScaffold(
      title: 'Node Details',
      body: node == null
          ? const Text('No node selected. Return to live map and move to a node first.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(node.label, style: Theme.of(context).textTheme.headlineSmall),
                Text('${node.neighborhood}, ${node.city}'),
                const SizedBox(height: 12),
                Text('Node type: ${node.nodeType.name}'),
                Text('State: ${node.state.name}'),
                const SizedBox(height: 12),
                RpgBarButton(
                  onPressed: () {
                    controller.launchEncounter();
                    context.go(AppRoutes.encounter);
                  },
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: 'Enter Encounter',
                ),
              ],
            ),
    );
  }
}

class PerbugEncounterPage extends ConsumerWidget {
  const PerbugEncounterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);
    final encounter = state.activeEncounter;
    return _PerbugScaffold(
      title: 'Encounter',
      body: encounter == null
          ? const Text('No active encounter. Open Node Details and launch one first.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Type: ${encounter.type.name} • ${encounter.difficultyTier}'),
                Text('Status: ${encounter.status.name}'),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    RpgBarButton(
                      onPressed: () {
                        controller.resolveEncounter(succeeded: true);
                        context.go(AppRoutes.progression);
                      },
                      label: 'Claim Reward',
                    ),
                    RpgBarButton(
                      onPressed: () {
                        controller.resolveEncounter(succeeded: false);
                        context.go(AppRoutes.liveMap);
                      },
                      label: 'Retreat',
                      variant: RpgButtonVariant.secondary,
                    ),
                  ],
                ),
              ],
            ),
    );
  }
}

class PerbugSquadPage extends ConsumerWidget {
  const PerbugSquadPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    return _PerbugScaffold(
      title: 'Squad / Roster',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: state.squad.roster
            .map((unit) => ListTile(title: Text(unit.name), subtitle: Text('${unit.role.name} • L${unit.progression.level}')))
            .toList(growable: false),
      ),
    );
  }
}

class PerbugInventoryPage extends ConsumerWidget {
  const PerbugInventoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    return _PerbugScaffold(
      title: 'Inventory',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...state.economy.inventory.stacks.entries.map((entry) => ListTile(title: Text(entry.key), trailing: Text('${entry.value}'))),
          const SizedBox(height: 8),
          RpgBarButton(
            onPressed: () => context.go(AppRoutes.crafting),
            label: 'Craft now',
            variant: RpgButtonVariant.secondary,
          ),
        ],
      ),
    );
  }
}

class PerbugCraftingPage extends ConsumerWidget {
  const PerbugCraftingPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);

    return _PerbugScaffold(
      title: 'Crafting',
      body: Column(
        children: perbugCraftingRecipes
            .map(
              (recipe) => ListTile(
                title: Text(recipe.label),
                subtitle: Text('Cost ${recipe.perbugCost}Ⓟ + ${recipe.energyCost}⚡'),
                trailing: RpgBarButton(
                  height: 42,
                  onPressed: state.progression.level >= recipe.unlockLevel ? () => controller.craftRecipe(recipe.id) : null,
                  label: 'Craft',
                ),
              ),
            )
            .toList(growable: false),
      ),
    );
  }
}

class PerbugMarketplacePage extends ConsumerWidget {
  const PerbugMarketplacePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    return _PerbugScaffold(
      title: 'Marketplace',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Perbug Balance: ${state.economy.wallet.balance}'),
          const SizedBox(height: 8),
          ...state.economy.wallet.transactions.take(8).map(
                (tx) => ListTile(
                  title: Text('${tx.type.name} ${tx.amount}Ⓟ'),
                  subtitle: Text(tx.actionId ?? tx.id),
                ),
              ),
        ],
      ),
    );
  }
}

class PerbugProgressionPage extends ConsumerWidget {
  const PerbugProgressionPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    return _PerbugScaffold(
      title: 'Objectives / Progression',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Commander Level ${state.progression.level} • XP ${state.progression.xp}'),
          const SizedBox(height: 8),
          ...state.progressionLayer.daily.objectives.map((o) => ListTile(title: Text(o.title), subtitle: Text('${o.progress.current}/${o.progress.target}'))),
        ],
      ),
    );
  }
}

class PerbugWalletPage extends ConsumerWidget {
  const PerbugWalletPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connected = ref.watch(perbugGameControllerProvider).economy.walletLink.isConnected;
    return _PerbugScaffold(
      title: 'Wallet / Login',
      body: Text(connected ? 'Wallet connected and sync-ready.' : 'Wallet optional and currently disconnected.'),
    );
  }
}

class _PerbugScaffold extends StatelessWidget {
  const _PerbugScaffold({required this.title, required this.body});

  final String title;
  final Widget body;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go(AppRoutes.liveMap),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          body,
        ],
      ),
    );
  }
}
