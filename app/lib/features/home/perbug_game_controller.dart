import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import '../puzzles/grid_path_puzzle.dart';
import '../puzzles/puzzle_framework.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'perbug_game_models.dart';

final perbugGameControllerProvider = StateNotifierProvider<PerbugGameController, PerbugGameState>((ref) {
  return PerbugGameController(ref);
});

class PerbugGameController extends StateNotifier<PerbugGameState> {
  PerbugGameController(this._ref)
      : _gridPathGenerator = const GridPathGenerator(),
        super(PerbugGameState.initial());

  final Ref _ref;
  final GridPathGenerator _gridPathGenerator;
  Timer? _puzzleTimer;

  static const MapViewport _fixedGameplayViewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);

  Future<void> initialize() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
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

      final nodes = pins.take(20).map(_mapPinToNode).toList(growable: false);
      final start = state.currentNodeId == null ? nodes.first : nodes.firstWhere((n) => n.id == state.currentNodeId, orElse: () => nodes.first);
      state = state.copyWith(
        nodes: nodes,
        currentNodeId: start.id,
        visitedNodeIds: {...state.visitedNodeIds, start.id},
        areaLabel: [area?.city, area?.region].whereType<String>().where((e) => e.isNotEmpty).join(', '),
        history: state.history.isEmpty ? ['Landed at ${start.label}'] : state.history,
        loading: false,
      );
    } catch (error) {
      state = state.copyWith(loading: false, error: 'Unable to load Perbug world nodes: $error');
    }
  }

  Future<bool> jumpTo(PerbugMoveCandidate move) async {
    if (!move.isReachable) return false;
    final current = state.currentNode;
    if (current == null) return false;

    final spend = move.energyCost;
    final isFirstVisit = !state.visitedNodeIds.contains(move.node.id);
    final gained = isFirstVisit ? move.node.energyReward : 1;
    final nextEnergy = (state.energy - spend + gained).clamp(0, state.maxEnergy);

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
      visitedNodeIds: {...state.visitedNodeIds, move.node.id},
      activeEncounter: encounter,
      history: [
        'Moved ${_formatDistance(move.node.distanceFromCurrentMeters ?? 0)} to ${move.node.label} (-$spend, +$gained energy)',
        'Encounter ready: ${encounter.type.name} • ${encounter.difficultyTier}',
        ...state.history,
      ],
    );
    return true;
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
    final progression = state.progression.applyRewards(payout);

    state = state.copyWith(
      activeEncounter: encounter.copyWith(status: resolvedStatus),
      progression: progression,
      energy: (state.energy + payout.energy).clamp(0, state.maxEnergy),
      history: [
        succeeded
            ? 'Resolved ${encounter.type.name} (+${payout.xp} XP, +${payout.perbug} Perbug)'
            : 'Encounter failed. Regroup and try another node.',
        ...state.history,
      ],
    );
  }

  void claimPassiveEnergy() {
    state = state.copyWith(
      energy: (state.energy + 3).clamp(0, state.maxEnergy),
      history: ['Recovered +3 energy from exploration streak', ...state.history],
    );
  }

  void upgradePrimaryUnit() {
    final units = [...state.squad.units];
    if (units.isEmpty) return;
    if (state.progression.perbug < 5) {
      state = state.copyWith(history: ['Need 5 Perbug to upgrade squad power.', ...state.history]);
      return;
    }

    units[0] = units[0].copyWith(power: units[0].power + 2);
    state = state.copyWith(
      squad: SquadState(units: units, maxSlots: state.squad.maxSlots),
      progression: ProgressionState(
        level: state.progression.level,
        xp: state.progression.xp,
        perbug: state.progression.perbug - 5,
        inventory: state.progression.inventory,
      ),
      history: ['Upgraded ${units[0].name} to power ${units[0].power}.', ...state.history],
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

  PerbugNode _mapPinToNode(MapPin pin) {
    final nodeType = deriveNodeTypeFromPin(pin);
    return PerbugNode(
      id: pin.canonicalPlaceId,
      label: pin.name,
      latitude: pin.latitude,
      longitude: pin.longitude,
      region: pin.neighborhoodLabel,
      nodeType: nodeType,
      difficulty: _difficultyFor(pin),
      state: deriveNodeStateFromPin(pin),
      energyReward: pin.hasReviews ? 4 : 2,
    );
  }

  int _difficultyFor(MapPin pin) {
    final base = ((pin.rating * 2).round()).clamp(1, 5);
    if (pin.hasCreatorMedia) return (base + 1).clamp(1, 6);
    return base;
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
        perbug: node.nodeType == PerbugNodeType.rare ? 3 : 1,
        resources: {
          if (node.nodeType == PerbugNodeType.resource) 'bio_dust': 2 + node.difficulty,
          if (node.nodeType != PerbugNodeType.resource) 'signal_shard': 1 + (node.difficulty ~/ 2),
        },
        energy: node.nodeType == PerbugNodeType.rest ? 4 : 1,
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
}
