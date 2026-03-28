import 'package:flutter/foundation.dart';

import 'perbug_economy_models.dart';
import 'perbug_game_models.dart';

enum UnlockableType { region, nodeType, objectiveCategory, craftingRecipe, squadSlot, mapOverlay, rareNodeScanner }

enum ObjectiveType { clearNodes, discoverNodes, craftItems, upgradeUnit, completeRareNode, collectResource, unlockRegion }

enum MilestoneType { nodesCleared, regionsUnlocked, rareNodesCleared, rosterPower, resourceCollection }

class ProgressionReward {
  const ProgressionReward({
    this.perbug = 0,
    this.xp = 0,
    this.upgradeCurrency = 0,
    this.resources = const <String, int>{},
    this.unlocks = const <String>[],
  });

  final int perbug;
  final int xp;
  final int upgradeCurrency;
  final Map<String, int> resources;
  final List<String> unlocks;

  RewardBundle toRewardBundle() => RewardBundle(
        xp: xp,
        perbug: perbug,
        upgradeCurrency: upgradeCurrency,
        resources: resources,
      );
}

class ObjectiveProgress {
  const ObjectiveProgress({required this.current, required this.target, required this.claimed});

  final int current;
  final int target;
  final bool claimed;

  bool get isComplete => current >= target;

  ObjectiveProgress copyWith({int? current, int? target, bool? claimed}) {
    return ObjectiveProgress(
      current: current ?? this.current,
      target: target ?? this.target,
      claimed: claimed ?? this.claimed,
    );
  }
}

class DailyObjective {
  const DailyObjective({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.progress,
    required this.reward,
    required this.debug,
  });

  final String id;
  final ObjectiveType type;
  final String title;
  final String description;
  final ObjectiveProgress progress;
  final ProgressionReward reward;
  final Map<String, Object> debug;

  DailyObjective copyWith({ObjectiveProgress? progress}) {
    return DailyObjective(
      id: id,
      type: type,
      title: title,
      description: description,
      progress: progress ?? this.progress,
      reward: reward,
      debug: debug,
    );
  }
}

class DailyObjectiveSet {
  const DailyObjectiveSet({
    required this.dayKey,
    required this.generatedAt,
    required this.refreshAt,
    required this.objectives,
    required this.generationDebug,
  });

  final String dayKey;
  final DateTime generatedAt;
  final DateTime refreshAt;
  final List<DailyObjective> objectives;
  final Map<String, Object> generationDebug;

  DailyObjectiveSet copyWith({List<DailyObjective>? objectives}) {
    return DailyObjectiveSet(
      dayKey: dayKey,
      generatedAt: generatedAt,
      refreshAt: refreshAt,
      objectives: objectives ?? this.objectives,
      generationDebug: generationDebug,
    );
  }
}

class MilestoneProgress {
  const MilestoneProgress({
    required this.id,
    required this.type,
    required this.title,
    required this.target,
    required this.current,
    required this.claimed,
    required this.reward,
  });

  final String id;
  final MilestoneType type;
  final String title;
  final int target;
  final int current;
  final bool claimed;
  final ProgressionReward reward;

  bool get isComplete => current >= target;

  MilestoneProgress copyWith({int? current, bool? claimed}) {
    return MilestoneProgress(
      id: id,
      type: type,
      title: title,
      target: target,
      current: current ?? this.current,
      claimed: claimed ?? this.claimed,
      reward: reward,
    );
  }
}

class CollectionProgress {
  const CollectionProgress({required this.id, required this.label, required this.discovered, required this.total});

  final String id;
  final String label;
  final int discovered;
  final int total;

  double get percent => total == 0 ? 0 : discovered / total;

  CollectionProgress copyWith({int? discovered, int? total}) {
    return CollectionProgress(
      id: id,
      label: label,
      discovered: discovered ?? this.discovered,
      total: total ?? this.total,
    );
  }
}

class UnlockableState {
  const UnlockableState({
    required this.id,
    required this.type,
    required this.label,
    required this.description,
    required this.unlocked,
    required this.requirement,
  });

  final String id;
  final UnlockableType type;
  final String label;
  final String description;
  final bool unlocked;
  final String requirement;

  UnlockableState copyWith({bool? unlocked}) {
    return UnlockableState(
      id: id,
      type: type,
      label: label,
      description: description,
      unlocked: unlocked ?? this.unlocked,
      requirement: requirement,
    );
  }
}

