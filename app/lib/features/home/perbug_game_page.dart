import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/widgets.dart';
import '../onboarding/onboarding_controller.dart';
import '../onboarding/onboarding_state.dart';
import '../puzzles/grid_path_puzzle_sheet.dart';
import 'perbug_asset_registry.dart';
import 'perbug_economy_models.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';

class PerbugGamePage extends ConsumerStatefulWidget {
  const PerbugGamePage({super.key});

  @override
  ConsumerState<PerbugGamePage> createState() => _PerbugGamePageState();
}

class _PerbugGamePageState extends ConsumerState<PerbugGamePage> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() => ref.read(perbugGameControllerProvider.notifier).initialize());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(perbugGameControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);
    final onboarding = ref.watch(onboardingControllerProvider);
    final onboardingController = ref.read(onboardingControllerProvider.notifier);
    final moves = state.reachableMoves().take(8).toList(growable: false);

    return RefreshIndicator(
      onRefresh: controller.initialize,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          PremiumHeader(
            title: 'Perbug Tactical Atlas',
            subtitle: 'Traverse the fixed-zoom world board, deploy your squad, and expand from ${state.areaLabel ?? 'your anchor region'}.',
            badge: const AppPill(label: 'Map-native strategy RPG', icon: Icons.explore),
          ),
          const SizedBox(height: 12),
          if (!onboarding.hasCompleted && onboarding.step != OnboardingStep.identityIntro) ...[
            _OnboardingCoachCard(
              state: onboarding,
              onContinue: onboardingController.advanceStep,
              onSkip: onboardingController.skipOnboarding,
            ),
            const SizedBox(height: 12),
          ],
          AppCard(
            tone: AppCardTone.featured,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: _EnergyMeter(current: state.energy, max: state.maxEnergy)),
                    const SizedBox(width: 8),
                    SecondaryButton(label: '+Energy', onPressed: controller.claimPassiveEnergy),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Commander L${state.progression.level} • XP ${state.progression.xp} • Perbug ${state.economy.wallet.balance}'),
                Text('Arcane Marks ${state.progression.upgradeCurrency} • Squad power ${state.squad.equippedPower} • Active slots ${state.squad.maxSlots}'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final strategic in ['ore', 'scrap', 'circuit', 'relic_shard', 'field_kit', 'upgrade_module'])
                      AppPill(label: '${perbugResourceDefinitions[strategic]?.label ?? strategic}: ${state.economy.inventory.quantityOf(strategic)}'),
                    AppPill(label: 'Owned assets: ${state.economy.ownedAssets.entries.length}', icon: Icons.inventory_2_outlined),
                    AppPill(
                      label: state.economy.walletLink.isConnected ? 'Wallet linked' : 'Wallet optional',
                      icon: state.economy.walletLink.isConnected ? Icons.link : Icons.link_off,
                    ),
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
                Text('World board: fixed tactical zoom ${state.fixedZoom.toStringAsFixed(0)}', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                SizedBox(
                  height: 240,
                  child: CustomPaint(
                    painter: _BoardPainter(state: state),
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF101527),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text('Current node: ${state.currentNode?.label ?? '—'} • March range ${(state.maxJumpMeters / 1000).toStringAsFixed(1)}km'),
                if (state.currentNode != null)
                  Text(
                    '${state.currentNode!.neighborhood}, ${state.currentNode!.city}, ${state.currentNode!.region}, ${state.currentNode!.country}',
                  ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final nodeType in PerbugNodeType.values)
                      (() {
                        final visual = PerbugAssetRegistry.nodeVisual(nodeType);
                        return AppPill(
                          label: visual.label,
                          icon: visual.icon,
                          backgroundColor: visual.color.withOpacity(0.16),
                          foregroundColor: visual.color,
                        );
                      })(),
                  ],
                ),
              ],
            ),
          ),
          if (state.loading) const AppCard(child: LinearProgressIndicator()),
          if (state.error != null) AppCard(child: Text(state.error!)),

          _Section(
            title: 'Commander return loop',
            subtitle: 'War table objectives, rare windows, frontier, and next goals.',
            children: [
              Text('World tier ${state.progressionLayer.world.worldTier} • Regions unlocked ${state.progressionLayer.world.unlockedRegions.length}'),
              Text('Rare window resets in ${state.progressionLayer.rareSpawns.nextRollAt.difference(DateTime.now().toUtc()).inMinutes.clamp(0, 999)} min'),
              if (state.progressionLayer.returnLoop.recommendedActions.isEmpty)
                const Text('No recommended actions yet. Explore your first node chain.')
              else
                ...state.progressionLayer.returnLoop.recommendedActions.take(4).map((tip) => ListTile(contentPadding: EdgeInsets.zero, dense: true, leading: const Icon(Icons.chevron_right), title: Text(tip))),
            ],
          ),
          _Section(
            title: 'War table objectives',
            subtitle: 'Resets daily and drives return momentum.',
            children: [
              Text('Daily set ${state.progressionLayer.daily.dayKey} • refresh ${state.progressionLayer.daily.refreshAt.toLocal()}'),
              ...state.progressionLayer.daily.objectives.map(
                (objective) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(objective.title),
                  subtitle: Text('${objective.description}\n${objective.progress.current}/${objective.progress.target}'),
                  trailing: FilledButton.tonal(
                    onPressed: objective.progress.isComplete && !objective.progress.claimed
                        ? () => controller.claimDailyObjective(objective.id)
                        : null,
                    child: Text(objective.progress.claimed ? 'Claimed' : 'Claim'),
                  ),
                ),
              ),
            ],
          ),
          _Section(
            title: 'Collections // relic codex',
            subtitle: 'Track ownership, map mastery, and long-term unlock pacing.',
            children: [
              ...state.progressionLayer.collections.map(
                (collection) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(collection.label),
                  subtitle: LinearProgressIndicator(value: collection.percent.clamp(0, 1)),
                  trailing: Text('${collection.discovered}/${collection.total}'),
                ),
              ),
              const Divider(),
              ...state.progressionLayer.milestones.map(
                (milestone) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(milestone.title),
                  subtitle: Text('${milestone.current}/${milestone.target}'),
                  trailing: FilledButton(
                    onPressed: milestone.isComplete && !milestone.claimed ? () => controller.claimMilestoneReward(milestone.id) : null,
                    child: Text(milestone.claimed ? 'Claimed' : 'Claim'),
                  ),
                ),
              ),
            ],
          ),
          _Section(
            title: 'Frontier gates + unlock track',
            subtitle: 'Explicit unlock rules tied to world expansion and milestones.',
            children: [
              ...state.progressionLayer.unlockables.map(
                (unlock) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(unlock.unlocked ? Icons.lock_open : Icons.lock_outline),
                  title: Text(unlock.label),
                  subtitle: Text(unlock.unlocked ? unlock.description : 'Locked: ${unlock.requirement}'),
                ),
              ),
              const Divider(),
              ...state.progressionLayer.world.regionNodeTotals.entries.map((entry) {
                final cleared = state.progressionLayer.world.regionNodeCompleted[entry.key] ?? 0;
                final ratio = entry.value == 0 ? 0 : cleared / entry.value;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(entry.key),
                  subtitle: LinearProgressIndicator(value: ratio.clamp(0, 1)),
                  trailing: Text('$cleared/${entry.value}'),
                );
              }),
              if (state.progressionLayer.rareSpawns.activeNodeIds.isNotEmpty)
                Text('Active rare nodes: ${state.progressionLayer.rareSpawns.activeNodeIds.take(3).join(', ')}'),
            ],
          ),
          _Section(
            title: 'Squad loadout // active formation',
            subtitle: 'Manage active units used in node encounters. Roster is larger than active slots.',
            children: [
              ...List.generate(state.squad.activeSquad.maxSlots, (slotIndex) {
                final assignedId = state.squad.activeSquad.unitIdsBySlot[slotIndex];
                final assigned = assignedId == null
                    ? null
                    : state.squad.roster.firstWhere((u) => u.id == assignedId, orElse: () => state.squad.roster.first);
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Slot ${slotIndex + 1}'),
                        if (assigned != null)
                          Text('${assigned.name} • ${assigned.role.name}/${assigned.unitClass.name} • L${assigned.progression.level}')
                        else
                          const Text('Unassigned'),
                        Wrap(
                          spacing: 8,
                          children: [
                            for (final unit in state.squad.roster)
                              ChoiceChip(
                                label: Text(unit.name),
                                selected: assignedId == unit.id,
                                onSelected: (_) => controller.assignUnitToSlot(unitId: unit.id, slotIndex: slotIndex),
                              ),
                            TextButton(onPressed: () => controller.clearSquadSlot(slotIndex), child: const Text('Clear')),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
          _Section(
            title: 'Roster vault // collectible units',
            subtitle: 'Collectible unit identity with rarity, role, class, and progression.',
            children: [
              ...state.squad.roster
                  .map(
                    (unit) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(child: Icon(PerbugAssetRegistry.roleVisual(unit.role).icon, size: 18)),
                      title: Text('${unit.name} • ${PerbugAssetRegistry.roleVisual(unit.role).label}/${unit.unitClass.name}'),
                      subtitle: Text(
                        'Lv ${unit.progression.level} • ${unit.rarity.name} • ${unit.resolvedProvenance.source.name} • '
                        'Power ${unit.power} • ${PerbugAssetRegistry.roleVisual(unit.role).portraitRef.sheet}',
                      ),
                      trailing: unit.isChainBacked
                          ? const Icon(Icons.verified, color: Colors.amber)
                          : const Text('Core'),
                    ),
                  )
                  .toList(growable: false),
            ],
          ),
          _Section(
            title: 'Relics, ownership, and provenance',
            subtitle: 'Chain-backed assets are optional and coexist with normal progression assets.',
            children: [
              if (state.economy.ownedAssets.entries.isEmpty)
                const ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('No optional collectible assets yet'),
                  subtitle: Text('Core inventory, squad progression, and encounters remain fully playable without wallet linkage.'),
                ),
              ...state.economy.ownedAssets.entries.map(
                (asset) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(child: Text(asset.identity.assetClass.name.substring(0, 1).toUpperCase())),
                  title: Text('${asset.name} • ${asset.identity.assetClass.name}'),
                  subtitle: Text(
                    '${asset.provenance.source.name} • Qty ${asset.quantity} • ${asset.isNftBacked ? 'Chain-backed' : 'Game-native'}',
                  ),
                  trailing: asset.isNftBacked ? const Icon(Icons.token_outlined) : const Icon(Icons.videogame_asset_outlined),
                ),
              ),
              if (!state.economy.walletLink.isConnected)
                const AppCard(
                  tone: AppCardTone.muted,
                  child: Text('Wallet is not connected. NFT import/sync remains optional and does not block gameplay loops.'),
                ),
            ],
          ),
          _Section(
            title: 'Expedition phase 1: march + positioning',
            subtitle: 'No free teleporting. Reachability is based on real distance and energy.',
            children: moves
                .map(
                  (move) {
                    final visual = PerbugAssetRegistry.nodeVisual(move.node.nodeType);
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        visual.icon,
                        color: move.isReachable ? visual.color : Colors.blueGrey,
                      ),
                      title: Text('${move.node.label} • ${visual.label}'),
                      subtitle: Text(
                        '${move.node.region} • ${((move.node.distanceFromCurrentMeters ?? 0) / 1000).toStringAsFixed(2)}km • ${move.reason}\n'
                        'Icon ${visual.iconRef.id} • Tile ${visual.tileRef.id}',
                      ),
                      trailing: TextButton(
                        onPressed: move.isReachable
                            ? () async {
                                final ok = await controller.jumpTo(move);
                                if (!context.mounted || !ok) return;
                                await onboardingController.recordFirstMove();
                                if (onboarding.step == OnboardingStep.firstMove) {
                                  await onboardingController.advanceTo(OnboardingStep.firstEncounter);
                                }
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Moved to ${move.node.label}')));
                              }
                            : null,
                        child: Text('Move (${move.energyCost}⚡ + ${move.totalPerbugCost}Ⓟ)'),
                      ),
                    );
                  },
                )
                .toList(growable: false),
          ),
          _Section(
            title: 'Expedition phase 2: encounter + payoff',
            subtitle: 'Encounters are scaffolded for puzzle, tactical, timed, harvest, and boss modules.',
            children: [
              if (state.activeEncounter != null)
                Text('Active encounter: ${state.activeEncounter!.type.name} • ${state.activeEncounter!.difficultyTier}'),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.tonalIcon(
                    onPressed: state.activeEncounter == null ? null : controller.rerollCurrentEncounter,
                    icon: const Icon(Icons.casino_outlined),
                    label: Text('Reroll (${state.economy.config.actionCosts[PerbugActionType.reroll]?.baseCost ?? 0}Ⓟ)'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: state.currentNode == null ? null : controller.scoutCurrentNode,
                    icon: const Icon(Icons.travel_explore),
                    label: Text('Scout (${state.economy.config.actionCosts[PerbugActionType.scouting]?.baseCost ?? 0}Ⓟ)'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: state.currentNode == null ? null : controller.enterEventNode,
                    icon: const Icon(Icons.event_available),
                    label: Text('Event entry (${state.economy.config.actionCosts[PerbugActionType.eventEntry]?.baseCost ?? 0}Ⓟ)'),
                  ),
                  FilledButton.icon(
                    onPressed: state.currentNode == null
                        ? null
                        : () async {
                            controller.launchEncounter();
                            controller.resolveEncounter(succeeded: true);
                            await onboardingController.recordFirstReward();
                            if (onboarding.step == OnboardingStep.firstEncounter) {
                              await onboardingController.advanceTo(OnboardingStep.firstReward);
                            }
                          },
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Resolve success'),
                  ),
                  OutlinedButton.icon(
                    onPressed: state.currentNode == null
                        ? null
                        : () {
                            controller.launchEncounter();
                            controller.resolveEncounter(succeeded: false);
                          },
                    icon: const Icon(Icons.replay_circle_filled_outlined),
                    label: const Text('Resolve fail'),
                  ),
                  FilledButton.icon(
                    onPressed: state.currentNode == null
                        ? null
                        : () {
                            controller.launchPuzzleForCurrentNode();
                            _openPuzzleSheet(context);
                          },
                    icon: const Icon(Icons.grid_4x4_rounded),
                    label: const Text('Puzzle encounter'),
                  ),
                ],
              ),
            ],
          ),
          _Section(
            title: 'Expedition phase 3: progression + upgrades',
            subtitle: 'Rewards feed progression, inventory, and unit upgrades.',
            children: [
              Text('Inventory: ${state.progression.inventory.entries.map((e) => '${e.key}:${e.value}').join(' • ')}'),
              Text('Economy Inventory: ${state.economy.inventory.stacks.entries.map((e) => '${e.key}:${e.value}').join(' • ')}'),
              Text('Encounter ready: ${state.squad.isEncounterReady ? 'yes' : 'no'} • Role coverage ${state.squad.summarizePower().roleCoverage.entries.map((e) => '${e.key.name}:${e.value}').join(', ')}'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: controller.upgradePrimaryUnit,
                    icon: const Icon(Icons.upgrade),
                    label: const Text('Unlock next primary upgrade'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: controller.unlockPremiumMissionTrack,
                    icon: const Icon(Icons.workspace_premium_outlined),
                    label: Text('Premium track (${state.economy.config.actionCosts[PerbugActionType.premiumProgression]?.baseCost ?? 0}Ⓟ)'),
                  ),
                ],
              ),
            ],
          ),
          _Section(
            title: 'Expedition phase 4: crafting + economy',
            subtitle: 'Crafting consumes resources + Perbug and outputs progression items or consumables.',
            children: [
              ...perbugCraftingRecipes.map(
                (recipe) {
                  final hasUnlock = state.progression.level >= recipe.unlockLevel;
                  final canAffordIngredients = state.economy.inventory.canAfford(recipe.inputs.map((e) => e.toStack()).toList(growable: false));
                  final canAfford = hasUnlock && canAffordIngredients && state.economy.wallet.balance >= recipe.perbugCost && state.energy >= recipe.energyCost;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${recipe.label} (${recipe.category.name})'),
                    subtitle: Text(
                      'Inputs: ${recipe.inputs.map((i) => '${i.resourceId}x${i.amount}').join(', ')} • '
                      'Perbug ${recipe.perbugCost} • Energy ${recipe.energyCost} • '
                      '${hasUnlock ? 'Unlocked' : 'Unlocks at L${recipe.unlockLevel}'}',
                    ),
                    trailing: FilledButton(
                      onPressed: canAfford ? () => controller.craftRecipe(recipe.id) : null,
                      child: const Text('Craft'),
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton.tonalIcon(
                    onPressed: state.economy.inventory.quantityOf('field_kit') > 0 ? () => controller.useCraftedItem('field_kit') : null,
                    icon: const Icon(Icons.battery_charging_full),
                    label: const Text('Use Field Kit'),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: state.economy.inventory.quantityOf('upgrade_module') > 0
                        ? () => controller.useCraftedItem('upgrade_module')
                        : null,
                    icon: const Icon(Icons.precision_manufacturing),
                    label: const Text('Apply Upgrade Module'),
                  ),
                ],
              ),
            ],
          ),
          _Section(
            title: 'Economy ledger // marketplace-ready',
            subtitle: 'Rewards, sinks, and provenance accounting built for resource economy and trading surfaces.',
            children: state.economy.wallet.transactions.take(10).map((tx) {
              final direction = tx.type == PerbugTransactionType.reward ? '+' : '-';
              final reason = tx.source?.name ?? tx.sink?.name ?? 'system';
              return ListTile(
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text('$direction${tx.amount} Ⓟ • $reason'),
                subtitle: Text(tx.actionId ?? tx.id),
                trailing: Text('Bal ${tx.balanceAfter}'),
              );
            }).toList(growable: false),
          ),
        ],
      ),
    );
  }

  Future<void> _openPuzzleSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) {
        return Consumer(
          builder: (context, ref, _) {
            final session = ref.watch(perbugGameControllerProvider).puzzleSession;
            final controller = ref.read(perbugGameControllerProvider.notifier);
            if (session == null) return const SizedBox.shrink();
            return FractionallySizedBox(
              heightFactor: 0.95,
              child: GridPathPuzzleSheet(
                session: session,
                onStart: controller.startActivePuzzle,
                onTapCell: controller.tapPuzzleCell,
                onUndo: controller.undoPuzzleMove,
                onReset: controller.resetPuzzleSession,
                onAbandon: controller.abandonPuzzleSession,
                onClose: () {
                  controller.clearPuzzleSession();
                  Navigator.of(context).pop();
                },
              ),
            );
          },
        );
      },
    );
  }
}

