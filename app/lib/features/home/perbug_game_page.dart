import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/rpg_bar.dart';
import '../../app/theme/widgets.dart';
import '../../app/app_routes.dart';
import '../../core/location/location_controller.dart';
import '../../core/location/location_models.dart';
import '../../core/navigation/navigation_utils.dart';
import '../../providers/app_providers.dart';
import '../onboarding/onboarding_controller.dart';
import '../onboarding/onboarding_state.dart';
import '../puzzles/grid_path_puzzle_sheet.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'world/world_map_scene.dart';
import 'world/world_map_scene_controller.dart';
import 'world/world_map_scene_generator.dart';
import 'world/world_map_scene_models.dart';
import 'perbug_asset_registry.dart';
import 'perbug_economy_models.dart';
import 'perbug_game_controller.dart';
import 'perbug_game_models.dart';

class PerbugGamePage extends ConsumerStatefulWidget {
  const PerbugGamePage({
    super.key,
    this.showTacticalHud = true,
  });

  final bool showTacticalHud;

  @override
  ConsumerState<PerbugGamePage> createState() => _PerbugGamePageState();
}

class _PerbugGamePageState extends ConsumerState<PerbugGamePage> {
  String? _selectedNodeId;
  String? _mapAnchoredNodeId;
  late MapViewport _mapViewport;
  final TextEditingController _searchController = TextEditingController();
  _MapEntryState _entryState = _MapEntryState.idle;
  String? _entryDetails;
  late final WorldMapSceneController _sceneController;
  WorldMapNode? _selectedWorldNode;
  String? _lastSceneSignature;