class RareSpawnState {
  const RareSpawnState({
    required this.activeNodeIds,
    required this.lastRolledAt,
    required this.nextRollAt,
    required this.windowMinutes,
    required this.spawnHistory,
  });

  factory RareSpawnState.initial() {
    final now = DateTime.now().toUtc();
    return RareSpawnState(
      activeNodeIds: const {},
      lastRolledAt: now,
      nextRollAt: now.add(const Duration(minutes: 50)),
      windowMinutes: 50,
      spawnHistory: const [],
    );
  }

  final Set<String> activeNodeIds;
  final DateTime lastRolledAt;
  final DateTime nextRollAt;
  final int windowMinutes;
  final List<Map<String, Object>> spawnHistory;

  RareSpawnState copyWith({
    Set<String>? activeNodeIds,
    DateTime? lastRolledAt,
    DateTime? nextRollAt,
    int? windowMinutes,
    List<Map<String, Object>>? spawnHistory,
  }) {
    return RareSpawnState(
      activeNodeIds: activeNodeIds ?? this.activeNodeIds,
      lastRolledAt: lastRolledAt ?? this.lastRolledAt,
      nextRollAt: nextRollAt ?? this.nextRollAt,
      windowMinutes: windowMinutes ?? this.windowMinutes,
      spawnHistory: spawnHistory ?? this.spawnHistory,
    );
  }
}

class WorldExpansionState {
  const WorldExpansionState({
    required this.regionNodeTotals,
    required this.regionNodeCompleted,
    required this.unlockedRegions,
    required this.worldTier,
  });

  factory WorldExpansionState.initial() => const WorldExpansionState(
        regionNodeTotals: <String, int>{},
        regionNodeCompleted: <String, int>{},
        unlockedRegions: <String>{},
        worldTier: 1,
      );

  final Map<String, int> regionNodeTotals;
  final Map<String, int> regionNodeCompleted;
  final Set<String> unlockedRegions;
  final int worldTier;

  WorldExpansionState copyWith({
    Map<String, int>? regionNodeTotals,
    Map<String, int>? regionNodeCompleted,
    Set<String>? unlockedRegions,
    int? worldTier,
  }) {
    return WorldExpansionState(
      regionNodeTotals: regionNodeTotals ?? this.regionNodeTotals,
      regionNodeCompleted: regionNodeCompleted ?? this.regionNodeCompleted,
      unlockedRegions: unlockedRegions ?? this.unlockedRegions,
      worldTier: worldTier ?? this.worldTier,
    );
  }
}

class ReturnLoopState {
  const ReturnLoopState({required this.lastSeenAt, required this.streakDays, required this.recommendedActions});

  final DateTime lastSeenAt;
  final int streakDays;
  final List<String> recommendedActions;

  ReturnLoopState copyWith({DateTime? lastSeenAt, int? streakDays, List<String>? recommendedActions}) {
    return ReturnLoopState(
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
      streakDays: streakDays ?? this.streakDays,
      recommendedActions: recommendedActions ?? this.recommendedActions,
    );
  }
}

class PerbugProgressionState {
  const PerbugProgressionState({
    required this.world,
    required this.daily,
    required this.collections,
    required this.unlockables,
    required this.milestones,
    required this.rareSpawns,
    required this.returnLoop,
    required this.analytics,
  });

