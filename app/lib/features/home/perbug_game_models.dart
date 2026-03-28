import 'dart:math' as math;

import '../puzzles/grid_path_puzzle.dart';
import '../puzzles/puzzle_framework.dart';
import 'map_discovery_models.dart';

enum PerbugNodeState { available, completed, locked, exhausted, special, futureChallengeReady }

enum PerbugNodeType { encounter, resource, mission, rest, rare, boss, event, support }

enum EncounterType { puzzle, tacticalSkirmish, timedEvent, resourceHarvest, bossBattle, missionChain }

enum EncounterStatus { idle, ready, inProgress, resolved, failed }

class NodeEncounter {
  const NodeEncounter({
    required this.id,
    required this.nodeId,
    required this.type,
    required this.status,
    required this.difficultyTier,
    required this.rewardBundle,
  });

  final String id;
  final String nodeId;
  final EncounterType type;
  final EncounterStatus status;
  final String difficultyTier;
  final RewardBundle rewardBundle;

  NodeEncounter copyWith({EncounterStatus? status, RewardBundle? rewardBundle}) {
    return NodeEncounter(
      id: id,
      nodeId: nodeId,
      type: type,
      status: status ?? this.status,
      difficultyTier: difficultyTier,
      rewardBundle: rewardBundle ?? this.rewardBundle,
    );
  }
}

class RewardBundle {
  const RewardBundle({
    this.xp = 0,
    this.perbug = 0,
    this.resources = const <String, int>{},
    this.energy = 0,
  });

  final int xp;
  final int perbug;
  final Map<String, int> resources;
  final int energy;

  RewardBundle merge(RewardBundle other) {
    final nextResources = <String, int>{...resources};
    for (final entry in other.resources.entries) {
      nextResources.update(entry.key, (value) => value + entry.value, ifAbsent: () => entry.value);
    }
    return RewardBundle(
      xp: xp + other.xp,
      perbug: perbug + other.perbug,
      resources: nextResources,
      energy: energy + other.energy,
    );
  }
}

class SquadUnit {
  const SquadUnit({
    required this.id,
    required this.name,
    required this.power,
    required this.rarity,
    this.isEquipped = false,
  });

  final String id;
  final String name;
  final int power;
  final String rarity;
  final bool isEquipped;

  SquadUnit copyWith({int? power, bool? isEquipped}) {
    return SquadUnit(
      id: id,
      name: name,
      power: power ?? this.power,
      rarity: rarity,
      isEquipped: isEquipped ?? this.isEquipped,
    );
  }
}

class SquadState {
  const SquadState({
    required this.units,
    required this.maxSlots,
  });

  final List<SquadUnit> units;
  final int maxSlots;

  int get equippedPower => units.where((unit) => unit.isEquipped).fold(0, (sum, unit) => sum + unit.power);
}

class ProgressionState {
  const ProgressionState({
    required this.level,
    required this.xp,
    required this.perbug,
    required this.inventory,
  });

  factory ProgressionState.initial() => const ProgressionState(level: 1, xp: 0, perbug: 0, inventory: {'bio_dust': 0, 'signal_shard': 0});

  final int level;
  final int xp;
  final int perbug;
  final Map<String, int> inventory;

  ProgressionState applyRewards(RewardBundle reward) {
    final nextInventory = <String, int>{...inventory};
    for (final entry in reward.resources.entries) {
      nextInventory.update(entry.key, (value) => value + entry.value, ifAbsent: () => entry.value);
    }
    final nextXp = xp + reward.xp;
    final nextLevel = 1 + (nextXp ~/ 120);
    return ProgressionState(level: nextLevel, xp: nextXp, perbug: perbug + reward.perbug, inventory: nextInventory);
  }
}

class PerbugNode {
  const PerbugNode({
    required this.id,
    required this.label,
    required this.latitude,
    required this.longitude,
    required this.region,
    required this.nodeType,
    required this.difficulty,
    required this.state,
    required this.energyReward,
    this.distanceFromCurrentMeters,
  });

  final String id;
  final String label;
  final double latitude;
  final double longitude;
  final String region;
  final PerbugNodeType nodeType;
  final int difficulty;
  final PerbugNodeState state;
  final int energyReward;
  final double? distanceFromCurrentMeters;

