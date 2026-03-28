import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'perbug_game_models.dart';
import 'puzzles/pattern_recall/pattern_recall_generator.dart';
import 'puzzles/pattern_recall/pattern_recall_models.dart';
import 'puzzles/pattern_recall/pattern_recall_validator.dart';
import 'puzzles/perbug_puzzle_framework.dart';

final perbugGameControllerProvider = StateNotifierProvider<PerbugGameController, PerbugGameState>((ref) {
  return PerbugGameController(ref);
});

class PerbugGameController extends StateNotifier<PerbugGameState> {
  PerbugGameController(this._ref) : super(PerbugGameState.initial());

  final Ref _ref;
  final PatternRecallGenerator _patternGenerator = const PatternRecallGenerator();
  final PatternRecallValidator _patternValidator = const PatternRecallValidator();

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

  PatternRecallSession? launchPatternRecallForCurrentNode({Map<String, Object> tuning = const {}}) {
    final active = state.activePatternRecall;
    if (active != null && !active.phase.isTerminal) {
      return active;
    }
    final node = state.currentNode;
    if (node == null) return null;
    final seedInput = PuzzleSeedInput(nodeId: node.id, latitude: node.latitude, longitude: node.longitude);
    final instance = _patternGenerator.generate(
      node: PuzzleNodeContext(
        nodeId: node.id,
        latitude: node.latitude,
        longitude: node.longitude,
        region: node.region,
      ),
      seedInput: seedInput,
      tuning: tuning,
    );
    final now = DateTime.now().toUtc();
    final session = PatternRecallSession(
      instance: instance,
      phase: PatternRecallPhase.briefing,
      currentPreviewStep: -1,
      input: const [],
      startedAt: now,
      retries: 0,
      mistakes: 0,
      lifecycle: [
        PuzzleLifecycleEvent(
          name: 'puzzle_generated',
          timestamp: now,
          payload: {
            'node_id': node.id,
            'type': 'pattern_recall',
            'difficulty_score': instance.difficulty.score,
            'difficulty_tier': instance.difficulty.tier,
            'sequence_length': instance.knobs.sequenceLength,
            'symbol_variety': instance.knobs.symbolVariety,
            'preview_duration_ms': instance.knobs.previewDurationMs,
            'distraction_count': instance.knobs.distractionCount,
            'mirrored': instance.isMirrored,
            'reversed': instance.isReversed,
            'tolerance': instance.knobs.errorTolerance,
            ...instance.debugMetadata(),
          },
        ),
      ],
    );
    state = state.copyWith(
      activePatternRecall: session,
      puzzleEvents: [...state.puzzleEvents, {'name': 'puzzle_generated', 'node_id': node.id}],
    );
    return session;
  }

  void startPatternPreview() {
    final active = state.activePatternRecall;
    if (active == null) return;
    final now = DateTime.now().toUtc();
    state = state.copyWith(
      activePatternRecall: active.copyWith(
        phase: PatternRecallPhase.preview,
        currentPreviewStep: 0,
        lifecycle: [
          ...active.lifecycle,
          PuzzleLifecycleEvent(name: 'puzzle_started', timestamp: now, payload: {'node_id': active.instance.seedInput.nodeId}),
        ],
      ),
    );
  }

  void setPatternPreviewStep(int step) {
    final active = state.activePatternRecall;
    if (active == null || active.phase != PatternRecallPhase.preview) return;
    final inBounds = step >= 0 && step < active.instance.generatedSequence.length;
    if (!inBounds) return;
    state = state.copyWith(activePatternRecall: active.copyWith(currentPreviewStep: step));
  }

  void completePatternPreview() {
    final active = state.activePatternRecall;
    if (active == null) return;
    final now = DateTime.now().toUtc();
    state = state.copyWith(
      activePatternRecall: active.copyWith(
        phase: PatternRecallPhase.recall,
        currentPreviewStep: -1,
        lifecycle: [
          ...active.lifecycle,
          PuzzleLifecycleEvent(
            name: 'preview_completed',
            timestamp: now,
            payload: {'node_id': active.instance.seedInput.nodeId, 'steps': active.instance.generatedSequence.length},
          ),
        ],
      ),
      puzzleEvents: [...state.puzzleEvents, {'name': 'preview_completed', 'node_id': active.instance.seedInput.nodeId}],
    );
  }