  factory PerbugProgressionState.initial() {
    final now = DateTime.now().toUtc();
    return PerbugProgressionState(
      world: WorldExpansionState.initial(),
      daily: DailyObjectiveSet(
        dayKey: _dayKey(now),
        generatedAt: now,
        refreshAt: DateTime.utc(now.year, now.month, now.day + 1),
        objectives: const [],
        generationDebug: const {},
      ),
      collections: const [
        CollectionProgress(id: 'regions', label: 'Regions Discovered', discovered: 0, total: 1),
        CollectionProgress(id: 'node_types', label: 'Node Types Completed', discovered: 0, total: 8),
        CollectionProgress(id: 'rare_nodes', label: 'Rare Nodes Cleared', discovered: 0, total: 12),
        CollectionProgress(id: 'materials', label: 'Materials Found', discovered: 0, total: 6),
        CollectionProgress(id: 'units', label: 'Squad Units Owned', discovered: 0, total: 20),
      ],
      unlockables: const [
        UnlockableState(
          id: 'rare-scanner',
          type: UnlockableType.rareNodeScanner,
          label: 'Rare Node Scanner',
          description: 'Shows active rare anomaly nodes on your board.',
          unlocked: false,
          requirement: 'Reach explorer rank 2',
        ),
        UnlockableState(
          id: 'fourth-squad-slot',
          type: UnlockableType.squadSlot,
          label: '4th Squad Slot',
          description: 'Adds one more active slot in squad loadout.',
          unlocked: false,
          requirement: 'Complete 20 nodes',
        ),
      ],
      milestones: const [
        MilestoneProgress(
          id: 'nodes-10',
          type: MilestoneType.nodesCleared,
          title: 'Clear 10 Nodes',
          target: 10,
          current: 0,
          claimed: false,
          reward: ProgressionReward(perbug: 24, xp: 35, upgradeCurrency: 6),
        ),
        MilestoneProgress(
          id: 'regions-3',
          type: MilestoneType.regionsUnlocked,
          title: 'Unlock 3 Regions',
          target: 3,
          current: 0,
          claimed: false,
          reward: ProgressionReward(perbug: 40, xp: 50, resources: {'relic_shard': 2}),
        ),
      ],
      rareSpawns: RareSpawnState.initial(),
      returnLoop: ReturnLoopState(lastSeenAt: now, streakDays: 1, recommendedActions: const []),
      analytics: const [],
    );
  }

  final WorldExpansionState world;
  final DailyObjectiveSet daily;
  final List<CollectionProgress> collections;
  final List<UnlockableState> unlockables;
  final List<MilestoneProgress> milestones;
  final RareSpawnState rareSpawns;
  final ReturnLoopState returnLoop;
  final List<Map<String, Object>> analytics;

  PerbugProgressionState copyWith({
    WorldExpansionState? world,
    DailyObjectiveSet? daily,
    List<CollectionProgress>? collections,
    List<UnlockableState>? unlockables,
    List<MilestoneProgress>? milestones,
    RareSpawnState? rareSpawns,
    ReturnLoopState? returnLoop,
    List<Map<String, Object>>? analytics,
  }) {
    return PerbugProgressionState(
      world: world ?? this.world,
      daily: daily ?? this.daily,
      collections: collections ?? this.collections,
      unlockables: unlockables ?? this.unlockables,
      milestones: milestones ?? this.milestones,
      rareSpawns: rareSpawns ?? this.rareSpawns,
      returnLoop: returnLoop ?? this.returnLoop,
      analytics: analytics ?? this.analytics,
    );
  }
}

class ProgressionUpdateResult {
  const ProgressionUpdateResult({required this.progression, required this.reward, required this.log});

  final PerbugProgressionState progression;
  final RewardBundle reward;
  final String log;
}

class PerbugProgressionEngine {
  const PerbugProgressionEngine();

  ProgressionUpdateResult syncWorld({
    required PerbugProgressionState current,
    required List<PerbugNode> nodes,
    required Set<String> visitedNodeIds,
    required SquadState squad,
    required Inventory inventory,
    required DateTime now,
  }) {
    final totals = <String, int>{};
    final completed = <String, int>{};
    final nodeTypeCompleted = <PerbugNodeType>{};
    final discoveredRegions = <String>{};
    for (final node in nodes) {
      totals.update(node.region, (v) => v + 1, ifAbsent: () => 1);
      if (visitedNodeIds.contains(node.id)) {
        completed.update(node.region, (v) => v + 1, ifAbsent: () => 1);
        nodeTypeCompleted.add(node.nodeType);
        discoveredRegions.add(node.region);
      }
    }
    var tier = current.world.worldTier;
    if (visitedNodeIds.length >= 8) tier = 2;
    if (visitedNodeIds.length >= 18) tier = 3;

    final collections = _patchCollections(
      current.collections,
      regions: discoveredRegions.length,
      nodeTypes: nodeTypeCompleted.length,
      rareClears: nodes.where((n) => visitedNodeIds.contains(n.id) && n.nodeType == PerbugNodeType.rare).length,
      materialCount: inventory.stacks.values.where((v) => v > 0).length,
      units: squad.roster.length,
    );

    var milestones = current.milestones;
    milestones = _setMilestoneCurrent(milestones, MilestoneType.nodesCleared, visitedNodeIds.length);
    milestones = _setMilestoneCurrent(milestones, MilestoneType.regionsUnlocked, discoveredRegions.length);

    final unlockables = current.unlockables
        .map((u) {
          if (u.id == 'rare-scanner' && tier >= 2) return u.copyWith(unlocked: true);
          if (u.id == 'fourth-squad-slot' && visitedNodeIds.length >= 20) return u.copyWith(unlocked: true);
          return u;
        })
        .toList(growable: false);

    final rolledRare = _rollRareSpawns(current: current.rareSpawns, nodes: nodes, now: now);
    final dailies = _refreshDailyIfNeeded(current.daily, now, tier, discoveredRegions.length);
    final recommendations = _recommend(
      dailies.objectives,
      unlockables,
      milestones,
      rolledRare.activeNodeIds,
      discoveredRegions.length,
    );

    return ProgressionUpdateResult(
      progression: current.copyWith(
        world: current.world.copyWith(
          regionNodeTotals: totals,
          regionNodeCompleted: completed,
          unlockedRegions: discoveredRegions,
          worldTier: tier,
        ),
        collections: collections,
        milestones: milestones,
        unlockables: unlockables,
        rareSpawns: rolledRare,
        daily: dailies,
        returnLoop: current.returnLoop.copyWith(lastSeenAt: now, recommendedActions: recommendations),
        analytics: [
          {
            'event': 'progression_sync',
            'world_tier': tier,
            'nodes_cleared': visitedNodeIds.length,
            'regions_unlocked': discoveredRegions.length,
            'rare_active': rolledRare.activeNodeIds.length,
            'at': now.toIso8601String(),
          },
          ...current.analytics,
        ],
      ),
      reward: const RewardBundle(),
      log: 'Synced progression: ${visitedNodeIds.length} nodes, ${discoveredRegions.length} regions.',
    );
  }