  PerbugNode copyWith({
    PerbugNodeState? state,
    double? distanceFromCurrentMeters,
    PerbugNodeType? nodeType,
  }) {
    return PerbugNode(
      id: id,
      label: label,
      latitude: latitude,
      longitude: longitude,
      region: region,
      nodeType: nodeType ?? this.nodeType,
      difficulty: difficulty,
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

class PuzzleNodeProgress {
  const PuzzleNodeProgress({
    required this.completed,
    required this.attemptCount,
    required this.retryCount,
    this.bestDuration,
    this.lastDifficultyTier,
  });

  final bool completed;
  final int attemptCount;
  final int retryCount;
  final Duration? bestDuration;
  final String? lastDifficultyTier;

  PuzzleNodeProgress copyWith({
    bool? completed,
    int? attemptCount,
    int? retryCount,
    Duration? bestDuration,
    bool clearBestDuration = false,
    String? lastDifficultyTier,
    bool clearLastDifficultyTier = false,
  }) {
    return PuzzleNodeProgress(
      completed: completed ?? this.completed,
      attemptCount: attemptCount ?? this.attemptCount,
      retryCount: retryCount ?? this.retryCount,
      bestDuration: clearBestDuration ? null : (bestDuration ?? this.bestDuration),
      lastDifficultyTier: clearLastDifficultyTier ? null : (lastDifficultyTier ?? this.lastDifficultyTier),
    );
  }
}

class GridPathPuzzleSessionState {
  const GridPathPuzzleSessionState({
    required this.session,
    required this.puzzle,
    required this.path,
    required this.status,
    required this.invalidReason,
    required this.remainingTime,
    required this.analytics,
    this.result,
  });

  final PuzzleSession session;
  final GridPathPuzzleInstance puzzle;
  final List<GridPoint> path;
  final PuzzleSessionStatus status;
  final String? invalidReason;
  final Duration? remainingTime;
  final Map<String, Object> analytics;
  final PuzzleResult? result;

  GridPathPuzzleSessionState copyWith({
    PuzzleSession? session,
    List<GridPoint>? path,
    PuzzleSessionStatus? status,
    String? invalidReason,
    bool clearInvalidReason = false,
    Duration? remainingTime,
    bool clearRemainingTime = false,
    Map<String, Object>? analytics,
    PuzzleResult? result,
    bool clearResult = false,
  }) {
    return GridPathPuzzleSessionState(
      session: session ?? this.session,
      puzzle: puzzle,
      path: path ?? this.path,
      status: status ?? this.status,
      invalidReason: clearInvalidReason ? null : (invalidReason ?? this.invalidReason),
      remainingTime: clearRemainingTime ? null : (remainingTime ?? this.remainingTime),
      analytics: analytics ?? this.analytics,
      result: clearResult ? null : (result ?? this.result),
    );
  }
}

class PerbugGameState {
  const PerbugGameState({
    required this.nodes,
    required this.currentNodeId,
    required this.energy,
    required this.maxEnergy,
    required this.maxJumpMeters,
    required this.fixedZoom,
    required this.loading,
    required this.areaLabel,
    required this.visitedNodeIds,
    required this.history,
    required this.progression,
    required this.squad,
    required this.activeEncounter,
    required this.puzzleProgressByNode,
    required this.puzzleSession,
    required this.puzzleTelemetry,
    this.error,
  });

  factory PerbugGameState.initial() => PerbugGameState(
        nodes: const [],
        currentNodeId: null,
        energy: 14,
        maxEnergy: 30,
        maxJumpMeters: 2400,
        fixedZoom: 13,
        loading: false,
        areaLabel: null,
        visitedNodeIds: const {},
        history: const [],
        progression: ProgressionState.initial(),
        squad: const SquadState(
          maxSlots: 3,
          units: [
            SquadUnit(id: 'u-scout', name: 'Scout Midge', power: 8, rarity: 'common', isEquipped: true),
            SquadUnit(id: 'u-tech', name: 'Relay Beetle', power: 6, rarity: 'common', isEquipped: true),
          ],
        ),
        activeEncounter: null,
        puzzleProgressByNode: const {},
        puzzleSession: null,
        puzzleTelemetry: const [],
      );

  final List<PerbugNode> nodes;
  final String? currentNodeId;
  final int energy;
  final int maxEnergy;
  final double maxJumpMeters;
  final double fixedZoom;
  final bool loading;
  final String? areaLabel;
  final Set<String> visitedNodeIds;
  final List<String> history;
  final ProgressionState progression;
  final SquadState squad;
  final NodeEncounter? activeEncounter;
  final Map<String, PuzzleNodeProgress> puzzleProgressByNode;
  final GridPathPuzzleSessionState? puzzleSession;
  final List<Map<String, Object>> puzzleTelemetry;
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
    double? fixedZoom,
    bool? loading,
    String? areaLabel,
    Set<String>? visitedNodeIds,
    List<String>? history,
    ProgressionState? progression,
    SquadState? squad,
    NodeEncounter? activeEncounter,
    bool clearActiveEncounter = false,
    Map<String, PuzzleNodeProgress>? puzzleProgressByNode,
    GridPathPuzzleSessionState? puzzleSession,
    bool clearPuzzleSession = false,
    List<Map<String, Object>>? puzzleTelemetry,
    String? error,
    bool clearError = false,
  }) {
    return PerbugGameState(
      nodes: nodes ?? this.nodes,
      currentNodeId: clearCurrentNode ? null : (currentNodeId ?? this.currentNodeId),
      energy: energy ?? this.energy,
      maxEnergy: maxEnergy ?? this.maxEnergy,
      maxJumpMeters: maxJumpMeters ?? this.maxJumpMeters,
      fixedZoom: fixedZoom ?? this.fixedZoom,
      loading: loading ?? this.loading,
      areaLabel: areaLabel ?? this.areaLabel,
      visitedNodeIds: visitedNodeIds ?? this.visitedNodeIds,
      history: history ?? this.history,
      progression: progression ?? this.progression,
      squad: squad ?? this.squad,
      activeEncounter: clearActiveEncounter ? null : (activeEncounter ?? this.activeEncounter),
      puzzleProgressByNode: puzzleProgressByNode ?? this.puzzleProgressByNode,
      puzzleSession: clearPuzzleSession ? null : (puzzleSession ?? this.puzzleSession),
      puzzleTelemetry: puzzleTelemetry ?? this.puzzleTelemetry,
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

PerbugNodeType deriveNodeTypeFromPin(MapPin pin) {
  final category = pin.category.toLowerCase();
  if (category.contains('park') || category.contains('trail')) return PerbugNodeType.resource;
  if (category.contains('shop') || category.contains('store') || category.contains('market')) return PerbugNodeType.support;
  if (pin.hasCreatorMedia) return PerbugNodeType.rare;
  if (pin.hasReviews) return PerbugNodeType.encounter;
  return PerbugNodeType.mission;
}
