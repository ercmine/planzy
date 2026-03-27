import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'perbug_game_models.dart';
import 'puzzles/logic_locks_puzzle.dart';
import 'puzzles/puzzle_framework.dart';

final perbugGameControllerProvider = StateNotifierProvider<PerbugGameController, PerbugGameState>((ref) {
  return PerbugGameController(ref);
});

class PerbugGameController extends StateNotifier<PerbugGameState> {
  PerbugGameController(this._ref) : super(PerbugGameState.initial());

  final Ref _ref;
  final _logicLocksGenerator = LogicLocksGenerator();
  final _logicLocksValidator = LogicLocksValidator();

  static const MapViewport _fixedGameplayViewport = MapViewport(centerLat: 30.2672, centerLng: -97.7431, zoom: 13);

  Future<void> initialize() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final geoClient = await _ref.read(mapGeoClientProvider.future);
      final location = _ref.read(locationControllerProvider).effectiveLocation;
      final viewport = location == null
          ? _fixedGameplayViewport
          : MapViewport(centerLat: location.lat, centerLng: location.lng, zoom: _fixedGameplayViewport.zoom);

      final pins = await geoClient.nearby(context: SearchAreaContext(viewport: viewport, radiusMeters: 3000, mode: 'perbug_nodes'));
      if (pins.isEmpty) {
        state = state.copyWith(loading: false, error: 'No nearby world nodes found yet. Try moving the anchor area.');
        return;
      }

      final nodes = pins.take(20).map(_mapPinToNode).toList(growable: false);
      final start = nodes.first;
      state = state.copyWith(
        nodes: nodes,
        currentNodeId: start.id,
        visitedNodeIds: {start.id},
        history: ['Landed at ${start.label}'],
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

    state = state.copyWith(
      nodes: updatedNodes,
      currentNodeId: move.node.id,
      energy: nextEnergy,
      visitedNodeIds: {...state.visitedNodeIds, move.node.id},
      history: [
        'Jumped ${_formatDistance(move.node.distanceFromCurrentMeters ?? 0)} to ${move.node.label} (-$spend, +$gained energy)',
        ...state.history,
      ],
      clearPuzzleSession: true,
    );
    return true;
  }

  void claimPassiveEnergy() {
    state = state.copyWith(
      energy: (state.energy + 3).clamp(0, state.maxEnergy),
      history: ['Recovered +3 energy from exploration streak', ...state.history],
    );
  }

  void generateLogicLocksForCurrentNode({LogicLocksDifficultyConfig config = const LogicLocksDifficultyConfig()}) {
    final node = state.currentNode;
    if (node == null) return;

    final input = PuzzleSeedInput(
      nodeId: node.id,
      latitude: node.latitude,
      longitude: node.longitude,
      difficultySalt: '${config.variableCount}:${config.clueCount}:${config.gridSize}',
    );
    final instance = _logicLocksGenerator.generate(seedInput: input, config: config);
    final session = PuzzleSession<LogicLocksPuzzleData, LogicLocksPlayerState>(
      instance: instance,
      status: PuzzleSessionStatus.generated,
      playerState: LogicLocksPlayerState.empty(instance.data.solution.length),
      attempts: 0,
      createdAt: DateTime.now().toUtc(),
      analyticsEvents: [_event('puzzle_generated', node, instance)],
    );
    state = state.copyWith(
      activePuzzleSession: PerbugPuzzleSessionData(nodeId: node.id, logicLocksSession: session),
      puzzleHistory: [...state.puzzleHistory, ...session.analyticsEvents],
    );
  }

  void startActivePuzzle() {
    final container = state.activePuzzleSession;
    final node = state.currentNode;
    if (container == null || node == null) return;
    final started = container.logicLocksSession.copyWith(
      status: PuzzleSessionStatus.started,
      startedAt: DateTime.now().toUtc(),
      analyticsEvents: [...container.logicLocksSession.analyticsEvents, _event('puzzle_started', node, container.logicLocksSession.instance)],
    );
    state = state.copyWith(
      activePuzzleSession: container.copyWith(logicLocksSession: started),
      puzzleHistory: [...state.puzzleHistory, started.analyticsEvents.last],
    );
  }

  void logCluePanelViewed() {
    final container = state.activePuzzleSession;
    final node = state.currentNode;
    if (container == null || node == null) return;
    final updated = container.logicLocksSession.copyWith(
      analyticsEvents: [...container.logicLocksSession.analyticsEvents, _event('clue_panel_entered', node, container.logicLocksSession.instance)],
    );
    state = state.copyWith(activePuzzleSession: container.copyWith(logicLocksSession: updated), puzzleHistory: [...state.puzzleHistory, updated.analyticsEvents.last]);
  }

