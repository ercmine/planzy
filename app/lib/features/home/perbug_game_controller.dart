import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../../providers/app_providers.dart';
import '../puzzles/grid_path_puzzle.dart';
import '../puzzles/puzzle_framework.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'perbug_economy_models.dart';
import 'perbug_game_models.dart';
import 'perbug_economy_store.dart';
import 'perbug_node_world_engine.dart';
import 'perbug_progression_models.dart';

final perbugGameControllerProvider = StateNotifierProvider<PerbugGameController, PerbugGameState>((ref) {
  return PerbugGameController(ref);
});

class PerbugGameController extends StateNotifier<PerbugGameState> {
  PerbugGameController(this._ref)
      : _gridPathGenerator = const GridPathGenerator(),
        _worldEngine = const PerbugNodeWorldEngine(),
        _progressionEngine = const PerbugProgressionEngine(),
        super(PerbugGameState.initial());

  final Ref _ref;
  final GridPathGenerator _gridPathGenerator;
  final PerbugNodeWorldEngine _worldEngine;
  final PerbugProgressionEngine _progressionEngine;
  Timer? _puzzleTimer;
  PerbugEconomyStore? _economyStore;
  bool _economyHydrated = false;

  static const MapViewport _fixedGameplayViewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);

  Future<void> initialize() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      await _hydrateEconomyState();
      final geoClient = await _ref.read(mapGeoClientProvider.future);
      final location = _ref.read(locationControllerProvider).effectiveLocation;
      final viewport = location == null
          ? _fixedGameplayViewport
          : MapViewport(centerLat: location.lat, centerLng: location.lng, zoom: _fixedGameplayViewport.zoom);

      final area = await geoClient.reverseGeocode(lat: viewport.centerLat, lng: viewport.centerLng);
      final pins = await geoClient.nearby(context: SearchAreaContext(viewport: viewport, radiusMeters: 3000, mode: 'perbug_nodes'));
      if (pins.isEmpty) {
        state = state.copyWith(loading: false, error: 'No nearby world nodes found yet. Try moving the anchor area.');
        return;
      }

      final worldSnapshot = _worldEngine.build(
        pins: pins,
        context: PerbugNodeGenerationContext(
          anchorLat: viewport.centerLat,
          anchorLng: viewport.centerLng,
          playerLevel: state.progression.level,
          maxNodes: 24,
          minNodeSpacingMeters: 220,
          maxLinkDistanceMeters: state.maxJumpMeters * 1.3,
        ),
        anchorArea: area,
      );
      final nodes = worldSnapshot.nodes;
      final start = state.currentNodeId == null ? nodes.first : nodes.firstWhere((n) => n.id == state.currentNodeId, orElse: () => nodes.first);
      state = state.copyWith(
        nodes: nodes,
        currentNodeId: start.id,
        visitedNodeIds: {...state.visitedNodeIds, start.id},
        areaLabel: [area?.city, area?.region].whereType<String>().where((e) => e.isNotEmpty).join(', '),
        history: state.history.isEmpty ? ['Landed at ${start.label}'] : state.history,
        connections: worldSnapshot.connections,
        worldDebug: worldSnapshot.debug,
        loading: false,
      );
      _syncProgression(reason: 'initialize');
      await _persistEconomyState();
    } catch (error) {
      state = state.copyWith(loading: false, error: 'Unable to load Perbug world nodes: $error');
    }
  }

  Future<bool> jumpTo(PerbugMoveCandidate move) async {
    if (!move.isReachable) return false;
    final current = state.currentNode;
    if (current == null) return false;
    final linked = state.connections[current.id]?.contains(move.node.id) == true;
    if (!linked) return false;

    final spend = move.energyCost;
    final isFirstVisit = !state.visitedNodeIds.contains(move.node.id);
    final gained = isFirstVisit ? move.node.energyReward : 1;
    final nextEnergy = (state.energy - spend + gained).clamp(0, state.maxEnergy);
    final spendEconomy = _trySpendPerbug(
      amount: move.totalPerbugCost,
      sink: PerbugSink.movement,
      actionId: 'move:${state.currentNodeId}:${move.node.id}',
      metadata: {
        'movement_cost': move.perbugMovementCost,
        'node_access_cost': move.perbugNodeAccessCost,
      },
    );
    if (spendEconomy == null) return false;

    final updatedNodes = state.nodes
        .map(
          (node) => node.id == move.node.id
              ? node.copyWith(state: PerbugNodeState.completed)
              : node,
        )
        .toList(growable: false);

    final encounter = _createEncounter(move.node);

    state = state.copyWith(
      nodes: updatedNodes,
      currentNodeId: move.node.id,
      energy: nextEnergy,
      economy: spendEconomy,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: spendEconomy.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency,
      ),
      visitedNodeIds: {...state.visitedNodeIds, move.node.id},
      activeEncounter: encounter,
      economyTelemetry: [
        {
          'event': 'perbug_spend',
          'sink': PerbugSink.movement.name,
          'amount': move.totalPerbugCost,
          'at': DateTime.now().toIso8601String(),
        },
        ...state.economyTelemetry,
      ],
      history: [
        'Moved ${_formatDistance(move.node.distanceFromCurrentMeters ?? 0)} to ${move.node.label} (-$spend energy, -${move.totalPerbugCost} Perbug, +$gained energy)',
        'Encounter ready: ${encounter.type.name} • ${encounter.difficultyTier}',
        ...state.history,
      ],
    );
    _trackObjective(ObjectiveType.clearNodes, 1);
    if (isFirstVisit) {
      _trackObjective(ObjectiveType.discoverNodes, 1);
    }
    _syncProgression(reason: 'jump_to_node');
    return true;
  }


  void debugSetActiveEncounter(NodeEncounter encounter) {
    state = state.copyWith(activeEncounter: encounter);
  }

  void debugSeedEconomy({
    required Inventory inventory,
    int? perbug,
    int? level,
  }) {
    final nextPerbug = perbug ?? state.progression.perbug;
    state = state.copyWith(
      economy: state.economy.copyWith(
        inventory: inventory,
        wallet: state.economy.wallet.copyWith(balance: nextPerbug),
      ),
      progression: ProgressionState(
        level: level ?? state.progression.level,
        xp: state.progression.xp,
        perbug: nextPerbug,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency,
      ),
    );
  }

  NodeEncounter launchEncounter() {
    final current = state.currentNode;
    final encounter = state.activeEncounter;
    if (current == null) {
      throw StateError('No current node selected');
    }
    if (encounter == null) {
      final generated = _createEncounter(current);
      state = state.copyWith(activeEncounter: generated);
      return generated;
    }
    if (encounter.status == EncounterStatus.inProgress) {
      return encounter;
    }
    final inProgress = encounter.copyWith(status: EncounterStatus.inProgress);
    state = state.copyWith(activeEncounter: inProgress);
    return inProgress;
  }

  void resolveEncounter({required bool succeeded}) {
    final encounter = state.activeEncounter;
    if (encounter == null) return;
    final resolvedStatus = succeeded ? EncounterStatus.resolved : EncounterStatus.failed;
    final payout = succeeded ? encounter.rewardBundle : const RewardBundle();
    final cappedPerbug = succeeded
        ? _cappedEmission(
            desired: payout.perbug,
            source: PerbugSource.encounter,
            nodeDifficulty: int.tryParse(encounter.difficultyTier.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1,
          )
        : 0;
    final adjustedPayout = RewardBundle(
      xp: payout.xp,
      perbug: cappedPerbug,
      resources: payout.resources,
      energy: payout.energy,
      unitXp: payout.unitXp,
      unitUnlocks: payout.unitUnlocks,
      upgradeCurrency: payout.upgradeCurrency,
    );
    final progression = state.progression.applyRewards(adjustedPayout);
    final nextEconomy = succeeded
        ? _applyResourceGrant(
            base: state.economy,
            grant: adjustedPayout.resources,
            source: ResourceSource.nodeEncounter,
            metadata: {'encounter_type': encounter.type.name, 'node_id': encounter.nodeId},
          )
        : state.economy;
    final walletApplied = succeeded && adjustedPayout.perbug > 0
        ? _applyPerbugReward(
            base: nextEconomy,
            amount: adjustedPayout.perbug,
            source: PerbugSource.encounter,
            actionId: 'encounter:${encounter.id}',
            metadata: {'node_id': encounter.nodeId, 'difficulty': encounter.difficultyTier},
          )
        : nextEconomy;
    final nextSquad = succeeded
        ? state.squad.applyUnitXpToActive(adjustedPayout.unitXp).unlockUnits(adjustedPayout.unitUnlocks)
        : state.squad;

    state = state.copyWith(
      activeEncounter: encounter.copyWith(status: resolvedStatus),
      progression: ProgressionState(
        level: progression.level,
        xp: progression.xp,
        perbug: walletApplied.wallet.balance,
        inventory: progression.inventory,
        upgradeCurrency: progression.upgradeCurrency,
      ),
      squad: nextSquad,
      economy: walletApplied,
      energy: (state.energy + adjustedPayout.energy).clamp(0, state.maxEnergy),
      economyTelemetry: [
        if (succeeded)
          {
            'event': 'reward_applied',
            'source': ResourceSource.nodeEncounter.name,
            'perbug_earned': adjustedPayout.perbug,
            'resource_count': adjustedPayout.resources.values.fold<int>(0, (sum, value) => sum + value),
            'at': DateTime.now().toIso8601String(),
          },
        ...state.economyTelemetry,
      ],
      history: [
        succeeded
            ? 'Resolved ${encounter.type.name} (+${adjustedPayout.xp} XP, +${adjustedPayout.perbug} Perbug, +${adjustedPayout.unitXp} squad XP)'
            : 'Encounter failed. Regroup and try another node.',
        ...state.history,
      ],
    );
    if (succeeded && encounter.type == EncounterType.resourceHarvest) {
      _trackObjective(ObjectiveType.collectResource, 1);
    }
    if (succeeded && state.currentNode?.nodeType == PerbugNodeType.rare) {
      _trackObjective(ObjectiveType.completeRareNode, 1);
    }
    _syncProgression(reason: 'encounter_resolved');
    unawaited(_persistEconomyState());
  }

  void claimPassiveEnergy() {
    state = state.copyWith(
      energy: (state.energy + 3).clamp(0, state.maxEnergy),
      history: ['Recovered +3 energy from exploration streak', ...state.history],
    );
  }

  void upgradePrimaryUnit() {
    final primary = state.squad.activeUnits.isEmpty ? null : state.squad.activeUnits.first;
    if (primary == null) return;
    final upgrade = primary.upgradePath.firstWhere(
      (node) => !primary.progression.unlockedUpgradeIds.contains(node.id),
      orElse: () => const UnitUpgradeNode(
        id: '__none__',
        title: 'No upgrades',
        description: 'No upgrades remain',
        statBonus: UnitStats(attack: 0, defense: 0, speed: 0, utility: 0, energyEfficiency: 0, resilience: 0, initiative: 0),
        levelRequirement: 999,
        currencyCost: 999,
      ),
    );

    if (upgrade.id == '__none__') {
      state = state.copyWith(history: ['${primary.name} has completed its current upgrade path.', ...state.history]);
      return;
    }

    final modules = state.economy.inventory.quantityOf('upgrade_module');
    if (state.progression.upgradeCurrency < upgrade.currencyCost || modules < 1) {
      state = state.copyWith(
        history: ['Need ${upgrade.currencyCost} upgrade currency and 1 upgrade module for ${upgrade.title}.', ...state.history],
      );
      return;
    }

    if (primary.progression.level < upgrade.levelRequirement) {
      state = state.copyWith(history: ['${primary.name} must reach level ${upgrade.levelRequirement} first.', ...state.history]);
      return;
    }
    final perbugUpgradeCost = state.economy.config.actionCosts[PerbugActionType.upgrade]?.baseCost ?? 0;
    if (state.economy.wallet.balance < perbugUpgradeCost) {
      state = state.copyWith(history: ['Need $perbugUpgradeCost Perbug for ${upgrade.title}.', ...state.history]);
      return;
    }
    final spendEconomy = _trySpendPerbug(
      amount: perbugUpgradeCost,
      sink: PerbugSink.upgrade,
      actionId: 'upgrade:${primary.id}:${upgrade.id}',
      metadata: {'unit_id': primary.id, 'upgrade_id': upgrade.id},
    );
    if (spendEconomy == null) return;

    final nextSquad = state.squad.unlockUnitUpgrade(
      unitId: primary.id,
      upgradeId: upgrade.id,
      currencyAvailable: state.progression.upgradeCurrency,
    );

    state = state.copyWith(
      squad: nextSquad,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: spendEconomy.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency - upgrade.currencyCost,
      ),
      economy: spendEconomy.copyWith(inventory: spendEconomy.inventory.remove(const ResourceStack(resourceId: 'upgrade_module', amount: 1))),
      history: ['Unlocked ${upgrade.title} on ${primary.name} (-$perbugUpgradeCost Perbug).', ...state.history],
    );
    _trackObjective(ObjectiveType.upgradeUnit, 1);
    _syncProgression(reason: 'upgrade_unit');
    unawaited(_persistEconomyState());
  }

  void craftRecipe(String recipeId) {
    CraftingRecipe? recipe;
    for (final entry in perbugCraftingRecipes) {
      if (entry.id == recipeId) {
        recipe = entry;
        break;
      }
    }
    if (recipe == null) return;
    if (state.progression.level < recipe.unlockLevel) {
      _appendCraftFailure(recipeId, 'Recipe unlock level ${recipe.unlockLevel} not reached');
      return;
    }
    if (state.economy.wallet.balance < recipe.perbugCost) {
      _appendCraftFailure(recipeId, 'Not enough Perbug');
      return;
    }
    if (state.energy < recipe.energyCost) {
      _appendCraftFailure(recipeId, 'Not enough energy');
      return;
    }
    final costs = recipe.inputs.map((input) => input.toStack()).toList(growable: false);
    if (!state.economy.inventory.canAfford(costs)) {
      _appendCraftFailure(recipeId, 'Missing ingredients');
      return;
    }

    final spendEconomy = _trySpendPerbug(
      amount: recipe.perbugCost,
      sink: PerbugSink.crafting,
      actionId: 'craft:${recipe.id}:${DateTime.now().millisecondsSinceEpoch}',
      metadata: {'recipe_id': recipe.id},
    );
    if (spendEconomy == null) {
      _appendCraftFailure(recipeId, 'Perbug spend declined');
      return;
    }

    var nextInventory = state.economy.inventory;
    for (final input in recipe.inputs) {
      nextInventory = nextInventory.remove(input.toStack());
    }
    for (final output in recipe.outputs) {
      nextInventory = nextInventory.add(output.toStack());
    }
    final nextEconomy = spendEconomy.copyWith(
      inventory: nextInventory,
      sessions: [
        CraftingSession(recipeId: recipe.id, createdAt: DateTime.now().toUtc(), succeeded: true, error: null),
        ...spendEconomy.sessions,
      ],
    );
    state = state.copyWith(
      economy: nextEconomy,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: nextEconomy.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency,
      ),
      energy: (state.energy - recipe.energyCost).clamp(0, state.maxEnergy),
      economyTelemetry: [
        {
          'event': 'craft_success',
          'recipe_id': recipe.id,
          'perbug_spend': recipe.perbugCost,
          'energy_spend': recipe.energyCost,
          'at': DateTime.now().toIso8601String(),
        },
        ...state.economyTelemetry,
      ],
      history: ['Crafted ${recipe.label} (-${recipe.perbugCost} Perbug).', ...state.history],
    );
    _trackObjective(ObjectiveType.craftItems, 1);
    _syncProgression(reason: 'craft_item');
    unawaited(_persistEconomyState());
  }

  void useCraftedItem(String resourceId) {
    final current = state.economy.inventory.quantityOf(resourceId);
    if (current < 1) return;
    if (resourceId == 'field_kit') {
      state = state.copyWith(
        economy: state.economy.copyWith(
          inventory: state.economy.inventory.remove(const ResourceStack(resourceId: 'field_kit', amount: 1)),
        ),
        energy: (state.energy + 6).clamp(0, state.maxEnergy),
        history: ['Used Field Kit (+6 energy).', ...state.history],
      );
    } else if (resourceId == 'upgrade_module') {
      state = state.copyWith(
        economy: state.economy.copyWith(
          inventory: state.economy.inventory.remove(const ResourceStack(resourceId: 'upgrade_module', amount: 1)),
        ),
        progression: ProgressionState(
          level: state.progression.level,
          xp: state.progression.xp,
          perbug: state.economy.wallet.balance,
          inventory: state.progression.inventory,
          upgradeCurrency: state.progression.upgradeCurrency + 4,
        ),
        history: ['Applied Upgrade Module (+4 upgrade currency).', ...state.history],
      );
    }
    unawaited(_persistEconomyState());
  }

  void rerollCurrentEncounter() {
    final encounter = state.activeEncounter;
    final node = state.currentNode;
    if (encounter == null || node == null) return;
    final cost = state.economy.config.actionCosts[PerbugActionType.reroll]?.baseCost ?? 0;
    final spendEconomy = _trySpendPerbug(
      amount: cost,
      sink: PerbugSink.reroll,
      actionId: 'reroll:${encounter.id}',
      metadata: {'node_id': node.id},
    );
    if (spendEconomy == null) return;
    final rerolled = _createEncounter(node);
    state = state.copyWith(
      activeEncounter: rerolled,
      economy: spendEconomy,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: spendEconomy.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency,
      ),
      history: ['Rerolled encounter rewards for ${node.label} (-$cost Perbug).', ...state.history],
    );
    unawaited(_persistEconomyState());
  }

  void scoutCurrentNode() {
    final node = state.currentNode;
    if (node == null) return;
    final cost = state.economy.config.actionCosts[PerbugActionType.scouting]?.baseCost ?? 0;
    final spendEconomy = _trySpendPerbug(
      amount: cost,
      sink: PerbugSink.scouting,
      actionId: 'scout:${node.id}',
      metadata: {'node_id': node.id},
    );
    if (spendEconomy == null) return;
    state = state.copyWith(
      economy: spendEconomy,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: spendEconomy.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency,
      ),
      history: ['Scouted ${node.label}. Rare metadata refreshed (-$cost Perbug).', ...state.history],
    );
    unawaited(_persistEconomyState());
  }

  void enterEventNode() {
    final node = state.currentNode;
    if (node == null) return;
    final cost = state.economy.config.actionCosts[PerbugActionType.eventEntry]?.baseCost ?? 0;
    final spendEconomy = _trySpendPerbug(
      amount: cost,
      sink: PerbugSink.eventEntry,
      actionId: 'event_entry:${node.id}',
      metadata: {'node_type': node.nodeType.name},
    );
    if (spendEconomy == null) return;
    state = state.copyWith(
      economy: spendEconomy,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: spendEconomy.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency,
      ),
      history: ['Entered event ops at ${node.label} (-$cost Perbug).', ...state.history],
    );
    unawaited(_persistEconomyState());
  }

  void unlockPremiumMissionTrack() {
    final cost = state.economy.config.actionCosts[PerbugActionType.premiumProgression]?.baseCost ?? 0;
    final spendEconomy = _trySpendPerbug(
      amount: cost,
      sink: PerbugSink.premiumProgression,
      actionId: 'premium_track:l${state.progression.level}',
      metadata: {'level': state.progression.level},
    );
    if (spendEconomy == null) return;
    state = state.copyWith(
      economy: spendEconomy,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: spendEconomy.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency + 6,
      ),
      history: ['Unlocked premium mission track (+6 upgrade currency, -$cost Perbug).', ...state.history],
    );
    unawaited(_persistEconomyState());
  }


  void claimDailyObjective(String objectiveId) {
    final result = _progressionEngine.claimObjective(current: state.progressionLayer, objectiveId: objectiveId);
    _applyProgressionResult(result, source: 'daily_objective');
  }

  void claimMilestoneReward(String milestoneId) {
    final result = _progressionEngine.claimMilestone(current: state.progressionLayer, milestoneId: milestoneId);
    _applyProgressionResult(result, source: 'milestone');
  }

  void assignUnitToSlot({required String unitId, required int slotIndex}) {
    state = state.copyWith(
      squad: state.squad.assignUnitToSlot(unitId: unitId, slotIndex: slotIndex),
      history: ['Assigned $unitId to squad slot ${slotIndex + 1}.', ...state.history],
    );
  }

  void clearSquadSlot(int slotIndex) {
    state = state.copyWith(
      squad: state.squad.removeUnitFromSlot(slotIndex),
      history: ['Cleared squad slot ${slotIndex + 1}.', ...state.history],
    );
  }

  void launchPuzzleForCurrentNode() {
    final node = state.currentNode;
    if (node == null) return;

    final config = _difficultyConfigForNode(node);
    final puzzle = _gridPathGenerator.generate(
      seedInput: PuzzleSeedInput(nodeId: node.id, latitude: node.latitude, longitude: node.longitude),
      config: config,
    );

    final session = PuzzleSession(
      sessionId: '${node.id}-${DateTime.now().millisecondsSinceEpoch}',
      nodeId: node.id,
      nodeRegion: node.region,
      instance: puzzle,
      status: PuzzleSessionStatus.preview,
      startedAt: DateTime.now().toUtc(),
      retryCount: 0,
      moveCount: 0,
      elapsed: Duration.zero,
    );

    state = state.copyWith(
      puzzleSession: GridPathPuzzleSessionState(
        session: session,
        puzzle: puzzle,
        path: const [],
        status: PuzzleSessionStatus.preview,
        invalidReason: null,
        remainingTime: puzzle.rules.timerSeconds == null ? null : Duration(seconds: puzzle.rules.timerSeconds!),
        analytics: {
          'event': 'puzzle_generated',
          'node_id': node.id,
          'region': node.region,
          'difficulty_score': puzzle.preview.difficulty.score,
          'difficulty_tier': puzzle.preview.difficulty.tier,
          ...puzzle.preview.difficulty.explanation,
          ...puzzle.debug,
        },
      ),
      puzzleTelemetry: [
        {
          'event': 'puzzle_generated',
          'node_id': node.id,
          'seed': puzzle.seed.value,
          'difficulty_score': puzzle.preview.difficulty.score,
          'difficulty_tier': puzzle.preview.difficulty.tier,
          'generated_at': DateTime.now().toIso8601String(),
        },
        ...state.puzzleTelemetry,
      ],
    );
  }

  void startActivePuzzle() {
    final session = state.puzzleSession;
    if (session == null) return;
    _puzzleTimer?.cancel();
    final startedAt = DateTime.now().toUtc();
    final sessionData = session.copyWith(
      session: PuzzleSession(
        sessionId: session.session.sessionId,
        nodeId: session.session.nodeId,
        nodeRegion: session.session.nodeRegion,
        instance: session.session.instance,
        status: PuzzleSessionStatus.active,
        startedAt: startedAt,
        retryCount: session.session.retryCount,
        moveCount: 0,
        elapsed: Duration.zero,
      ),
      status: PuzzleSessionStatus.active,
      path: const [],
      clearInvalidReason: true,
      clearResult: true,
    );

    state = state.copyWith(puzzleSession: sessionData);

    final timerSeconds = session.puzzle.rules.timerSeconds;
    if (timerSeconds != null) {
      _puzzleTimer = Timer.periodic(const Duration(seconds: 1), (_) => _tickTimer());
    }
  }

  void tapPuzzleCell(GridPoint point) {
    final session = state.puzzleSession;
    if (session == null || session.status != PuzzleSessionStatus.active) return;

    final validation = GridPathValidator.validateMove(instance: session.puzzle, path: session.path, move: point);
    if (!validation.isValid) {
      state = state.copyWith(puzzleSession: session.copyWith(invalidReason: validation.reason));
      return;
    }

    final updatedPath = [...session.path, point];
    final elapsed = DateTime.now().toUtc().difference(session.session.startedAt);
    final nextSession = session.copyWith(
      path: updatedPath,
      session: PuzzleSession(
        sessionId: session.session.sessionId,
        nodeId: session.session.nodeId,
        nodeRegion: session.session.nodeRegion,
        instance: session.session.instance,
        status: session.session.status,
        startedAt: session.session.startedAt,
        retryCount: session.session.retryCount,
        moveCount: updatedPath.length,
        elapsed: elapsed,
      ),
      clearInvalidReason: true,
    );

    if (GridPathValidator.isCompleted(instance: session.puzzle, path: updatedPath)) {
      _completePuzzle(session: nextSession, succeeded: true);
      return;
    }

    state = state.copyWith(puzzleSession: nextSession);
  }

  void undoPuzzleMove() {
    final session = state.puzzleSession;
    if (session == null || session.path.isEmpty || session.status != PuzzleSessionStatus.active) return;
    state = state.copyWith(
      puzzleSession: session.copyWith(
        path: session.path.sublist(0, session.path.length - 1),
        clearInvalidReason: true,
      ),
    );
  }

  void resetPuzzleSession() {
    final session = state.puzzleSession;
    if (session == null) return;
    _puzzleTimer?.cancel();

    final retries = session.session.retryCount + 1;
    final refreshed = session.copyWith(
      status: PuzzleSessionStatus.preview,
      path: const [],
      clearInvalidReason: true,
      remainingTime: session.puzzle.rules.timerSeconds == null ? null : Duration(seconds: session.puzzle.rules.timerSeconds!),
      session: PuzzleSession(
        sessionId: session.session.sessionId,
        nodeId: session.session.nodeId,
        nodeRegion: session.session.nodeRegion,
        instance: session.session.instance,
        status: PuzzleSessionStatus.preview,
        startedAt: session.session.startedAt,
        retryCount: retries,
        moveCount: 0,
        elapsed: Duration.zero,
      ),
      clearResult: true,
    );

    state = state.copyWith(puzzleSession: refreshed);
  }

  void abandonPuzzleSession() {
    final session = state.puzzleSession;
    if (session == null) return;
    _puzzleTimer?.cancel();
    final elapsed = DateTime.now().toUtc().difference(session.session.startedAt);
    final result = PuzzleResult(
      sessionId: session.session.sessionId,
      nodeId: session.session.nodeId,
      status: PuzzleSessionStatus.abandoned,
      duration: elapsed,
      moveCount: session.path.length,
      retryCount: session.session.retryCount,
      difficulty: session.puzzle.preview.difficulty,
      seed: session.puzzle.seed,
      metadata: {'reason': 'user_abandon'},
    );

    state = state.copyWith(puzzleSession: session.copyWith(status: PuzzleSessionStatus.abandoned, result: result));
  }

  void clearPuzzleSession() {
    _puzzleTimer?.cancel();
    state = state.copyWith(clearPuzzleSession: true);
  }

  void _tickTimer() {
    final session = state.puzzleSession;
    if (session == null || session.status != PuzzleSessionStatus.active) return;
    final remaining = session.remainingTime;
    if (remaining == null) return;

    final next = remaining - const Duration(seconds: 1);
    if (next <= Duration.zero) {
      _completePuzzle(session: session.copyWith(remainingTime: Duration.zero), succeeded: false, failureReason: 'Timer expired');
      return;
    }
    state = state.copyWith(puzzleSession: session.copyWith(remainingTime: next));
  }

  void _completePuzzle({required GridPathPuzzleSessionState session, required bool succeeded, String? failureReason}) {
    _puzzleTimer?.cancel();
    final elapsed = DateTime.now().toUtc().difference(session.session.startedAt);
    final status = succeeded ? PuzzleSessionStatus.succeeded : PuzzleSessionStatus.failed;
    final result = PuzzleResult(
      sessionId: session.session.sessionId,
      nodeId: session.session.nodeId,
      status: status,
      duration: elapsed,
      moveCount: session.path.length,
      retryCount: session.session.retryCount,
      difficulty: session.puzzle.preview.difficulty,
      seed: session.puzzle.seed,
      metadata: {
        'generated_solution_length': session.puzzle.suggestedSolutionLength,
        'failure_reason': failureReason,
      },
    );

    final nodeProgress = state.puzzleProgressByNode[session.session.nodeId] ??
        const PuzzleNodeProgress(completed: false, attemptCount: 0, retryCount: 0);
    final updatedNodeProgress = nodeProgress.copyWith(
      completed: succeeded ? true : nodeProgress.completed,
      attemptCount: nodeProgress.attemptCount + 1,
      retryCount: session.session.retryCount,
      bestDuration: succeeded
          ? (nodeProgress.bestDuration == null || elapsed < nodeProgress.bestDuration! ? elapsed : nodeProgress.bestDuration)
          : nodeProgress.bestDuration,
      lastDifficultyTier: session.puzzle.preview.difficulty.tier,
    );

    final rewardEnergy = succeeded ? _energyRewardFor(session.puzzle.preview.difficulty.tier) : 0;

    state = state.copyWith(
      energy: (state.energy + rewardEnergy).clamp(0, state.maxEnergy),
      puzzleProgressByNode: {
        ...state.puzzleProgressByNode,
        session.session.nodeId: updatedNodeProgress,
      },
      puzzleSession: session.copyWith(
        status: status,
        result: result,
        invalidReason: failureReason,
      ),
      history: [
        succeeded
            ? 'Solved ${session.puzzle.preview.name} at ${session.session.nodeRegion} (+$rewardEnergy energy)'
            : 'Failed ${session.puzzle.preview.name} at ${session.session.nodeRegion}${failureReason == null ? '' : ' ($failureReason)'}',
        ...state.history,
      ],
    );
  }

  int _energyRewardFor(String tier) {
    return switch (tier) {
      'Easy' => 1,
      'Medium' => 2,
      'Hard' => 3,
      _ => 4,
    };
  }

  GridPathDifficultyConfig _difficultyConfigForNode(PerbugNode node) {
    final coordSpread = (node.latitude.abs() + node.longitude.abs()) % 1;
    final width = 5 + ((coordSpread * 3).round());
    final height = 5 + (((coordSpread * 100).round() % 3));
    final branchComplexity = node.state == PerbugNodeState.special ? 5 : (node.state == PerbugNodeState.futureChallengeReady ? 4 : 3);
    final falsePaths = node.state == PerbugNodeState.special ? 4 : 2;
    final timerEnabled = node.state == PerbugNodeState.special;

    return GridPathDifficultyConfig(
      width: width,
      height: height,
      obstacleDensity: 0.22 + ((coordSpread * 0.15).clamp(0.0, 0.15)),
      branchComplexity: branchComplexity,
      falsePathCount: falsePaths,
      timePressureEnabled: timerEnabled,
      rules: GridPathMovementRules(
        orthogonalOnly: true,
        disallowRevisit: true,
        moveLimit: (width * height * 0.55).round(),
        timerSeconds: timerEnabled ? 45 : null,
      ),
    );
  }

  NodeEncounter _createEncounter(PerbugNode node) {
    final type = switch (node.nodeType) {
      PerbugNodeType.resource => EncounterType.resourceHarvest,
      PerbugNodeType.rare => EncounterType.tacticalSkirmish,
      PerbugNodeType.boss => EncounterType.bossBattle,
      PerbugNodeType.rest => EncounterType.timedEvent,
      _ => EncounterType.puzzle,
    };
    return NodeEncounter(
      id: 'enc-${node.id}-${DateTime.now().millisecondsSinceEpoch}',
      nodeId: node.id,
      type: type,
      status: EncounterStatus.ready,
      difficultyTier: 'Tier ${node.difficulty}',
      rewardBundle: RewardBundle(
        xp: 12 + (node.difficulty * 3),
        perbug: switch (node.nodeType) {
          PerbugNodeType.rare => 4,
          PerbugNodeType.boss => 5,
          _ => 1,
        },
        resources: _resourceRewardsForNode(node),
        energy: node.nodeType == PerbugNodeType.rest ? 4 : 1,
        unitXp: 18 + (node.difficulty * 5),
        upgradeCurrency: node.nodeType == PerbugNodeType.boss ? 8 : 3,
        unitUnlocks: node.nodeType == PerbugNodeType.rare ? ['rare-recruit-${node.id}'] : const [],
      ),
    );
  }

  String _formatDistance(double meters) {
    if (meters >= 1000) return '${(meters / 1000).toStringAsFixed(1)}km';
    return '${meters.toStringAsFixed(0)}m';
  }

  @override
  void dispose() {
    _puzzleTimer?.cancel();
    super.dispose();
  }

  Future<void> _hydrateEconomyState() async {
    if (_economyHydrated) return;
    final prefs = await _ref.read(sharedPreferencesProvider.future);
    _economyStore ??= PerbugEconomyStore(prefs);
    final loaded = _economyStore!.load();
    state = state.copyWith(
      economy: loaded,
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: loaded.wallet.balance,
        inventory: state.progression.inventory,
        upgradeCurrency: state.progression.upgradeCurrency,
      ),
    );
    _economyHydrated = true;
  }

  Future<void> _persistEconomyState() async {
    final store = _economyStore;
    if (store == null) return;
    await store.save(state.economy);
  }

  PerbugEconomyState _applyResourceGrant({
    required PerbugEconomyState base,
    required Map<String, int> grant,
    required ResourceSource source,
    required Map<String, Object> metadata,
  }) {
    var nextInventory = base.inventory;
    for (final entry in grant.entries) {
      if (entry.value <= 0) continue;
      nextInventory = nextInventory.add(ResourceStack(resourceId: entry.key, amount: entry.value));
    }
    return base.copyWith(
      inventory: nextInventory,
      sourceLedger: [
        {'source': source.name, 'grant': grant, 'at': DateTime.now().toIso8601String(), ...metadata},
        ...base.sourceLedger,
      ],
    );
  }

  void _trackObjective(ObjectiveType type, int amount) {
    final result = _progressionEngine.onAction(
      current: state.progressionLayer,
      type: type,
      amount: amount,
      now: DateTime.now().toUtc(),
    );
    state = state.copyWith(progressionLayer: result.progression);
  }

  void _syncProgression({required String reason}) {
    final sync = _progressionEngine.syncWorld(
      current: state.progressionLayer,
      nodes: state.nodes,
      visitedNodeIds: state.visitedNodeIds,
      squad: state.squad,
      inventory: state.economy.inventory,
      now: DateTime.now().toUtc(),
    );
    state = state.copyWith(
      progressionLayer: sync.progression,
      history: ['Progression sync: $reason', ...state.history],
    );
  }

  void _applyProgressionResult(ProgressionUpdateResult result, {required String source}) {
    var nextEconomy = state.economy;
    if (result.reward.perbug > 0) {
      nextEconomy = _applyPerbugReward(
        base: nextEconomy,
        amount: result.reward.perbug,
        source: PerbugSource.progressionStep,
        actionId: '$source:${DateTime.now().millisecondsSinceEpoch}',
        metadata: {'source': source},
      );
    }
    if (result.reward.resources.isNotEmpty) {
      nextEconomy = _applyResourceGrant(base: nextEconomy, grant: result.reward.resources, source: ResourceSource.systemGrant, metadata: {'source': source});
    }
    final progression = state.progression.applyRewards(result.reward);
    state = state.copyWith(
      progressionLayer: result.progression,
      economy: nextEconomy,
      progression: ProgressionState(
        level: progression.level,
        xp: progression.xp,
        perbug: nextEconomy.wallet.balance,
        inventory: progression.inventory,
        upgradeCurrency: progression.upgradeCurrency,
      ),
      history: [result.log, ...state.history],
    );
    unawaited(_persistEconomyState());
  }

  PerbugEconomyState? _trySpendPerbug({
    required int amount,
    required PerbugSink sink,
    required String actionId,
    Map<String, Object> metadata = const <String, Object>{},
  }) {
    if (amount <= 0) return state.economy;
    final wallet = state.economy.wallet;
    if (wallet.balance < amount) return null;
    if (state.economy.config.antiAbusePolicy.requireUniqueActionId && wallet.appliedActionIds.contains(actionId)) {
      return null;
    }
    final cap = state.economy.config.antiAbusePolicy.dailySpendActionCap[sink];
    if (cap != null) {
      final spentToday = wallet.transactions
          .where((tx) => tx.sink == sink && _isSameDayUtc(tx.createdAt, DateTime.now().toUtc()))
          .fold<int>(0, (sum, tx) => sum + tx.amount);
      if (spentToday + amount > cap) return null;
    }
    final nextBalance = wallet.balance - amount;
    final tx = PerbugTransaction(
      id: 'spend-${DateTime.now().microsecondsSinceEpoch}',
      type: PerbugTransactionType.spend,
      amount: amount,
      sink: sink,
      actionId: actionId,
      createdAt: DateTime.now().toUtc(),
      balanceAfter: nextBalance,
      metadata: metadata,
    );
    return state.economy.copyWith(
      wallet: wallet.copyWith(
        balance: nextBalance,
        transactions: [tx, ...wallet.transactions].take(120).toList(growable: false),
        appliedActionIds: {...wallet.appliedActionIds, actionId},
      ),
      sourceLedger: [
        {'type': 'sink', 'sink': sink.name, 'amount': amount, 'action_id': actionId, 'at': DateTime.now().toIso8601String(), ...metadata},
        ...state.economy.sourceLedger,
      ],
    );
  }

  PerbugEconomyState _applyPerbugReward({
    required PerbugEconomyState base,
    required int amount,
    required PerbugSource source,
    required String actionId,
    Map<String, Object> metadata = const <String, Object>{},
  }) {
    if (amount <= 0) return base;
    if (base.wallet.appliedActionIds.contains(actionId)) return base;
    final nextBalance = base.wallet.balance + amount;
    final tx = PerbugTransaction(
      id: 'reward-${DateTime.now().microsecondsSinceEpoch}',
      type: PerbugTransactionType.reward,
      amount: amount,
      source: source,
      actionId: actionId,
      createdAt: DateTime.now().toUtc(),
      balanceAfter: nextBalance,
      metadata: metadata,
    );
    return base.copyWith(
      wallet: base.wallet.copyWith(
        balance: nextBalance,
        transactions: [tx, ...base.wallet.transactions].take(120).toList(growable: false),
        appliedActionIds: {...base.wallet.appliedActionIds, actionId},
      ),
      sourceLedger: [
        {'type': 'source', 'source': source.name, 'amount': amount, 'action_id': actionId, 'at': DateTime.now().toIso8601String(), ...metadata},
        ...base.sourceLedger,
      ],
    );
  }

  int _cappedEmission({
    required int desired,
    required PerbugSource source,
    required int nodeDifficulty,
  }) {
    if (desired <= 0) return 0;
    if (nodeDifficulty < state.economy.config.emissionPolicy.minNodeDifficultyForReward) {
      return state.economy.config.emissionPolicy.trivialActionReward;
    }
    final cap = state.economy.config.emissionPolicy.dailySourceCap[source] ?? desired;
    final rewardedToday = state.economy.wallet.transactions
        .where((tx) => tx.source == source && _isSameDayUtc(tx.createdAt, DateTime.now().toUtc()))
        .fold<int>(0, (sum, tx) => sum + tx.amount);
    final remaining = (cap - rewardedToday).clamp(0, cap);
    return desired > remaining ? remaining : desired;
  }

  bool _isSameDayUtc(DateTime a, DateTime b) {
    final x = a.toUtc();
    final y = b.toUtc();
    return x.year == y.year && x.month == y.month && x.day == y.day;
  }

  void _appendCraftFailure(String recipeId, String reason) {
    state = state.copyWith(
      economy: state.economy.copyWith(
        sessions: [
          CraftingSession(recipeId: recipeId, createdAt: DateTime.now().toUtc(), succeeded: false, error: reason),
          ...state.economy.sessions,
        ],
      ),
      history: ['Craft failed for $recipeId: $reason', ...state.history],
    );
  }

  Map<String, int> _resourceRewardsForNode(PerbugNode node) {
    return switch (node.nodeType) {
      PerbugNodeType.resource => {
          'ore': 2 + node.difficulty,
          'scrap': 1 + (node.difficulty ~/ 2),
          'bio_matter': 1,
        },
      PerbugNodeType.boss => {
          'relic_shard': 2,
          'crystal': 2 + node.difficulty,
          'fuel_cell': 1,
        },
      PerbugNodeType.rare => {
          'crystal': 2 + node.difficulty,
          'circuit': 1 + (node.difficulty ~/ 2),
        },
      PerbugNodeType.mission => {
          'ore': 1 + node.difficulty,
          'circuit': 1,
          'signal_shard': 1,
        },
      _ => {
          'signal_shard': 1 + (node.difficulty ~/ 2),
          'scrap': 1,
        },
    };
  }
}