class _OnboardingCoachCard extends StatelessWidget {
  const _OnboardingCoachCard({
    required this.state,
    required this.onContinue,
    required this.onSkip,
  });

  final OnboardingState state;
  final Future<void> Function() onContinue;
  final Future<void> Function() onSkip;

  @override
  Widget build(BuildContext context) {
    final message = switch (state.step) {
      OnboardingStep.mapNodes => 'These are real nearby places turned into nodes. Blue links are reachable jumps from your current position.',
      OnboardingStep.squadIntro => 'Starter squad is live now: Scout, Engineer, and Tank are active. Squad roles drive encounter outcomes.',
      OnboardingStep.firstMove => 'Tap a reachable node and press Move. Actions spend Energy + Perbug and push your frontier outward.',
      OnboardingStep.firstEncounter => 'You arrived. Resolve this node encounter to complete the first loop: move → resolve → reward.',
      OnboardingStep.firstReward => 'Rewards fuel progression: XP levels command, Perbug powers actions, and materials upgrade your squad.',
      OnboardingStep.progressionCue => 'Next objective: clear 2 connected nodes and apply one squad upgrade to keep expanding.',
      OnboardingStep.liveLoop => 'You are in the live loop. Keep expanding across real geography and strengthening your squad.',
      _ => 'Mission briefing active.',
    };

    final canContinue = state.step != OnboardingStep.firstMove && state.step != OnboardingStep.firstEncounter;

    return AppCard(
      tone: AppCardTone.featured,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Onboarding // ${state.step.name}', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(message),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (canContinue)
                FilledButton.icon(
                  onPressed: onContinue,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Continue'),
                ),
              TextButton(onPressed: onSkip, child: const Text('Skip tutorial')),
            ],
          ),
          if (state.timeToFirstMoveMs != null || state.timeToFirstRewardMs != null)
            Text(
              'Telemetry: first move ${state.timeToFirstMoveMs ?? '-'}ms • first reward ${state.timeToFirstRewardMs ?? '-'}ms',
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
      ),
    );
  }
}

