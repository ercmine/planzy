import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_routes.dart';
import '../../app/theme/rpg_bar.dart';
import '../../app/theme/widgets.dart';
import 'location_claim_controller.dart';
import 'location_claim_models.dart';
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

    return _PerbugGameShell(
      title: 'Node Intel',
      subtitle: 'Map-native mission dossier',
      body: node == null
          ? const _EmptyInfo(message: 'No node selected. Open the map and pick a destination first.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StatStrip(items: [
                  _StatItem('Type', node.nodeType.name.toUpperCase()),
                  _StatItem('Difficulty', 'T${node.difficulty}'),
                  _StatItem('Travel', '${node.movementCost}⚡'),
                ]),
                const SizedBox(height: 12),
                _LorePanel(
                  title: node.label,
                  subtitle: '${node.neighborhood}, ${node.city}',
                  body: 'District signal confirms ${node.nodeType.name} activity. Deploy to resolve and recover node rewards.',
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    RpgBarButton(
                      onPressed: () {
                        controller.launchEncounter();
                        context.go(AppRoutes.encounter);
                      },
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: 'Enter Encounter',
                    ),
                    RpgBarButton(
                      onPressed: () => context.go(AppRoutes.liveMap),
                      icon: const Icon(Icons.map_outlined),
                      label: 'Back to World',
                      variant: RpgButtonVariant.secondary,
                    ),
                  ],
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
    return _PerbugGameShell(
      title: 'Encounter Relay',
      subtitle: 'Resolve tactical outcomes',
      body: encounter == null
          ? const _EmptyInfo(message: 'No active encounter. Launch one from Node Intel.')
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _StatStrip(items: [
                  _StatItem('Type', encounter.type.name),
                  _StatItem('Tier', encounter.difficultyTier),
                  _StatItem('Status', encounter.status.name),
                ]),
                const SizedBox(height: 12),
                _LorePanel(
                  title: 'Combat Feed',
                  subtitle: 'Live tactical packet',
                  body: 'Resolve the operation to claim XP, Perbug currency, and progression boosts.',
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
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
    final state = ref.watch(locationClaimControllerProvider);
    return _PerbugGameShell(
      title: 'Perbug Wallet',
      subtitle: 'Your live claim balance',
      body: Column(
        children: [
          _StatStrip(items: [
            _StatItem('Balance', '${state.balance} Ⓟ'),
            _StatItem('Year', '${state.pool.year}'),
            _StatItem('Claimed', '${state.pool.claimed}'),
          ]),
          const SizedBox(height: 12),
          _LorePanel(
            title: 'Emission pool',
            subtitle: 'Community distribution cap',
            body: 'Starting ${state.pool.startingPool} • Available ${state.pool.available} • Rollover ${state.pool.rollover}',
          ),
        ],
      ),
    );
  }
}

