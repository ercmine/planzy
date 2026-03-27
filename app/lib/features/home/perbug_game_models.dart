import 'dart:math' as math;

import 'map_discovery_models.dart';

enum PerbugNodeState { available, completed, locked, exhausted, special, futureChallengeReady }

class PerbugNode {
  const PerbugNode({
    required this.id,
    required this.label,
    required this.latitude,
    required this.longitude,
    required this.region,
    required this.state,
    required this.energyReward,
    this.distanceFromCurrentMeters,
  });

  final String id;
  final String label;
  final double latitude;
  final double longitude;
  final String region;
  final PerbugNodeState state;
  final int energyReward;
  final double? distanceFromCurrentMeters;

  PerbugNode copyWith({
    PerbugNodeState? state,
    double? distanceFromCurrentMeters,
  }) {
    return PerbugNode(
      id: id,
      label: label,
      latitude: latitude,
      longitude: longitude,
      region: region,
      state: state ?? this.state,
      energyReward: energyReward,
      distanceFromCurrentMeters: distanceFromCurrentMeters ?? this.distanceFromCurrentMeters,
    );
  }
}

class PerbugMoveCandidate {
  const PerbugMoveCandidate({
    required this.node,
    required this.isReachable,
    required this.energyCost,
    required this.reason,
  });

  final PerbugNode node;
  final bool isReachable;
  final int energyCost;
  final String reason;
}

class PerbugGameState {
  const PerbugGameState({
    required this.nodes,
    required this.currentNodeId,
    required this.energy,
    required this.maxEnergy,
    required this.maxJumpMeters,
    required this.loading,
    required this.visitedNodeIds,
    required this.history,
    this.error,
  });

  factory PerbugGameState.initial() => const PerbugGameState(
        nodes: [],
        currentNodeId: null,
        energy: 14,
        maxEnergy: 30,
        maxJumpMeters: 2400,
        loading: false,
        visitedNodeIds: {},
        history: [],
      );

  final List<PerbugNode> nodes;
  final String? currentNodeId;
  final int energy;
  final int maxEnergy;
  final double maxJumpMeters;
  final bool loading;
  final Set<String> visitedNodeIds;
  final List<String> history;
  final String? error;

  PerbugNode? get currentNode {
    final id = currentNodeId;
    if (id == null) return null;
    for (final node in nodes) {
      if (node.id == id) return node;
    }
    return null;
  }

  PerbugGameState copyWith({
    List<PerbugNode>? nodes,
    String? currentNodeId,
    bool clearCurrentNode = false,
    int? energy,
    int? maxEnergy,
    double? maxJumpMeters,
    bool? loading,
    Set<String>? visitedNodeIds,
    List<String>? history,
    String? error,
    bool clearError = false,
  }) {
    return PerbugGameState(
      nodes: nodes ?? this.nodes,
      currentNodeId: clearCurrentNode ? null : (currentNodeId ?? this.currentNodeId),
      energy: energy ?? this.energy,
      maxEnergy: maxEnergy ?? this.maxEnergy,
      maxJumpMeters: maxJumpMeters ?? this.maxJumpMeters,
      loading: loading ?? this.loading,
      visitedNodeIds: visitedNodeIds ?? this.visitedNodeIds,
      history: history ?? this.history,
      error: clearError ? null : (error ?? this.error),
    );
  }

  List<PerbugMoveCandidate> reachableMoves() {
    final current = currentNode;
    if (current == null) return const [];

    final results = <PerbugMoveCandidate>[];
    for (final node in nodes) {
      if (node.id == current.id) continue;
      final distance = haversineMeters(current.latitude, current.longitude, node.latitude, node.longitude);
      final energyCost = math.max(2, (distance / 450).round());
      final inRange = distance <= maxJumpMeters;
      final hasEnergy = energy >= energyCost;
      final reachable = inRange && hasEnergy;
      final reason = reachable
          ? 'Reachable'
          : !inRange
              ? 'Out of range'
              : 'Not enough energy';
      results.add(
        PerbugMoveCandidate(
          node: node.copyWith(distanceFromCurrentMeters: distance),
          isReachable: reachable,
          energyCost: energyCost,
          reason: reason,
        ),
      );
    }

    results.sort((a, b) {
      final aDistance = a.node.distanceFromCurrentMeters ?? 0;
      final bDistance = b.node.distanceFromCurrentMeters ?? 0;
      return aDistance.compareTo(bDistance);
    });
    return results;
  }
}

double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
  const earthRadius = 6371000;
  final dLat = _toRad(lat2 - lat1);
  final dLon = _toRad(lon2 - lon1);
  final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
      math.cos(_toRad(lat1)) * math.cos(_toRad(lat2)) * math.sin(dLon / 2) * math.sin(dLon / 2);
  final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  return earthRadius * c;
}

double _toRad(double degree) => degree * (math.pi / 180);

PerbugNodeState deriveNodeStateFromPin(MapPin pin) {
  if (pin.hasCreatorMedia && pin.hasReviews) return PerbugNodeState.special;
  if (pin.hasReviews) return PerbugNodeState.futureChallengeReady;
  return PerbugNodeState.available;
}