  ProgressionUpdateResult onAction({
    required PerbugProgressionState current,
    required ObjectiveType type,
    required int amount,
    required DateTime now,
  }) {
    var dailies = _refreshDailyIfNeeded(current.daily, now, current.world.worldTier, current.world.unlockedRegions.length);
    dailies = dailies.copyWith(
      objectives: dailies.objectives
          .map((o) => o.type == type ? o.copyWith(progress: o.progress.copyWith(current: o.progress.current + amount)) : o)
          .toList(growable: false),
    );
    return ProgressionUpdateResult(progression: current.copyWith(daily: dailies), reward: const RewardBundle(), log: 'Objective progress updated.');
  }

  ProgressionUpdateResult claimObjective({required PerbugProgressionState current, required String objectiveId}) {
    RewardBundle bundle = const RewardBundle();
    final objectives = current.daily.objectives.map((o) {
      if (o.id != objectiveId) return o;
      if (!o.progress.isComplete || o.progress.claimed) return o;
      bundle = bundle.merge(o.reward.toRewardBundle());
      return o.copyWith(progress: o.progress.copyWith(claimed: true));
    }).toList(growable: false);
    return ProgressionUpdateResult(
      progression: current.copyWith(daily: current.daily.copyWith(objectives: objectives)),
      reward: bundle,
      log: bundle.perbug > 0 || bundle.xp > 0 ? 'Objective reward claimed.' : 'Objective not claimable.',
    );
  }

  ProgressionUpdateResult claimMilestone({required PerbugProgressionState current, required String milestoneId}) {
    RewardBundle bundle = const RewardBundle();
    final milestones = current.milestones.map((m) {
      if (m.id != milestoneId) return m;
      if (!m.isComplete || m.claimed) return m;
      bundle = bundle.merge(m.reward.toRewardBundle());
      return m.copyWith(claimed: true);
    }).toList(growable: false);
    return ProgressionUpdateResult(progression: current.copyWith(milestones: milestones), reward: bundle, log: 'Milestone claim processed.');
  }

