import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'perbug_game_models.dart';
import 'puzzles/puzzle_framework.dart';
import 'puzzles/sequence_forge_puzzle.dart';

final perbugGameControllerProvider = StateNotifierProvider<PerbugGameController, PerbugGameState>((ref) {
  return PerbugGameController(ref);
});

class PerbugGameController extends StateNotifier<PerbugGameState> {
  PerbugGameController(this._ref) : super(PerbugGameState.initial());

  final Ref _ref;
  static const SequenceForgeGenerator _sequenceForgeGenerator = SequenceForgeGenerator();

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
      clearActiveSequenceForgeSession: true,
    );
    return true;
  }

  void claimPassiveEnergy() {
    state = state.copyWith(
      energy: (state.energy + 3).clamp(0, state.maxEnergy),
      history: ['Recovered +3 energy from exploration streak', ...state.history],
    );
  }

  void launchSequenceForgeForCurrentNode() {
    final node = state.currentNode;
    if (node == null) return;

    final knobs = SequenceForgeDifficultyKnobs(
      sequenceDepth: 6 + (state.visitedNodeIds.length % 3),
      transformationLayers: state.visitedNodeIds.length >= 4 ? 2 : 1,
      hiddenSteps: state.visitedNodeIds.length >= 3 ? 2 : 1,
      operatorComplexity: state.visitedNodeIds.length >= 5 ? 4 : 2,
      answerChoices: state.visitedNodeIds.length >= 6 ? 5 : 4,
      misleadingSymmetry: state.visitedNodeIds.length >= 5 ? 2 : 0,
    );

    final input = PuzzleSeedInput(
      nodeId: node.id,
      latitude: node.latitude,
      longitude: node.longitude,
      difficultyBand: state.visitedNodeIds.length,
    );

    final instance = _sequenceForgeGenerator.generate(seedInput: input, knobs: knobs);
    final session = PuzzleSession<SequenceForgePuzzleData>(
      instance: instance,
      status: PuzzleSessionStatus.generated,
      selectedAnswers: const {},
      startedAt: null,
      retries: 0,
    );

    state = state.copyWith(
      activeSequenceForgeSession: session,
      puzzleEvents: ['generated:${instance.instanceId}', ...state.puzzleEvents],
      history: ['Sequence Forge generated for ${node.label} (${instance.difficulty.tier.name})', ...state.history],
    );
  }

  void startActivePuzzle() {
    final session = state.activeSequenceForgeSession;
    if (session == null) return;
    if (session.status != PuzzleSessionStatus.generated) return;
    state = state.copyWith(
      activeSequenceForgeSession: session.copyWith(status: PuzzleSessionStatus.started, startedAt: DateTime.now()),
      puzzleEvents: ['started:${session.instance.instanceId}', ...state.puzzleEvents],
    );
  }

  void selectPuzzleAnswer({required int hiddenIndex, required String answer}) {
    final session = state.activeSequenceForgeSession;
    if (session == null) return;
    final selected = {...session.selectedAnswers, hiddenIndex: answer};
    state = state.copyWith(activeSequenceForgeSession: session.copyWith(selectedAnswers: selected));
  }

  PuzzleResult? submitActivePuzzle() {
    final session = state.activeSequenceForgeSession;
    final node = state.currentNode;
    if (session == null || node == null) return null;

    final success = validateSequenceForgeSubmission(data: session.instance.data, selectedAnswers: session.selectedAnswers);
    final startedAt = session.startedAt ?? DateTime.now();
    final result = PuzzleResult(
      type: PuzzleType.perbugSequenceForge,
      success: success,
      nodeId: node.id,
      duration: DateTime.now().difference(startedAt),
      retries: session.retries,
      difficulty: session.instance.difficulty,
      telemetry: {
        'family': session.instance.data.family.name,
        'depth': session.instance.data.fullSequence.length,
        'layers': session.instance.debugMetadata['transformationLayers'],
        'hiddenSteps': session.instance.data.hiddenIndices.length,
        'operatorComplexity': session.instance.debugMetadata['operatorComplexity'],
        'answerChoices': session.instance.debugMetadata['answerChoices'],
        'misleadingSymmetry': session.instance.data.misleadingSymmetryApplied,
      },
    );

    final status = success ? PuzzleSessionStatus.succeeded : PuzzleSessionStatus.failed;
    final retries = success ? session.retries : session.retries + 1;
    final bonus = success ? 2 : 0;
    state = state.copyWith(
      energy: (state.energy + bonus).clamp(0, state.maxEnergy),
      activeSequenceForgeSession: session.copyWith(status: status, retries: retries),
      lastPuzzleResult: result,
      puzzleEvents: ['submitted:${session.instance.instanceId}:$success', ...state.puzzleEvents],
      history: [
        '${success ? 'Solved' : 'Missed'} Sequence Forge at ${node.label}${success ? ' (+$bonus energy)' : ''}',
        ...state.history,
      ],
    );
    return result;
  }

  void abandonActivePuzzle() {
    final session = state.activeSequenceForgeSession;
    if (session == null) return;
    state = state.copyWith(
      activeSequenceForgeSession: session.copyWith(status: PuzzleSessionStatus.abandoned),
      puzzleEvents: ['abandoned:${session.instance.instanceId}', ...state.puzzleEvents],
      history: ['Abandoned Sequence Forge at ${state.currentNode?.label ?? 'node'}', ...state.history],
    );
  }

  void resetActivePuzzleSelections() {
    final session = state.activeSequenceForgeSession;
    if (session == null) return;
    state = state.copyWith(
      activeSequenceForgeSession: session.copyWith(selectedAnswers: const {}, status: PuzzleSessionStatus.started),
      puzzleEvents: ['reset:${session.instance.instanceId}', ...state.puzzleEvents],
      clearLastPuzzleResult: true,
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