  @override
  void dispose() {
    _sceneController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _mapViewport = const MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);
    _sceneController = WorldMapSceneController(generator: const WorldMapSceneGenerator());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(perbugGameControllerProvider);
    final locationState = ref.watch(locationControllerProvider);
    final controller = ref.read(perbugGameControllerProvider.notifier);
    final onboarding = ref.watch(onboardingControllerProvider);
    final onboardingController = ref.read(onboardingControllerProvider.notifier);
    final moves = state.reachableMoves().take(8).toList(growable: false);
    final currentNode = state.currentNode;
    if (currentNode != null && _selectedNodeId == null) _selectedNodeId = currentNode.id;
    if (currentNode != null && _mapAnchoredNodeId != currentNode.id) {
      _mapAnchoredNodeId = currentNode.id;
      _mapViewport = MapViewport(centerLat: currentNode.latitude, centerLng: currentNode.longitude, zoom: state.fixedZoom);
    }
    final selectedNode = _selectedNode(state);
    final selectedMove = selectedNode == null ? null : _moveForNode(state, selectedNode.id);
    final mapUiState = _mapUiState(state: state, locationState: locationState);
    final showBlockingMapOverlay = _shouldShowBlockingMapOverlay(mapUiState);
    final showDemoLocationCta = _shouldShowDemoLocationCta(state: state, locationState: locationState);
    final locationForScene = locationState.effectiveLocation;
    final signature = '${locationForScene?.latitude.toStringAsFixed(3)}:${locationForScene?.longitude.toStringAsFixed(3)}:${state.nodes.length}:${state.progression.level}';
    if (_lastSceneSignature != signature) {
      _lastSceneSignature = signature;
      _sceneController.regenerate(
        location: locationForScene,
        demoMode: locationForScene == null,
        seed: state.nodes.length + state.progression.level,
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        if (_entryState == _MapEntryState.locationGranted) {
          await controller.requestLocationAndRefresh();
        } else {
          await _continueInDemoMode();
        }
      },
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

          AppCard(
            tone: AppCardTone.muted,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Region targeting // Nominatim search', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        decoration: const InputDecoration(
                          hintText: 'Search a city, district, or landmark…',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                        onSubmitted: (_) => _runGeoSearch(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SecondaryButton(label: 'Jump', onPressed: _runGeoSearch),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    AppPill(
                      label: ref.watch(locationControllerProvider).effectiveLocation == null ? 'Demo mode anchor' : 'Live location anchor',
                      icon: ref.watch(locationControllerProvider).effectiveLocation == null ? Icons.smart_toy_outlined : Icons.my_location,
                    ),
                    AppPill(label: state.areaLabel ?? 'Unknown region', icon: Icons.public),
                    AppPill(label: 'Nodes ${state.nodes.length}', icon: Icons.hub),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (widget.showTacticalHud)
            AppCard(
              tone: AppCardTone.kpi,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  SizedBox(
                    width: 176,
                    child: RpgBarButton(label: 'Node details', onPressed: () => context.go(AppRoutes.nodeDetails), icon: const Icon(Icons.place_outlined), height: 50),
                  ),
                  SizedBox(
                    width: 176,
                    child: RpgBarButton(label: 'Enter Encounter', onPressed: () => context.go(AppRoutes.encounter), icon: const Icon(Icons.sports_martial_arts), height: 50),
                  ),
                  SizedBox(
                    width: 176,
                    child: RpgBarButton(label: 'View Squad', onPressed: () => context.go(AppRoutes.squad), icon: const Icon(Icons.groups_2_outlined), height: 50),
                  ),
                  SizedBox(
                    width: 176,
                    child: RpgBarButton(label: 'Inventory', onPressed: () => context.go(AppRoutes.inventory), icon: const Icon(Icons.inventory_2_outlined), height: 50),
                  ),
                  SizedBox(
                    width: 176,
                    child: RpgBarButton(label: 'Open Marketplace', onPressed: () => context.go(AppRoutes.marketplace), icon: const Icon(Icons.storefront_outlined), height: 50),
                  ),
                  SizedBox(
                    width: 176,
                    child: RpgBarButton(label: 'Objectives', onPressed: () => context.go(AppRoutes.progression), icon: const Icon(Icons.flag_outlined), height: 50),
                  ),
                  SizedBox(
                    width: 176,
                    child: RpgBarButton(
                      label: 'Wallet/Login',
                      onPressed: () => context.go(AppRoutes.wallet),
                      icon: const Icon(Icons.account_balance_wallet_outlined),
                      variant: RpgButtonVariant.secondary,
                      height: 50,
                    ),
                  ),
                ],
              ),
            ),
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
                  height: 420,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Stack(
                      children: [
                        WorldMapScene(
                          controller: _sceneController,
                          onTapEmpty: () => setState(() {
                            _selectedNodeId = null;
                            _selectedWorldNode = null;
                          }),
                          onNodeTapped: (node) {
                            final match = state.nodes.where((candidate) => candidate.nodeType == node.perbugType).toList(growable: false);
                            setState(() {
                              _selectedWorldNode = node;
                              _selectedNodeId = match.isNotEmpty ? match.first.id : _selectedNodeId;
                            });
                          },
                        ),
                        Positioned(
                          top: 12,
                          left: 10,
                          child: AppPill(
                            label: 'Energy ${state.energy}/${state.maxEnergy}',
                            icon: Icons.bolt_rounded,
                          ),
                        ),
                        Positioned(
                          left: 10,
                          top: 46,
                          child: AppPill(
                            label: state.worldDebug['location_mode'] == 'demo' ? 'DEMO WORLD' : 'LIVE WORLD',
                            icon: state.worldDebug['location_mode'] == 'demo' ? Icons.smart_toy_outlined : Icons.travel_explore,
                          ),
                        ),
                        Positioned(
                          right: 10,
                          top: 12,
                          child: Wrap(
                            spacing: 8,
                            children: [
                              AppPill(label: 'Nodes ${state.nodes.length}', icon: Icons.hub_outlined),
                              AppPill(label: state.areaLabel ?? 'Unknown region', icon: Icons.public),
                              if (_selectedWorldNode != null) AppPill(label: 'Focus ${_selectedWorldNode!.category.name}', icon: Icons.adjust),
                            ],
                          ),
                        ),
                        if (showBlockingMapOverlay)
                          Positioned.fill(
                            child: _MapStatusOverlay(
                              state: mapUiState,
                              locationState: locationState,
                              details: _entryDetails ?? state.error ?? state.worldDebug['fallback_reason']?.toString(),
                              onRequestLocation: _useMyLocation,
                              onContinueDemo: _continueInDemoMode,
                            ),
                          ),
                        if (showDemoLocationCta)
                          Positioned(
                            top: 10,
                            right: 10,
                            child: _DemoModeLocationButton(
                              requestingLocation: _entryState == _MapEntryState.requestingLocation,
                              onPressed: _useMyLocation,
                            ),
                          ),
                        if (kDebugMode)
                          Positioned(
                            right: 8,
                            bottom: 8,
                            child: _DebugMapOverlay(
                              gameState: state,
                              locationState: locationState,
                              viewport: _mapViewport,
                            ),
                          ),
                        if (!showBlockingMapOverlay && _selectedWorldNode != null)
                          Positioned(
                            left: 12,
                            top: 86,
                            child: _WorldNodeInspectorCard(node: _selectedWorldNode!),
                          ),
                        if (!showBlockingMapOverlay && selectedNode != null)
                          Positioned(
                            left: 12,
                            right: 12,
                            bottom: 12,
                            child: _NodeTacticalPanel(
                              node: selectedNode,
                              move: selectedMove,
                              onDeploy: selectedMove == null || !selectedMove.isReachable
                                  ? null
                                  : () async {
                                      final ok = await controller.jumpTo(selectedMove);
                                      if (!mounted || !ok) return;
                                      setState(() => _selectedNodeId = selectedMove.node.id);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Deployed to ${selectedMove.node.label}.')),
                                      );
                                    },
                              onEnterEncounter: state.currentNodeId == selectedNode.id ? () => context.go(AppRoutes.encounter) : null,
                            ),
                          ),
                      ],
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
                if (selectedNode != null) ...[
                  const SizedBox(height: 12),
                  AppCard(
                    tone: AppCardTone.muted,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Selected: ${selectedNode.label}', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 4),
                        Text(
                          '${selectedNode.nodeType.name.toUpperCase()} • Difficulty ${selectedNode.difficulty} • ${selectedMove?.reason ?? 'Current position'}',
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (selectedMove != null)
                              RpgBarButton(
                                height: 44,
                                label: selectedMove.isReachable
                                    ? 'Deploy (-${selectedMove.energyCost} energy)'
                                    : selectedMove.reason,
                                onPressed: selectedMove.isReachable
                                    ? () async {
                                        final ok = await controller.jumpTo(selectedMove);
                                        if (!mounted) return;
                                        if (ok) {
                                          setState(() => _selectedNodeId = selectedMove.node.id);
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(content: Text('Deployed to ${selectedMove.node.label}.')),
                                          );
                                        }
                                      }
                                    : null,
                              ),
                            RpgBarButton(
                              height: 44,
                              label: 'Enter encounter',
                              onPressed: state.currentNodeId == selectedNode.id ? () => context.go(AppRoutes.encounter) : null,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
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
                  trailing: RpgBarButton(
                    height: 42,
                    onPressed: objective.progress.isComplete && !objective.progress.claimed
                        ? () => controller.claimDailyObjective(objective.id)
                        : null,
                    label: objective.progress.claimed ? 'Claimed' : 'Claim Reward',
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
                  trailing: RpgBarButton(
                    height: 42,
                    onPressed: milestone.isComplete && !milestone.claimed ? () => controller.claimMilestoneReward(milestone.id) : null,
                    label: milestone.claimed ? 'Claimed' : 'Claim Reward',
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
                  subtitle: LinearProgressIndicator(value: ratio.clamp(0, 1).toDouble()),
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
                      leading: _PerbugArtAvatar(
                        assetPath: PerbugAssetRegistry.roleVisual(unit.role).portraitRef.assetPath,
                        fallbackIcon: PerbugAssetRegistry.roleVisual(unit.role).icon,
                      ),
                      title: Text('${unit.name} • ${PerbugAssetRegistry.roleVisual(unit.role).label}/${unit.unitClass.name}'),
                      subtitle: Text(
                        'Lv ${unit.progression.level} • ${unit.rarity.name} • ${unit.resolvedProvenance.source.name} • '
                        'Power ${unit.power}',
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
                      leading: _PerbugArtAvatar(
                        assetPath: visual.tileRef.assetPath,
                        fallbackIcon: visual.icon,
                        tint: move.isReachable ? null : Colors.blueGrey.withOpacity(0.45),
                      ),
                      title: Text('${move.node.label} • ${visual.label}'),
                      subtitle: Text(
                        '${move.node.region} • ${((move.node.distanceFromCurrentMeters ?? 0) / 1000).toStringAsFixed(2)}km • ${move.reason}\n'
                        'Art ${visual.iconRef.id}/${visual.tileRef.id}',
                      ),
                      trailing: RpgBarButton(
                        height: 42,
                        onPressed: move.isReachable
                            ? () => runGuardedUiAction(
                                context,
                                actionLabel: 'Move to node',
                                action: () async {
                                  final ok = await controller.jumpTo(move);
                                if (!context.mounted || !ok) return;
                                await onboardingController.recordFirstMove();
                                if (onboarding.step == OnboardingStep.firstMove) {
                                  await onboardingController.advanceTo(OnboardingStep.firstEncounter);
                                }
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Moved to ${move.node.label}')));
                                },
                              )
                            : null,
                        label: 'Move (${move.energyCost}⚡ + ${move.totalPerbugCost}Ⓟ)',
                        variant: RpgButtonVariant.secondary,
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

  _MapUiState _mapUiState({
    required PerbugGameState state,
    required LocationControllerState locationState,
  }) {
    if (_entryState == _MapEntryState.idle) return _MapUiState.idle;
    if (_entryState == _MapEntryState.requestingLocation) return _MapUiState.requestingLocation;
    if (_entryState == _MapEntryState.locationDenied) return _MapUiState.permissionDenied;
    if (_entryState == _MapEntryState.unsupported) return _MapUiState.unsupported;
    if (state.loading) {
      if (_entryState == _MapEntryState.locationGranted) return _MapUiState.requestingLocation;
      return _MapUiState.loading;
    }
    if (state.nodes.isEmpty) return _MapUiState.empty;
    if (_entryState == _MapEntryState.demoMode ||
        state.worldDebug['generation_status'] == 'fallback' ||
        state.worldDebug['fallback_active'] == true) {
      return _MapUiState.demoMode;
    }
    if (_entryState == _MapEntryState.locationGranted && locationState.status == LocationStatus.ready) {
      return _MapUiState.locationGranted;
    }
    if (state.error != null && state.nodes.isNotEmpty) return _MapUiState.generationFailed;
    return _MapUiState.ready;
  }

  bool _shouldShowBlockingMapOverlay(_MapUiState state) {
    switch (state) {
      case _MapUiState.idle:
      case _MapUiState.loading:
      case _MapUiState.requestingLocation:
      case _MapUiState.permissionDenied:
      case _MapUiState.unsupported:
      case _MapUiState.empty:
        return true;
      case _MapUiState.locationGranted:
      case _MapUiState.demoMode:
      case _MapUiState.generationFailed:
      case _MapUiState.ready:
        return false;
    }
  }

  bool _shouldShowDemoLocationCta({
    required PerbugGameState state,
    required LocationControllerState locationState,
  }) {
    if (_entryState == _MapEntryState.requestingLocation) return false;
    if (locationState.effectiveLocation != null && locationState.status == LocationStatus.ready) {
      return false;
    }
    if (_entryState == _MapEntryState.demoMode ||
        _entryState == _MapEntryState.locationDenied ||
        _entryState == _MapEntryState.unsupported) {
      return true;
    }
    return state.worldDebug['location_mode'] == 'demo' ||
        state.worldDebug['fallback_active'] == true ||
        state.worldDebug['generation_status'] == 'fallback';
  }

  Future<void> _useMyLocation() async {
    if (_entryState == _MapEntryState.requestingLocation) return;
    if (kIsWeb && !_webCanRequestGeolocation()) {
      setState(() {
        _entryState = _MapEntryState.unsupported;
        _entryDetails = 'Location prompts on web require HTTPS (or localhost).';
      });
      return;
    }

    setState(() {
      _entryState = _MapEntryState.requestingLocation;
      _entryDetails = 'Requesting real location permission from your device/browser.';
    });

    await ref.read(perbugGameControllerProvider.notifier).requestLocationAndRefresh();
    if (!mounted) return;
    final locationState = ref.read(locationControllerProvider);
    final gameState = ref.read(perbugGameControllerProvider);

    if (locationState.effectiveLocation != null && locationState.status == LocationStatus.ready) {
      setState(() {
        _entryState = _MapEntryState.locationGranted;
        _entryDetails = 'Live location enabled. Your world is now anchored to your real position.';
      });
      return;
    }

    if (locationState.status == LocationStatus.permissionDenied) {
      setState(() {
        _entryState = _MapEntryState.locationDenied;
        _entryDetails = locationState.errorMessage ?? 'Location access was denied. Continue in demo mode to keep playing.';
      });
      return;
    }

    if (locationState.status == LocationStatus.serviceDisabled) {
      setState(() {
        _entryState = _MapEntryState.unsupported;
        _entryDetails = locationState.errorMessage ?? 'Location services are unavailable. Continue in demo mode to explore.';
      });
      return;
    }

    setState(() {
      _entryState = gameState.worldDebug['fallback_active'] == true ? _MapEntryState.demoMode : _MapEntryState.locationDenied;
      _entryDetails = gameState.worldDebug['fallback_active'] == true
          ? 'Live position was unavailable. Demo frontier loaded so your run continues.'
          : 'Could not confirm live location. You can continue in demo mode.';
    });
  }

  Future<void> _continueInDemoMode() async {
    setState(() {
      _entryState = _MapEntryState.demoMode;
      _entryDetails = 'Demo mode loaded. Use My Location any time to generate your real world.';
    });
    await ref.read(perbugGameControllerProvider.notifier).initialize();
  }

  bool _webCanRequestGeolocation() {
    if (!kIsWeb) return true;
    final base = Uri.base;
    final localHost = base.host == 'localhost' || base.host == '127.0.0.1';
    return base.scheme == 'https' || localHost;
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


  Future<void> _runGeoSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final geo = await ref.read(mapGeoClientProvider.future);
      final results = await geo.geocode(query);
      if (results.isEmpty) {
        messenger.showSnackBar(const SnackBar(content: Text('No matching region found.')));
        return;
      }
      final top = results.first;
      if (!mounted) return;
      setState(() {
        _mapViewport = MapViewport(centerLat: top.lat, centerLng: top.lng, zoom: _mapViewport.zoom);
      });
      messenger.showSnackBar(SnackBar(content: Text('Retargeted to ${top.displayName}.')));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Search unavailable right now.')));
    }
  }

  PerbugNode? _selectedNode(PerbugGameState state) {
    final id = _selectedNodeId ?? state.currentNodeId;
    if (id == null) return null;
    for (final node in state.nodes) {
      if (node.id == id) return node;
    }
    return null;
  }

  PerbugMoveCandidate? _moveForNode(PerbugGameState state, String nodeId) {
    for (final move in state.reachableMoves()) {
      if (move.node.id == nodeId) return move;
    }
    return null;
  }

}

enum _MapUiState {
  idle,
  loading,
  requestingLocation,
  locationGranted,
  permissionDenied,
  unsupported,
  demoMode,
  generationFailed,
  empty,
  ready,
}

enum _MapEntryState {
  idle,
  requestingLocation,
  locationGranted,
  locationDenied,
  unsupported,
  demoMode,
}

class _MapStatusOverlay extends StatelessWidget {
  const _MapStatusOverlay({
    required this.state,
    required this.locationState,
    required this.onRequestLocation,
    required this.onContinueDemo,
    this.details,
  });

  final _MapUiState state;
  final LocationControllerState locationState;
  final VoidCallback onRequestLocation;
  final VoidCallback onContinueDemo;
  final String? details;

  @override
  Widget build(BuildContext context) {
    if (state == _MapUiState.ready) return const SizedBox.shrink();
    final (title, subtitle) = switch (state) {
      _MapUiState.idle => (
          'Choose your world anchor',
          'Use your real location to generate your world. Or continue in Demo Mode.',
        ),
      _MapUiState.requestingLocation => ('Requesting location', 'Waiting for browser/device location permission.'),
      _MapUiState.locationGranted => ('Live location active', 'Your tactical world is now generated from your real location.'),
      _MapUiState.permissionDenied => (
          'Location denied',
          locationState.errorMessage ?? 'Location access was denied. Continue in demo mode immediately.',
        ),
      _MapUiState.unsupported => ('Location unavailable', 'Location services are disabled or unsupported on this device/browser.'),
      _MapUiState.demoMode => ('Demo map active', 'Using deterministic fallback world so gameplay remains available.'),
      _MapUiState.generationFailed => ('Live generation failed', 'Using fallback frontier so the map loop continues.'),
      _MapUiState.empty => ('No world nodes yet', 'Retry with location or continue in demo mode.'),
      _MapUiState.loading => ('Loading frontier', 'Building world nodes…'),
      _MapUiState.ready => throw StateError('unreachable'),
    };

    return ColoredBox(
      color: Colors.black.withOpacity(0.35),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 6),
                  Text(subtitle),
                  if (details != null && details!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(details!, style: Theme.of(context).textTheme.bodySmall),
                  ],
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: state == _MapUiState.requestingLocation ? null : onRequestLocation,
                        icon: const Icon(Icons.my_location),
                        label: const Text('Use My Location'),
                      ),
                      OutlinedButton.icon(
                        onPressed: onContinueDemo,
                        icon: const Icon(Icons.smart_toy_outlined),
                        label: const Text('Continue Demo Mode'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PerbugArtAvatar extends StatelessWidget {
  const _PerbugArtAvatar({
    required this.assetPath,
    required this.fallbackIcon,
    this.tint,
  });

  final String? assetPath;
  final IconData fallbackIcon;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    if (assetPath == null || assetPath!.isEmpty) {
      return CircleAvatar(child: Icon(fallbackIcon, size: 18));
    }
    return ClipOval(
      child: SizedBox.square(
        dimension: 40,
        child: Image.asset(
          assetPath!,
          fit: BoxFit.cover,
          color: tint,
          colorBlendMode: tint == null ? null : BlendMode.modulate,
          errorBuilder: (_, __, ___) => CircleAvatar(child: Icon(fallbackIcon, size: 18)),
        ),
      ),
    );
  }
}

class _DemoModeLocationButton extends StatelessWidget {
  const _DemoModeLocationButton({
    required this.onPressed,
    required this.requestingLocation,
  });

  final VoidCallback onPressed;
  final bool requestingLocation;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Switch from demo to real-world map anchoring',
      child: FilledButton.tonalIcon(
        onPressed: requestingLocation ? null : onPressed,
        icon: const Icon(Icons.explore_outlined),
        label: const Text('Switch to Real World'),
      ),
    );
  }
}

class _NodeTacticalPanel extends StatelessWidget {
  const _NodeTacticalPanel({
    required this.node,
    required this.move,
    required this.onDeploy,
    required this.onEnterEncounter,
  });

  final PerbugNode node;
  final PerbugMoveCandidate? move;
  final VoidCallback? onDeploy;
  final VoidCallback? onEnterEncounter;

  @override
  Widget build(BuildContext context) {
    final visual = PerbugAssetRegistry.nodeVisual(node.nodeType);
    final style = Theme.of(context).textTheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0D1022).withOpacity(0.92),
            visual.color.withOpacity(0.3),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.16)),
        boxShadow: [
          BoxShadow(
            blurRadius: 18,
            offset: const Offset(0, 8),
            color: Colors.black.withOpacity(0.35),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                _PerbugArtAvatar(
                  assetPath: visual.tileRef.assetPath,
                  fallbackIcon: visual.icon,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    node.label,
                    style: style.titleMedium?.copyWith(fontWeight: FontWeight.w700, color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                AppPill(
                  label: node.nodeType.name.toUpperCase(),
                  icon: Icons.auto_awesome,
                  backgroundColor: visual.color.withOpacity(0.2),
                  foregroundColor: Colors.white,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${node.neighborhood}, ${node.city} • Difficulty ${node.difficulty}',
              style: style.bodySmall?.copyWith(color: Colors.white70),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: RpgBarButton(
                    height: 40,
                    label: move?.isReachable == true ? 'Deploy (-${move!.energyCost}⚡)' : (move?.reason ?? 'Current node'),
                    onPressed: onDeploy,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: RpgBarButton(
                    height: 40,
                    label: 'Enter encounter',
                    variant: RpgButtonVariant.secondary,
                    onPressed: onEnterEncounter,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DebugMapOverlay extends StatelessWidget {
  const _DebugMapOverlay({
    required this.gameState,
    required this.locationState,
    required this.viewport,
  });

  final PerbugGameState gameState;
  final LocationControllerState locationState;
  final MapViewport viewport;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.white) ?? const TextStyle(color: Colors.white, fontSize: 11);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.62),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: DefaultTextStyle(
          style: style,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('mode=${gameState.worldDebug['location_mode'] ?? 'unknown'}'),
              Text('perm=${locationState.status.name}'),
              Text('nodes=${gameState.nodes.length} edges=${gameState.connections.length}'),
              Text('center=${viewport.centerLat.toStringAsFixed(4)},${viewport.centerLng.toStringAsFixed(4)} z=${viewport.zoom.toStringAsFixed(1)}'),
              Text('gen=${gameState.worldDebug['generation_status'] ?? 'n/a'}'),
              Text('fallback=${gameState.worldDebug['fallback_active'] == true ? 'on' : 'off'}'),
              if (gameState.error != null) Text('error=${gameState.error}'),
              if (gameState.worldDebug['seed'] != null) Text('seed=${gameState.worldDebug['seed']}'),
            ],
          ),
        ),
      ),
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
                RpgBarButton(
                  onPressed: onContinue,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: 'Continue',
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

class _WorldNodeInspectorCard extends StatelessWidget {
  const _WorldNodeInspectorCard({required this.node});

  final WorldMapNode node;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xCC111728),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: categoryColor(node.category).withOpacity(0.6)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(node.label, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
            Text('${node.category.name.toUpperCase()} • Tier ${node.difficulty}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70)),
            Text('Travel ${node.energyCost}⚡', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: const Color(0xFFFFD36E))),
          ],
        ),
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
          RpgBarSurface(
            height: 54,
            tint: const Color(0x2A000000),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
            ),
          ),
          const SizedBox(height: 4),
          Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}
