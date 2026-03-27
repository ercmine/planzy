import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'perbug_game_models.dart';
import 'perbug_puzzles/puzzle_framework.dart';
import 'perbug_puzzles/word_weave.dart';

final perbugGameControllerProvider = StateNotifierProvider<PerbugGameController, PerbugGameState>((ref) {
  return PerbugGameController(ref);
});

class PerbugGameController extends StateNotifier<PerbugGameState> {
  PerbugGameController(this._ref) : super(PerbugGameState.initial());

  final Ref _ref;

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
    );
    return true;
  }

  void claimPassiveEnergy() {
    state = state.copyWith(
      energy: (state.energy + 3).clamp(0, state.maxEnergy),
      history: ['Recovered +3 energy from exploration streak', ...state.history],
    );
  }

  void launchWordWeaveForNode(PerbugNode node, {WordWeaveDifficultyConfig? config}) {
    final resolvedConfig = config ??
        const WordWeaveDifficultyConfig(
          letterPoolSize: 9,
          targetWordLength: 5,
          decoyDensity: 0.3,
          branchingOptions: 3,
          retryAllowance: 3,
          dictionaryStrictness: WordWeaveDictionaryStrictness.standardDictionary,
        );
    final session = createWordWeaveSession(
      seed: PuzzleSeedInput(nodeId: node.id, latitude: node.latitude, longitude: node.longitude),
      config: resolvedConfig,
    );
    state = state.copyWith(
      activePuzzleSession: session,
      clearLastPuzzleSummary: true,
      history: ['Generated Word Weave for ${node.label} (${session.instance.difficulty.tier})', ...state.history],
    );
  }

  void startActivePuzzle() {
    final session = state.activePuzzleSession;
    if (session == null || session.status != PuzzleSessionStatus.generated) return;
    state = state.copyWith(
      activePuzzleSession: session.copyWith(
        status: PuzzleSessionStatus.started,
        startedAt: DateTime.now(),
        lifecycleEvents: [
          ...session.lifecycleEvents,
          PuzzleLifecycleEvent(
            name: 'puzzle_started',
            at: DateTime.now(),
            metadata: {'puzzleId': session.instance.id},
          ),
        ],
      ),
    );
  }

  void appendPuzzleLetter(String letter) {
    final session = state.activePuzzleSession;
    if (session == null || session.status == PuzzleSessionStatus.failed || session.status == PuzzleSessionStatus.succeeded) return;
    if (session.currentInput.length >= session.instance.board.targetLength) return;
    state = state.copyWith(activePuzzleSession: session.copyWith(currentInput: '${session.currentInput}$letter'));
  }

  void undoPuzzleLetter() {
    final session = state.activePuzzleSession;
    if (session == null || session.currentInput.isEmpty) return;
    state = state.copyWith(activePuzzleSession: session.copyWith(currentInput: session.currentInput.substring(0, session.currentInput.length - 1)));
  }

  void clearPuzzleInput() {
    final session = state.activePuzzleSession;
    if (session == null) return;
    state = state.copyWith(activePuzzleSession: session.copyWith(currentInput: ''));
  }

  PuzzleResult submitPuzzleInput() {
    final session = state.activePuzzleSession;
    if (session == null) {
      return const PuzzleResult(success: false, reason: 'No active puzzle', metadata: {'kind': 'missing'});
    }
    final validator = WordWeaveValidator();
    final result = validator.validateSubmission(
      board: session.instance.board,
      solution: session.instance.solution,
      input: session.currentInput,
      config: session.config,
    );

    final nextEvents = [
      ...session.lifecycleEvents,
      PuzzleLifecycleEvent(
        name: 'submission_attempted',
        at: DateTime.now(),
        metadata: {
          'input': session.currentInput,
          'success': result.success,
          'reason': result.reason,
        },
      ),
    ];

    if (result.success) {
      final successSession = session.copyWith(
        status: PuzzleSessionStatus.succeeded,
        lifecycleEvents: [
          ...nextEvents,
          PuzzleLifecycleEvent(
            name: 'puzzle_succeeded',
            at: DateTime.now(),
            metadata: {'attemptsUsed': session.attemptsUsed},
          ),
        ],
      );
      state = state.copyWith(
        activePuzzleSession: successSession,
        lastPuzzleSummary: 'Solved ${session.instance.solution.primaryTarget} in ${session.attemptsUsed + 1} attempt(s).',
        history: ['Completed Word Weave at node ${state.currentNode?.label ?? 'Unknown'}', ...state.history],
      );
      return result;
    }

    final nextAttempts = session.attemptsUsed + 1;
    final exhausted = nextAttempts >= session.maxRetries;
    final failedSession = session.copyWith(
      attemptsUsed: nextAttempts,
      currentInput: '',
      status: exhausted ? PuzzleSessionStatus.failed : session.status,
      invalidSubmissions: [...session.invalidSubmissions, result.reason],
      lifecycleEvents: [
        ...nextEvents,
        if (exhausted)
          PuzzleLifecycleEvent(
            name: 'puzzle_failed',
            at: DateTime.now(),
            metadata: {'attemptsUsed': nextAttempts},
          ),
      ],
    );
    state = state.copyWith(
      activePuzzleSession: failedSession,
      lastPuzzleSummary: exhausted ? 'Out of retries. Target was ${session.instance.solution.primaryTarget}.' : null,
    );
    return result;
  }

  void abandonPuzzle() {
    final session = state.activePuzzleSession;
    if (session == null) return;
    final abandoned = session.copyWith(
      status: PuzzleSessionStatus.abandoned,
      lifecycleEvents: [
        ...session.lifecycleEvents,
        PuzzleLifecycleEvent(name: 'puzzle_abandoned', at: DateTime.now(), metadata: {'attemptsUsed': session.attemptsUsed}),
      ],
    );
    state = state.copyWith(activePuzzleSession: abandoned, history: ['Abandoned active Word Weave', ...state.history]);
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
