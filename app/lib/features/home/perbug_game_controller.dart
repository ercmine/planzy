import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/location/location_controller.dart';
import 'map_discovery_clients.dart';
import 'map_discovery_models.dart';
import 'map_discovery_tab.dart' show mapGeoClientProvider;
import 'perbug_game_models.dart';

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