class PerbugInventoryPage extends ConsumerWidget {
  const PerbugInventoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(locationClaimControllerProvider);
    return _PerbugGameShell(
      title: 'Claim History',
      subtitle: 'Visited and claimed locations',
      body: Column(
        children: [
          _StatStrip(items: [
            _StatItem('Visited', '${state.claimables.where((e) => e.flowState == ClaimFlowState.visited || e.flowState == ClaimFlowState.claimSuccess).length}'),
            _StatItem('Claimed', '${state.claimables.where((e) => e.flowState == ClaimFlowState.claimSuccess).length}'),
            _StatItem('Balance', '${state.balance}Ⓟ'),
          ]),
          const SizedBox(height: 12),
          for (final entry in state.claimables)
            _LorePanel(
              title: entry.location.displayName,
              subtitle: '${entry.location.category} • ${(entry.distanceMeters).round()}m',
              body: 'Status ${entry.flowState.name}',
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

    return _PerbugGameShell(
      title: 'Forge & Crafting',
      subtitle: 'Convert resources into power',
      body: Column(
        children: [
          for (final recipe in perbugCraftingRecipes)
            _LorePanel(
              title: recipe.label,
              subtitle: 'Unlock L${recipe.unlockLevel}',
              body: 'Cost ${recipe.perbugCost}Ⓟ + ${recipe.energyCost}⚡',
              trailing: RpgBarButton(
                height: 42,
                onPressed: state.progression.level >= recipe.unlockLevel ? () => controller.craftRecipe(recipe.id) : null,
                label: 'Craft',
              ),
            ),
        ],
      ),
    );
  }
}

class PerbugMarketplacePage extends ConsumerWidget {
  const PerbugMarketplacePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(perbugGameControllerProvider);
    return _PerbugGameShell(
      title: 'Marketplace Ledger',
      subtitle: 'Economy and transaction history',
      body: Column(
        children: [
          _StatStrip(items: [
            _StatItem('Balance', '${state.economy.wallet.balance}Ⓟ'),
            _StatItem('Wallet', state.economy.walletLink.isConnected ? 'Connected' : 'Not linked'),
            _StatItem('Tx', '${state.economy.wallet.transactions.length}'),
          ]),
          const SizedBox(height: 12),
          for (final tx in state.economy.wallet.transactions.take(10))
            _LorePanel(
              title: tx.type.name,
              subtitle: tx.actionId ?? tx.id,
              body: '${tx.amount >= 0 ? '+' : ''}${tx.amount}Ⓟ • ${tx.createdAt.toIso8601String().replaceFirst('T', ' ').substring(0, 16)}',
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
    final state = ref.watch(locationClaimControllerProvider);
    return _PerbugGameShell(
      title: 'Global Emission Pool',
      subtitle: '10,000,000 yearly + rollover',
      body: Column(
        children: [
          _StatStrip(items: [
            _StatItem('Year', '${state.pool.year}'),
            _StatItem('Starting', '${state.pool.startingPool}'),
            _StatItem('Available', '${state.pool.available}'),
          ]),
          const SizedBox(height: 12),
          _LorePanel(
            title: 'Emission accounting',
            subtitle: 'Deterministic yearly pool',
            body: 'Base allocation 10,000,000 + rollover ${state.pool.rollover}. Claimed ${state.pool.claimed}. Remaining ${state.pool.available}.',
          ),
        ],
      ),
    );
  }
}

class PerbugWalletPage extends ConsumerWidget {
  const PerbugWalletPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final economy = ref.watch(perbugGameControllerProvider).economy;
    final connected = economy.walletLink.isConnected;
    return _PerbugGameShell(
      title: 'Identity / Wallet',
      subtitle: 'Account linkage state',
      body: Column(
        children: [
          _LorePanel(
            title: connected ? 'Wallet linked' : 'Wallet disconnected',
            subtitle: connected ? (economy.walletLink.walletAddress ?? 'address pending') : 'Demo-compatible mode',
            body: connected
                ? 'Identity is connected. Asset-backed systems can sync with live progression.'
                : 'You can continue in demo mode and connect later from entry or profile.',
          ),
          const SizedBox(height: 8),
          RpgBarButton(
            onPressed: () => context.go(AppRoutes.liveMap),
            label: 'Return to World Map',
            variant: RpgButtonVariant.secondary,
          ),
        ],
      ),
    );
  }
}

class _PerbugGameShell extends StatelessWidget {
  const _PerbugGameShell({required this.title, required this.subtitle, required this.body});

  final String title;
  final String subtitle;
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
          PremiumHeader(
            title: title,
            subtitle: subtitle,
            badge: const AppPill(label: 'Perbug RPG Ops', icon: Icons.auto_awesome),
          ),
          const SizedBox(height: 12),
          body,
        ],
      ),
    );
  }
}

class _LorePanel extends StatelessWidget {
  const _LorePanel({
    required this.title,
    required this.subtitle,
    required this.body,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final String body;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10),
      tone: AppCardTone.muted,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70)),
          const SizedBox(height: 6),
          Text(body),
          if (trailing != null) ...[
            const SizedBox(height: 10),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class _EmptyInfo extends StatelessWidget {
  const _EmptyInfo({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      tone: AppCardTone.collection,
      child: Text(message, style: Theme.of(context).textTheme.bodyLarge),
    );
  }
}

class _StatStrip extends StatelessWidget {
  const _StatStrip({required this.items});

  final List<_StatItem> items;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final item in items)
          Expanded(
            child: AppCard(
              margin: const EdgeInsets.only(right: 8),
              tone: AppCardTone.kpi,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.label, style: Theme.of(context).textTheme.labelMedium?.copyWith(color: Colors.white70)),
                  const SizedBox(height: 4),
                  Text(item.value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _StatItem {
  const _StatItem(this.label, this.value);

  final String label;
  final String value;
}
