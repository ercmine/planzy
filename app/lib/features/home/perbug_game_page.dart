import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/widgets.dart';
import '../puzzles/grid_path_puzzle_sheet.dart';
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
    final moves = state.reachableMoves().take(8).toList(growable: false);

    return RefreshIndicator(
      onRefresh: controller.initialize,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          PremiumHeader(
            title: 'Perbug Strategy Map',
            subtitle: 'Move node-to-node, resolve encounters, and push outward from ${state.areaLabel ?? 'your anchor region'}.',
            badge: const AppPill(label: 'Fixed zoom 2D', icon: Icons.map_outlined),
          ),
          const SizedBox(height: 12),
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
                Text('Level ${state.progression.level} • XP ${state.progression.xp} • Perbug ${state.economy.wallet.balance}'),
                Text('Upgrade Currency ${state.progression.upgradeCurrency} • Squad power ${state.squad.equippedPower} • Slots ${state.squad.maxSlots}'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final strategic in ['ore', 'scrap', 'circuit', 'relic_shard', 'field_kit', 'upgrade_module'])
                      AppPill(label: '${perbugResourceDefinitions[strategic]?.label ?? strategic}: ${state.economy.inventory.quantityOf(strategic)}'),
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
                Text('World board (zoom locked @ ${state.fixedZoom.toStringAsFixed(0)})', style: Theme.of(context).textTheme.titleMedium),
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
                Text('Current node: ${state.currentNode?.label ?? '—'} • Jump range ${(state.maxJumpMeters / 1000).toStringAsFixed(1)}km'),
                if (state.currentNode != null)
                  Text(
                    '${state.currentNode!.neighborhood}, ${state.currentNode!.city}, ${state.currentNode!.region}, ${state.currentNode!.country}',
                  ),
              ],
            ),
          ),
          if (state.loading) const AppCard(child: LinearProgressIndicator()),
          if (state.error != null) AppCard(child: Text(state.error!)),

          _Section(
            title: 'Squad command: active loadout',
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
            title: 'Roster vault',
            subtitle: 'Collectible unit identity with rarity, role, class, and progression.',
            children: [
              ...state.squad.roster
                  .map(
                    (unit) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(child: Text(unit.rarity.name.substring(0, 1).toUpperCase())),
                      title: Text('${unit.name} • ${unit.role.name}/${unit.unitClass.name}'),
                      subtitle: Text(
                        'Lv ${unit.progression.level} • ${unit.rarity.name} • ${unit.ownershipSource.name} • Power ${unit.power}',
                      ),
                      trailing: unit.nftLink == null
                          ? const Text('Off-chain')
                          : const Icon(Icons.verified, color: Colors.amber),
                    ),
                  )
                  .toList(growable: false),
            ],
          ),

          _Section(
            title: 'Loop step 1-2: Move on nearby nodes',
            subtitle: 'No free teleporting. Reachability is based on real distance and energy.',
            children: moves
                .map(
                  (move) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      _iconForNodeType(move.node.nodeType),
                      color: move.isReachable ? _colorForNodeType(move.node.nodeType) : Colors.blueGrey,
                    ),
                    title: Text('${move.node.label} • ${move.node.nodeType.name}'),
                    subtitle: Text(
                      '${move.node.region} • ${((move.node.distanceFromCurrentMeters ?? 0) / 1000).toStringAsFixed(2)}km • ${move.reason}',
                    ),
                    trailing: TextButton(
                      onPressed: move.isReachable
                          ? () async {
                              final ok = await controller.jumpTo(move);
                              if (!context.mounted || !ok) return;
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Moved to ${move.node.label}')));
                            }
                          : null,
                      child: Text('Move (${move.energyCost}⚡ + ${move.totalPerbugCost}Ⓟ)'),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
          _Section(
            title: 'Loop step 3-4: Resolve encounter and reward',
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
                        : () {
                            controller.launchEncounter();
                            controller.resolveEncounter(succeeded: true);
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
            title: 'Loop step 5: Progress squad + resources',
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
            title: 'Loop step 6: Crafting and strategic Perbug spend',
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
            title: 'Perbug wallet ledger',
            subtitle: 'Gameplay-first accounting with anti-duplicate action IDs and source/sink attribution.',
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
                ? _colorForNodeType(node.nodeType)
                : (isVisited ? const Color(0xFF4ECDC4) : const Color(0xFF8D99AE));
      canvas.drawCircle(p, isCurrent ? 7 : 5, fill);
    }
  }

  @override
  bool shouldRepaint(covariant _BoardPainter oldDelegate) => oldDelegate.state != state;
}

IconData _iconForNodeType(PerbugNodeType type) {
  return switch (type) {
    PerbugNodeType.encounter => Icons.flash_on_rounded,
    PerbugNodeType.resource => Icons.forest_rounded,
    PerbugNodeType.mission => Icons.flag_circle_rounded,
    PerbugNodeType.shop => Icons.storefront_rounded,
    PerbugNodeType.rare => Icons.auto_awesome_rounded,
    PerbugNodeType.boss => Icons.health_and_safety_rounded,
    PerbugNodeType.rest => Icons.nightlight_round,
    PerbugNodeType.event => Icons.celebration_rounded,
  };
}

Color _colorForNodeType(PerbugNodeType type) {
  return switch (type) {
    PerbugNodeType.encounter => const Color(0xFF4E7DFF),
    PerbugNodeType.resource => const Color(0xFF2EC27E),
    PerbugNodeType.mission => const Color(0xFFFF9F1C),
    PerbugNodeType.shop => const Color(0xFFB07CF7),
    PerbugNodeType.rare => const Color(0xFFE76F51),
    PerbugNodeType.boss => const Color(0xFFEF476F),
    PerbugNodeType.rest => const Color(0xFF118AB2),
    PerbugNodeType.event => const Color(0xFFF15BB5),
  };
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.subtitle, required this.children});

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(subtitle),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}