  void assignPuzzleSlot(int slot, String? entity) {
    final container = state.activePuzzleSession;
    if (container == null) return;
    final nextState = container.logicLocksSession.playerState.assign(slot, entity);
    final updated = container.logicLocksSession.copyWith(playerState: nextState);
    state = state.copyWith(activePuzzleSession: container.copyWith(logicLocksSession: updated));
  }

  void undoPuzzleMove() {
    final container = state.activePuzzleSession;
    if (container == null) return;
    final updated = container.logicLocksSession.copyWith(playerState: container.logicLocksSession.playerState.undo());
    state = state.copyWith(activePuzzleSession: container.copyWith(logicLocksSession: updated));
  }

  void resetPuzzle() {
    final container = state.activePuzzleSession;
    if (container == null) return;
    final updated = container.logicLocksSession.copyWith(playerState: container.logicLocksSession.playerState.reset());
    state = state.copyWith(activePuzzleSession: container.copyWith(logicLocksSession: updated));
  }

  PuzzleResult submitPuzzleAttempt() {
    final container = state.activePuzzleSession;
    final node = state.currentNode;
    if (container == null || node == null) {
      return const PuzzleResult(success: false, timeToSolve: Duration.zero, attempts: 0, reason: 'No active puzzle');
    }

    final session = container.logicLocksSession;
    final startedAt = session.startedAt ?? session.createdAt;
    final endedAt = DateTime.now().toUtc();
    final attempts = session.attempts + 1;
    final result = _logicLocksValidator.validate(
      instance: session.instance,
      playerState: session.playerState,
      attempts: attempts,
      startedAt: startedAt,
      endedAt: endedAt,
    );

    final status = result.success ? PuzzleSessionStatus.succeeded : PuzzleSessionStatus.failed;
    final eventName = result.success ? 'puzzle_succeeded' : 'puzzle_failed';
    final updated = session.copyWith(
      attempts: attempts,
      status: status,
      endedAt: endedAt,
      analyticsEvents: [
        ...session.analyticsEvents,
        _event(eventName, node, session.instance, extras: {'attempts': attempts, 'solve_ms': result.timeToSolve.inMilliseconds}),
      ],
    );

    final energy = result.rewardEnergyHook ? (state.energy + 2).clamp(0, state.maxEnergy) : state.energy;
    state = state.copyWith(
      energy: energy,
      activePuzzleSession: container.copyWith(logicLocksSession: updated),
      puzzleHistory: [...state.puzzleHistory, updated.analyticsEvents.last],
      history: [
        result.success ? 'Solved Logic Locks at ${node.label} (+2 energy hook)' : 'Logic Locks failed at ${node.label}',
        ...state.history,
      ],
    );
    return result;
  }

  void abandonActivePuzzle() {
    final container = state.activePuzzleSession;
    final node = state.currentNode;
    if (container == null || node == null) return;
    final updated = container.logicLocksSession.copyWith(
      status: PuzzleSessionStatus.abandoned,
      endedAt: DateTime.now().toUtc(),
      analyticsEvents: [...container.logicLocksSession.analyticsEvents, _event('puzzle_abandoned', node, container.logicLocksSession.instance)],
    );
    state = state.copyWith(
      activePuzzleSession: container.copyWith(logicLocksSession: updated),
      puzzleHistory: [...state.puzzleHistory, updated.analyticsEvents.last],
    );
  }

  PuzzleAnalyticsEvent _event(String name, PerbugNode node, PuzzleInstance<LogicLocksPuzzleData> instance, {Map<String, Object?> extras = const {}}) {
    return PuzzleAnalyticsEvent(
      name: name,
      timestamp: DateTime.now().toUtc(),
      payload: {
        'nodeId': node.id,
        'seed': instance.seed,
        'difficultyTier': instance.difficulty.tier,
        'difficultyScore': instance.difficulty.score,
        'variableCount': instance.data.entities.length,
        'clueCount': instance.data.clues.length,
        'contradictionComplexity': instance.data.contradictionComplexityEstimate,
        'ambiguityLevel': instance.data.ambiguityEstimate,
        'deductionDepth': instance.data.deductionDepthEstimate,
        ...extras,
      },
    );
  }

  PerbugNode _mapPinToNode(MapPin pin) {
    return PerbugNode(
      id: pin.canonicalPlaceId,
      label: pin.name,
      latitude: pin.latitude,
      longitude: pin.longitude,
      region: pin.neighborhoodLabel,
      state: deriveNodeStateFromPin(pin),
      energyReward: pin.hasReviews ? 4 : 2,
    );
  }

  String _formatDistance(double meters) {
    if (meters >= 1000) return '${(meters / 1000).toStringAsFixed(1)}km';
    return '${meters.toStringAsFixed(0)}m';
  }
}