  DailyObjectiveSet _refreshDailyIfNeeded(DailyObjectiveSet set, DateTime now, int tier, int unlockedRegions) {
    if (now.isBefore(set.refreshAt) && set.objectives.isNotEmpty) return set;
    final day = _dayKey(now);
    return DailyObjectiveSet(
      dayKey: day,
      generatedAt: now,
      refreshAt: DateTime.utc(now.year, now.month, now.day + 1),
      objectives: [
        DailyObjective(
          id: '$day-clear',
          type: ObjectiveType.clearNodes,
          title: 'Clear frontier nodes',
          description: 'Clear ${2 + tier} nodes to push your frontier.',
          progress: ObjectiveProgress(current: 0, target: 2 + tier, claimed: false),
          reward: ProgressionReward(perbug: 12 + tier * 2, xp: 20, resources: {'ore': 2}),
          debug: {'pool': 'frontier', 'tier': tier},
        ),
        DailyObjective(
          id: '$day-craft',
          type: ObjectiveType.craftItems,
          title: 'Craft tactical supply',
          description: 'Craft 1 item to sustain squad momentum.',
          progress: const ObjectiveProgress(current: 0, target: 1, claimed: false),
          reward: const ProgressionReward(perbug: 10, xp: 14, resources: {'upgrade_module': 1}),
          debug: const {'pool': 'economy'},
        ),
        DailyObjective(
          id: '$day-region',
          type: ObjectiveType.discoverNodes,
          title: 'Scout new points',
          description: unlockedRegions < 2 ? 'Discover 2 new nodes in your starting region.' : 'Discover 1 node in a newer region.',
          progress: const ObjectiveProgress(current: 0, target: 2, claimed: false),
          reward: const ProgressionReward(perbug: 8, xp: 16, upgradeCurrency: 3),
          debug: {'pool': 'discovery', 'regions_unlocked': unlockedRegions},
        ),
      ],
      generationDebug: {'world_tier': tier, 'regions': unlockedRegions},
    );
  }

  List<CollectionProgress> _patchCollections(
    List<CollectionProgress> values, {
    required int regions,
    required int nodeTypes,
    required int rareClears,
    required int materialCount,
    required int units,
  }) {
    return values
        .map((collection) {
          switch (collection.id) {
            case 'regions':
              return collection.copyWith(discovered: regions, total: collection.total < regions ? regions : collection.total);
            case 'node_types':
              return collection.copyWith(discovered: nodeTypes);
            case 'rare_nodes':
              return collection.copyWith(discovered: rareClears);
            case 'materials':
              return collection.copyWith(discovered: materialCount);
            case 'units':
              return collection.copyWith(discovered: units);
            default:
              return collection;
          }
        })
        .toList(growable: false);
  }

  List<MilestoneProgress> _setMilestoneCurrent(List<MilestoneProgress> items, MilestoneType type, int value) {
    return items.map((m) => m.type == type ? m.copyWith(current: value) : m).toList(growable: false);
  }

  RareSpawnState _rollRareSpawns({required RareSpawnState current, required List<PerbugNode> nodes, required DateTime now}) {
    if (now.isBefore(current.nextRollAt) && current.activeNodeIds.isNotEmpty) return current;
    final candidates = nodes.where((n) => n.nodeType == PerbugNodeType.rare || n.rarityScore >= 1.2).take(4).toList(growable: false);
    final ids = candidates.map((n) => n.id).toSet();
    return current.copyWith(
      activeNodeIds: ids,
      lastRolledAt: now,
      nextRollAt: now.add(Duration(minutes: current.windowMinutes)),
      spawnHistory: [
        {
          'at': now.toIso8601String(),
          'active': ids.length,
        },
        ...current.spawnHistory,
      ],
    );
  }

  List<String> _recommend(
    List<DailyObjective> objectives,
    List<UnlockableState> unlockables,
    List<MilestoneProgress> milestones,
    Set<String> rareIds,
    int regions,
  ) {
    final tips = <String>[];
    final pendingObjective = objectives.where((o) => !o.progress.claimed).toList(growable: false);
    if (pendingObjective.isNotEmpty) {
      tips.add('Complete daily: ${pendingObjective.first.title} (${pendingObjective.first.progress.current}/${pendingObjective.first.progress.target}).');
    }
    if (rareIds.isNotEmpty) tips.add('Rare anomalies active (${rareIds.length}). Clear one before rotation.');
    final nextUnlock = unlockables.firstWhere((u) => !u.unlocked, orElse: () => unlockables.first);
    if (!nextUnlock.unlocked) tips.add('Work toward unlock: ${nextUnlock.label}. ${nextUnlock.requirement}.');
    final nextMilestone = milestones.where((m) => !m.claimed).toList(growable: false);
    if (nextMilestone.isNotEmpty) {
      final m = nextMilestone.first;
      tips.add('Milestone: ${m.title} (${m.current}/${m.target}).');
    }
    if (regions <= 1) tips.add('Push the map frontier to open a second region cluster.');
    return tips;
  }
}

String _dayKey(DateTime value) => '${value.year.toString().padLeft(4, '0')}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';

@visibleForTesting
PerbugProgressionEngine get progressionEngineForTests => const PerbugProgressionEngine();