  void inputPatternSymbol(int symbolIndex) {
    final active = state.activePatternRecall;
    if (active == null || active.phase != PatternRecallPhase.recall) return;
    final updatedInput = [...active.input, symbolIndex];
    final expectedAt = active.instance.expectedAnswer[updatedInput.length - 1];
    final mistakes = active.mistakes + (expectedAt == symbolIndex ? 0 : 1);
    final updated = active.copyWith(input: updatedInput, mistakes: mistakes);

    if (updatedInput.length < active.instance.expectedAnswer.length) {
      state = state.copyWith(activePatternRecall: updated);
      return;
    }

    final result = _patternValidator.validate(
      instance: active.instance,
      input: updatedInput,
      elapsed: DateTime.now().toUtc().difference(active.startedAt),
    );
    final isSuccess = result.success;
    final now = DateTime.now().toUtc();
    final finalSession = updated.copyWith(
      phase: isSuccess ? PatternRecallPhase.success : PatternRecallPhase.failure,
      completedAt: now,
      lifecycle: [
        ...updated.lifecycle,
        PuzzleLifecycleEvent(
          name: isSuccess ? 'puzzle_succeeded' : 'puzzle_failed',
          timestamp: now,
          payload: {
            'node_id': active.instance.seedInput.nodeId,
            'mistakes': result.mistakes,
            'elapsed_ms': result.elapsed.inMilliseconds,
            ...result.analytics,
          },
        ),
      ],
    );

    final gained = isSuccess ? 2 : 0;
    state = state.copyWith(
      activePatternRecall: finalSession,
      energy: (state.energy + gained).clamp(0, state.maxEnergy),
      history: [
        isSuccess
            ? 'Solved Pattern Recall at ${state.currentNode?.label ?? 'node'} (+$gained energy)'
            : 'Failed Pattern Recall at ${state.currentNode?.label ?? 'node'}',
        ...state.history,
      ],
      puzzleEvents: [
        ...state.puzzleEvents,
        {
          'name': isSuccess ? 'puzzle_succeeded' : 'puzzle_failed',
          'node_id': active.instance.seedInput.nodeId,
          'mistakes': result.mistakes,
          'elapsed_ms': result.elapsed.inMilliseconds,
          'difficulty_score': active.instance.difficulty.score,
        },
      ],
    );
  }

  void clearPatternInput() {
    final active = state.activePatternRecall;
    if (active == null || active.phase != PatternRecallPhase.recall) return;
    state = state.copyWith(activePatternRecall: active.copyWith(input: const []));
  }

  void retryPatternRecall() {
    final active = state.activePatternRecall;
    if (active == null) return;
    final now = DateTime.now().toUtc();
    state = state.copyWith(
      activePatternRecall: active.copyWith(
        phase: PatternRecallPhase.briefing,
        currentPreviewStep: -1,
        input: const [],
        mistakes: 0,
        clearCompletedAt: true,
        retries: active.retries + 1,
        startedAt: now,
        lifecycle: [
          ...active.lifecycle,
          PuzzleLifecycleEvent(name: 'puzzle_retry', timestamp: now, payload: {'retry': active.retries + 1}),
        ],
      ),
    );
  }

  void abandonPatternRecall() {
    final active = state.activePatternRecall;
    if (active == null) return;
    final now = DateTime.now().toUtc();
    state = state.copyWith(
      activePatternRecall: active.copyWith(
        phase: PatternRecallPhase.abandoned,
        completedAt: now,
        lifecycle: [
          ...active.lifecycle,
          PuzzleLifecycleEvent(name: 'puzzle_abandoned', timestamp: now, payload: {'node_id': active.instance.seedInput.nodeId}),
        ],
      ),
      puzzleEvents: [...state.puzzleEvents, {'name': 'puzzle_abandoned', 'node_id': active.instance.seedInput.nodeId}],
    );
  }

  void closePatternRecall() {
    state = state.copyWith(clearActivePatternRecall: true);
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