class _EnergyMeter extends StatelessWidget {
  const _EnergyMeter({required this.current, required this.max});

  final int current;
  final int max;

  @override
  Widget build(BuildContext context) {
    final ratio = max == 0 ? 0.0 : (current / max).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Energy $current / $max', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 6),
        LinearProgressIndicator(value: ratio, minHeight: 10),
      ],
    );
  }
}

class _BoardPainter extends CustomPainter {
  const _BoardPainter({required this.state});

  final PerbugGameState state;

  @override
  void paint(Canvas canvas, Size size) {
    if (state.nodes.isEmpty) return;
    final lats = state.nodes.map((n) => n.latitude);
    final lngs = state.nodes.map((n) => n.longitude);
    final minLat = lats.reduce(math.min);
    final maxLat = lats.reduce(math.max);
    final minLng = lngs.reduce(math.min);
    final maxLng = lngs.reduce(math.max);

    Offset toPoint(PerbugNode n) {
      final x = ((n.longitude - minLng) / ((maxLng - minLng).abs() + 0.0001)) * (size.width - 32) + 16;
      final y = ((maxLat - n.latitude) / ((maxLat - minLat).abs() + 0.0001)) * (size.height - 32) + 16;
      return Offset(x, y);
    }

    final current = state.currentNode;
    if (current != null) {
      final currentPoint = toPoint(current);
      final linePaint = Paint()
        ..color = const Color(0xFF4E7DFF).withOpacity(0.38)
        ..strokeWidth = 1.4;
      for (final move in state.reachableMoves().take(14)) {
        canvas.drawLine(currentPoint, toPoint(move.node), linePaint..color = move.isReachable ? const Color(0xFF4E7DFF).withOpacity(0.38) : const Color(0xFF8D99AE).withOpacity(0.2));
      }
    }

    for (final node in state.nodes) {
      final p = toPoint(node);
      final isCurrent = node.id == state.currentNodeId;
      final isVisited = state.visitedNodeIds.contains(node.id);
      final isReachable = state.reachableMoves().any((move) => move.node.id == node.id && move.isReachable);
      final fill = Paint()
        ..color = isCurrent
            ? const Color(0xFFFFD166)
            : isReachable
                ? PerbugAssetRegistry.nodeVisual(node.nodeType).color
                : (isVisited ? const Color(0xFF4ECDC4) : const Color(0xFF8D99AE));
      canvas.drawCircle(p, isCurrent ? 7 : 5, fill);
    }
  }

  @override
  bool shouldRepaint(covariant _BoardPainter oldDelegate) => oldDelegate.state != state;
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.subtitle, required this.children});

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      tone: AppCardTone.collection,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}
