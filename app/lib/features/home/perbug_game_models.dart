import 'dart:math' as math;

import '../puzzles/grid_path_puzzle.dart';
import '../puzzles/puzzle_framework.dart';
import 'map_discovery_models.dart';

enum PerbugNodeState { available, completed, locked, exhausted, special, futureChallengeReady }

enum PerbugNodeType { encounter, resource, mission, shop, rare, boss, rest, event }

enum EncounterType { puzzle, tacticalSkirmish, timedEvent, resourceHarvest, bossBattle, missionChain }

enum EncounterStatus { idle, ready, inProgress, resolved, failed }

enum UnitRole { tank, scout, striker, support, engineer, caster, controller, assassin }

enum UnitClass { mech, bio, arcane, rogue, drone, sentinel, tactician }

enum UnitRarity { common, uncommon, rare, epic, legendary }

enum UnitOwnershipSource { starter, earned, crafted, rewarded, event, nftBacked, promoted }

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
    this.unitXp = 0,
    this.unitUnlocks = const <String>[],
    this.upgradeCurrency = 0,
  });

  final int xp;
  final int perbug;
  final Map<String, int> resources;
  final int energy;
  final int unitXp;
  final List<String> unitUnlocks;
  final int upgradeCurrency;

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
      unitXp: unitXp + other.unitXp,
      unitUnlocks: [...unitUnlocks, ...other.unitUnlocks],
      upgradeCurrency: upgradeCurrency + other.upgradeCurrency,
    );
  }
}

class UnitStats {
  const UnitStats({
    required this.attack,
    required this.defense,
    required this.speed,
    required this.utility,
    required this.energyEfficiency,
    required this.resilience,
    required this.initiative,
    this.specialty = const <String, int>{},
  });

  final int attack;
  final int defense;
  final int speed;
  final int utility;
  final int energyEfficiency;
  final int resilience;
  final int initiative;
  final Map<String, int> specialty;

  UnitStats operator +(UnitStats other) {
    final nextSpecialty = <String, int>{...specialty};
    for (final entry in other.specialty.entries) {
      nextSpecialty.update(entry.key, (v) => v + entry.value, ifAbsent: () => entry.value);
    }
    return UnitStats(
      attack: attack + other.attack,
      defense: defense + other.defense,
      speed: speed + other.speed,
      utility: utility + other.utility,
      energyEfficiency: energyEfficiency + other.energyEfficiency,
      resilience: resilience + other.resilience,
      initiative: initiative + other.initiative,
      specialty: nextSpecialty,
    );
  }

  UnitStats scale(double factor) {
    return UnitStats(
      attack: (attack * factor).round(),
      defense: (defense * factor).round(),
      speed: (speed * factor).round(),
      utility: (utility * factor).round(),
      energyEfficiency: (energyEfficiency * factor).round(),
      resilience: (resilience * factor).round(),
      initiative: (initiative * factor).round(),
      specialty: {
        for (final entry in specialty.entries) entry.key: (entry.value * factor).round(),
      },
    );
  }

  double get powerScore =>
      attack * 1.25 + defense * 1.1 + speed * 0.85 + utility * 0.75 + energyEfficiency * 0.7 + resilience * 1.0 + initiative * 0.8;
}

class UnitUpgradeNode {
  const UnitUpgradeNode({
    required this.id,
    required this.title,
    required this.description,
    required this.statBonus,
    required this.levelRequirement,
    required this.currencyCost,
  });

  final String id;
  final String title;
  final String description;
  final UnitStats statBonus;
  final int levelRequirement;
  final int currencyCost;
}

class UnitProgression {
  const UnitProgression({
    required this.level,
    required this.xp,
    required this.starRank,
    required this.promotionTier,
    required this.unlockedUpgradeIds,
  });

  factory UnitProgression.initial() => const UnitProgression(level: 1, xp: 0, starRank: 1, promotionTier: 0, unlockedUpgradeIds: <String>{});

  final int level;
  final int xp;
  final int starRank;
  final int promotionTier;
  final Set<String> unlockedUpgradeIds;

  int xpToNextLevel() => 100 + (level - 1) * 60;

  UnitProgression applyXp(int gained) {
    var nextXp = xp + gained;
    var nextLevel = level;
    while (nextXp >= (100 + (nextLevel - 1) * 60) && nextLevel < maxLevelForTier) {
      nextXp -= (100 + (nextLevel - 1) * 60);
      nextLevel += 1;
    }
    return UnitProgression(
      level: nextLevel,
      xp: nextXp,
      starRank: starRank,
      promotionTier: promotionTier,
      unlockedUpgradeIds: unlockedUpgradeIds,
    );
  }

  int get maxLevelForTier => 10 + (promotionTier * 10);

  UnitProgression unlockUpgrade(String upgradeId) {
    return UnitProgression(
      level: level,
      xp: xp,
      starRank: starRank,
      promotionTier: promotionTier,
      unlockedUpgradeIds: {...unlockedUpgradeIds, upgradeId},
    );
  }
}

class UnitCosmetics {
  const UnitCosmetics({
    this.skinId = 'default',
    this.variant = 'base',
    this.frame = 'standard',
  });

  final String skinId;
  final String variant;
  final String frame;
}

class UnitNftLink {
  const UnitNftLink({
    required this.chain,
    required this.contract,
    required this.tokenId,
    this.provenance,
  });

  final String chain;
  final String contract;
  final String tokenId;
  final String? provenance;
}

class PerbugUnit {
  const PerbugUnit({
    required this.id,
    required this.templateId,
    required this.name,
    required this.lore,
    required this.unitClass,
    required this.role,
    required this.rarity,
    required this.ownershipSource,
    required this.baseStats,
    required this.progression,
    required this.upgradePath,
    this.cosmetics = const UnitCosmetics(),
    this.nftLink,
  });

  final String id;
  final String templateId;
  final String name;
  final String lore;
  final UnitClass unitClass;
  final UnitRole role;
  final UnitRarity rarity;
  final UnitOwnershipSource ownershipSource;
  final UnitStats baseStats;
  final UnitProgression progression;
  final List<UnitUpgradeNode> upgradePath;
  final UnitCosmetics cosmetics;
  final UnitNftLink? nftLink;

  double get _rarityModifier => switch (rarity) {
        UnitRarity.common => 1.0,
        UnitRarity.uncommon => 1.06,
        UnitRarity.rare => 1.14,
        UnitRarity.epic => 1.24,
        UnitRarity.legendary => 1.36,
      };

  UnitStats get effectiveStats {
    final levelFactor = 1.0 + ((progression.level - 1) * 0.07);
    final promotedFactor = 1.0 + (progression.promotionTier * 0.12);
    final unlockedUpgrades = upgradePath.where((node) => progression.unlockedUpgradeIds.contains(node.id));
    final bonus = unlockedUpgrades.fold(
      const UnitStats(
        attack: 0,
        defense: 0,
        speed: 0,
        utility: 0,
        energyEfficiency: 0,
        resilience: 0,
        initiative: 0,
      ),
      (acc, node) => acc + node.statBonus,
    );
    return (baseStats + bonus).scale(levelFactor * _rarityModifier * promotedFactor);
  }

  int get power => effectiveStats.powerScore.round();

  PerbugUnit copyWith({UnitProgression? progression, UnitCosmetics? cosmetics, UnitNftLink? nftLink, bool clearNftLink = false}) {
    return PerbugUnit(
      id: id,
      templateId: templateId,
      name: name,
      lore: lore,
      unitClass: unitClass,
      role: role,
      rarity: rarity,
      ownershipSource: ownershipSource,
      baseStats: baseStats,
      progression: progression ?? this.progression,
      upgradePath: upgradePath,
      cosmetics: cosmetics ?? this.cosmetics,
      nftLink: clearNftLink ? null : (nftLink ?? this.nftLink),
    );
  }
}

class SquadLoadout {
  const SquadLoadout({required this.maxSlots, required this.unitIdsBySlot});

  final int maxSlots;
  final List<String?> unitIdsBySlot;

  Set<String> get assignedIds => unitIdsBySlot.whereType<String>().toSet();
}

class EncounterPowerSummary {
  const EncounterPowerSummary({
    required this.totalPower,
    required this.avgLevel,
    required this.roleCoverage,
    required this.offense,
    required this.defense,
    required this.utility,
    required this.rarityBreakdown,
  });

  final int totalPower;
  final double avgLevel;
  final Map<UnitRole, int> roleCoverage;
  final int offense;
  final int defense;
  final int utility;
  final Map<UnitRarity, int> rarityBreakdown;
}

class SquadState {
  const SquadState({required this.roster, required this.activeSquad});

  final List<PerbugUnit> roster;
  final SquadLoadout activeSquad;

  List<PerbugUnit> get activeUnits {
    final byId = {for (final unit in roster) unit.id: unit};
    return activeSquad.unitIdsBySlot.map((id) => id == null ? null : byId[id]).whereType<PerbugUnit>().toList(growable: false);
  }

  int get maxSlots => activeSquad.maxSlots;

  int get equippedPower => summarizePower().totalPower;

  bool get isEncounterReady => activeUnits.isNotEmpty;

  EncounterPowerSummary summarizePower() {
    final units = activeUnits;
    if (units.isEmpty) {
      return const EncounterPowerSummary(
        totalPower: 0,
        avgLevel: 0,
        roleCoverage: {},
        offense: 0,
        defense: 0,
        utility: 0,
        rarityBreakdown: {},
      );
    }
    final roles = <UnitRole, int>{};
    final rarities = <UnitRarity, int>{};
    var power = 0;
    var levels = 0;
    var offense = 0;
    var defense = 0;
    var utility = 0;
    for (final unit in units) {
      roles.update(unit.role, (v) => v + 1, ifAbsent: () => 1);
      rarities.update(unit.rarity, (v) => v + 1, ifAbsent: () => 1);
      final stats = unit.effectiveStats;
      power += unit.power;
      levels += unit.progression.level;
      offense += stats.attack + stats.initiative;
      defense += stats.defense + stats.resilience;
      utility += stats.utility + stats.energyEfficiency + stats.speed;
    }
    return EncounterPowerSummary(
      totalPower: power,
      avgLevel: levels / units.length,
      roleCoverage: roles,
      offense: offense,
      defense: defense,
      utility: utility,
      rarityBreakdown: rarities,
    );
  }

  String? validateLoadout(SquadLoadout loadout) {
    if (loadout.unitIdsBySlot.length != loadout.maxSlots) {
      return 'Invalid squad slot count';
    }
    final rosterIds = roster.map((u) => u.id).toSet();
    final seen = <String>{};
    for (final id in loadout.unitIdsBySlot.whereType<String>()) {
      if (!rosterIds.contains(id)) return 'Assigned unit is not in roster';
      if (!seen.add(id)) return 'Duplicate unit assignment is not allowed';
    }
    return null;
  }

  SquadState assignUnitToSlot({required String unitId, required int slotIndex}) {
    final nextSlots = [...activeSquad.unitIdsBySlot];
    if (slotIndex < 0 || slotIndex >= nextSlots.length) return this;
    for (var i = 0; i < nextSlots.length; i++) {
      if (nextSlots[i] == unitId) nextSlots[i] = null;
    }
    nextSlots[slotIndex] = unitId;
    final next = SquadLoadout(maxSlots: activeSquad.maxSlots, unitIdsBySlot: nextSlots);
    return validateLoadout(next) == null ? copyWith(activeSquad: next) : this;
  }

  SquadState removeUnitFromSlot(int slotIndex) {
    final nextSlots = [...activeSquad.unitIdsBySlot];
    if (slotIndex < 0 || slotIndex >= nextSlots.length) return this;
    nextSlots[slotIndex] = null;
    return copyWith(activeSquad: SquadLoadout(maxSlots: activeSquad.maxSlots, unitIdsBySlot: nextSlots));
  }

  SquadState applyUnitXpToActive(int totalXp) {
    final units = activeUnits;
    if (units.isEmpty || totalXp <= 0) return this;
    final perUnit = math.max(1, totalXp ~/ units.length);
    final activeIds = activeSquad.assignedIds;
    final nextRoster = roster
        .map((unit) => activeIds.contains(unit.id) ? unit.copyWith(progression: unit.progression.applyXp(perUnit)) : unit)
        .toList(growable: false);
    return copyWith(roster: nextRoster);
  }

  SquadState unlockUnitUpgrade({required String unitId, required String upgradeId, required int currencyAvailable}) {
    final target = _firstWhereOrNull(roster, (u) => u.id == unitId);
    if (target == null) return this;
    final upgrade = _firstWhereOrNull(target.upgradePath, (u) => u.id == upgradeId);
    if (upgrade == null) return this;
    if (target.progression.level < upgrade.levelRequirement) return this;
    if (currencyAvailable < upgrade.currencyCost) return this;
    final nextRoster = roster
        .map((unit) => unit.id == unitId ? unit.copyWith(progression: unit.progression.unlockUpgrade(upgradeId)) : unit)
        .toList(growable: false);
    return copyWith(roster: nextRoster);
  }

  SquadState unlockUnits(List<String> templateIds) {
    if (templateIds.isEmpty) return this;
    final existingTemplates = roster.map((u) => u.templateId).toSet();
    final additions = templateIds.where((id) => !existingTemplates.contains(id)).map(_createEarnedUnitFromTemplate).toList(growable: false);
    if (additions.isEmpty) return this;
    return copyWith(roster: [...roster, ...additions]);
  }

  SquadState copyWith({List<PerbugUnit>? roster, SquadLoadout? activeSquad}) {
    return SquadState(roster: roster ?? this.roster, activeSquad: activeSquad ?? this.activeSquad);
  }

  static SquadState starter() {
    const starterUnits = [
      PerbugUnit(
        id: 'unit-scout-midge',
        templateId: 'starter-scout-midge',
        name: 'Scout Midge',
        lore: 'Recon specialist that opens paths on unknown streets.',
        unitClass: UnitClass.drone,
        role: UnitRole.scout,
        rarity: UnitRarity.common,
        ownershipSource: UnitOwnershipSource.starter,
        baseStats: UnitStats(attack: 7, defense: 5, speed: 11, utility: 9, energyEfficiency: 10, resilience: 6, initiative: 11),
        progression: UnitProgression(level: 1, xp: 0, starRank: 1, promotionTier: 0, unlockedUpgradeIds: {}),
        upgradePath: [
          UnitUpgradeNode(
            id: 'pathfinder-protocol',
            title: 'Pathfinder Protocol',
            description: 'Increases initiative and movement scouting output.',
            statBonus: UnitStats(attack: 0, defense: 0, speed: 2, utility: 1, energyEfficiency: 1, resilience: 0, initiative: 3),
            levelRequirement: 2,
            currencyCost: 8,
          ),
        ],
      ),
      PerbugUnit(
        id: 'unit-relay-beetle',
        templateId: 'starter-relay-beetle',
        name: 'Relay Beetle',
        lore: 'Signal engineer that stabilizes tactical links.',
        unitClass: UnitClass.mech,
        role: UnitRole.engineer,
        rarity: UnitRarity.common,
        ownershipSource: UnitOwnershipSource.starter,
        baseStats: UnitStats(attack: 6, defense: 8, speed: 6, utility: 11, energyEfficiency: 8, resilience: 8, initiative: 6),
        progression: UnitProgression(level: 1, xp: 0, starRank: 1, promotionTier: 0, unlockedUpgradeIds: {}),
        upgradePath: [
          UnitUpgradeNode(
            id: 'relay-overclock',
            title: 'Relay Overclock',
            description: 'Boosts utility and energy optimization for mission support.',
            statBonus: UnitStats(attack: 0, defense: 1, speed: 0, utility: 3, energyEfficiency: 2, resilience: 1, initiative: 0),
            levelRequirement: 2,
            currencyCost: 8,
          ),
        ],
      ),
      PerbugUnit(
        id: 'unit-bastion-hornet',
        templateId: 'starter-bastion-hornet',
        name: 'Bastion Hornet',
        lore: 'Frontline shell that absorbs punishment at hotspots.',
        unitClass: UnitClass.sentinel,
        role: UnitRole.tank,
        rarity: UnitRarity.uncommon,
        ownershipSource: UnitOwnershipSource.starter,
        baseStats: UnitStats(attack: 7, defense: 12, speed: 4, utility: 5, energyEfficiency: 6, resilience: 12, initiative: 5),
        progression: UnitProgression(level: 1, xp: 0, starRank: 1, promotionTier: 0, unlockedUpgradeIds: {}),
        upgradePath: [
          UnitUpgradeNode(
            id: 'fortress-carapace',
            title: 'Fortress Carapace',
            description: 'Raises defense and resilience for endurance encounters.',
            statBonus: UnitStats(attack: 0, defense: 3, speed: 0, utility: 0, energyEfficiency: 0, resilience: 4, initiative: 0),
            levelRequirement: 3,
            currencyCost: 12,
          ),
        ],
      ),
      PerbugUnit(
        id: 'unit-lumen-viper',
        templateId: 'starter-lumen-viper',
        name: 'Lumen Viper',
        lore: 'Burst striker tuned for high-risk node clear windows.',
        unitClass: UnitClass.rogue,
        role: UnitRole.striker,
        rarity: UnitRarity.rare,
        ownershipSource: UnitOwnershipSource.earned,
        baseStats: UnitStats(attack: 12, defense: 5, speed: 9, utility: 5, energyEfficiency: 6, resilience: 5, initiative: 9),
        progression: UnitProgression(level: 1, xp: 0, starRank: 1, promotionTier: 0, unlockedUpgradeIds: {}),
        upgradePath: [
          UnitUpgradeNode(
            id: 'critical-weave',
            title: 'Critical Weave',
            description: 'Adds burst attack and initiative pressure.',
            statBonus: UnitStats(attack: 4, defense: 0, speed: 1, utility: 0, energyEfficiency: 0, resilience: 0, initiative: 2),
            levelRequirement: 4,
            currencyCost: 16,
          ),
        ],
      ),
    ];

    return const SquadState(
      roster: starterUnits,
      activeSquad: SquadLoadout(maxSlots: 3, unitIdsBySlot: ['unit-scout-midge', 'unit-relay-beetle', 'unit-bastion-hornet']),
    );
  }
}

PerbugUnit _createEarnedUnitFromTemplate(String templateId) {
  return PerbugUnit(
    id: '$templateId-${DateTime.now().millisecondsSinceEpoch}',
    templateId: templateId,
    name: 'Recovered $templateId',
    lore: 'An earned unit recovered from a high-value node chain.',
    unitClass: UnitClass.tactician,
    role: UnitRole.support,
    rarity: UnitRarity.uncommon,
    ownershipSource: UnitOwnershipSource.earned,
    baseStats: const UnitStats(attack: 7, defense: 7, speed: 7, utility: 9, energyEfficiency: 8, resilience: 8, initiative: 7),
    progression: UnitProgression.initial(),
    upgradePath: const [
      UnitUpgradeNode(
        id: 'field-coordination',
        title: 'Field Coordination',
        description: 'Raises utility profile for encounter readiness.',
        statBonus: UnitStats(attack: 0, defense: 1, speed: 0, utility: 3, energyEfficiency: 1, resilience: 1, initiative: 0),
        levelRequirement: 2,
        currencyCost: 10,
      ),
    ],
  );
}

class ProgressionState {
  const ProgressionState({
    required this.level,
    required this.xp,
    required this.perbug,
    required this.inventory,
    required this.upgradeCurrency,
  });

  factory ProgressionState.initial() => const ProgressionState(
        level: 1,
        xp: 0,
        perbug: 0,
        inventory: {'bio_dust': 0, 'signal_shard': 0},
        upgradeCurrency: 0,
      );

  final int level;
  final int xp;
  final int perbug;
  final Map<String, int> inventory;
  final int upgradeCurrency;

  ProgressionState applyRewards(RewardBundle reward) {
    final nextInventory = <String, int>{...inventory};
    for (final entry in reward.resources.entries) {
      nextInventory.update(entry.key, (value) => value + entry.value, ifAbsent: () => entry.value);
    }
    final nextXp = xp + reward.xp;
    final nextLevel = 1 + (nextXp ~/ 120);
    return ProgressionState(
      level: nextLevel,
      xp: nextXp,
      perbug: perbug + reward.perbug,
      inventory: nextInventory,
      upgradeCurrency: upgradeCurrency + reward.upgradeCurrency,
    );
  }
}

class PerbugNode {
  const PerbugNode({
    required this.id,
    required this.placeId,
    required this.label,
    required this.latitude,
    required this.longitude,
    required this.region,
    required this.city,
    required this.neighborhood,
    required this.country,
    required this.nodeType,
    required this.difficulty,
    required this.state,
    required this.energyReward,
    required this.movementCost,
    required this.rarityScore,
    required this.tags,
    required this.metadata,
    this.distanceFromCurrentMeters,
  });

  final String id;
  final String placeId;
  final String label;
  final double latitude;
  final double longitude;
  final String region;
  final String city;
  final String neighborhood;
  final String country;
  final PerbugNodeType nodeType;
  final int difficulty;
  final PerbugNodeState state;
  final int energyReward;
  final int movementCost;
  final double rarityScore;
  final Set<String> tags;
  final Map<String, Object> metadata;
  final double? distanceFromCurrentMeters;

  PerbugNode copyWith({
    PerbugNodeState? state,
    double? distanceFromCurrentMeters,
    PerbugNodeType? nodeType,
    int? movementCost,
  }) {
    return PerbugNode(
      id: id,
      placeId: placeId,
      label: label,
      latitude: latitude,
      longitude: longitude,
      region: region,
      city: city,
      neighborhood: neighborhood,
      country: country,
      nodeType: nodeType ?? this.nodeType,
      difficulty: difficulty,
      state: state ?? this.state,
      energyReward: energyReward,
      movementCost: movementCost ?? this.movementCost,
      rarityScore: rarityScore,
      tags: tags,
      metadata: metadata,
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
    required this.connections,
    required this.worldDebug,
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
        history: const ['Starter squad assembled and mission ready.'],
        progression: ProgressionState.initial(),
        squad: SquadState.starter(),
        activeEncounter: null,
        puzzleProgressByNode: const {},
        puzzleSession: null,
        puzzleTelemetry: const [],
        connections: const {},
        worldDebug: const {},
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
  final Map<String, Set<String>> connections;
  final Map<String, Object> worldDebug;
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
    Map<String, Set<String>>? connections,
    Map<String, Object>? worldDebug,
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
      connections: connections ?? this.connections,
      worldDebug: worldDebug ?? this.worldDebug,
      error: clearError ? null : (error ?? this.error),
    );
  }

  List<PerbugMoveCandidate> reachableMoves() {
    final current = currentNode;
    if (current == null) return const [];

    final results = <PerbugMoveCandidate>[];
    for (final node in nodes) {
      if (node.id == current.id) continue;
      final linked = connections[current.id]?.contains(node.id) == true;
      final distance = haversineMeters(current.latitude, current.longitude, node.latitude, node.longitude);
      final energyCost = math.max(node.movementCost, math.max(2, (distance / 450).round()));
      final inRange = linked && distance <= maxJumpMeters;
      final hasEnergy = energy >= energyCost;
      final reachable = inRange && hasEnergy;
      final reason = reachable
          ? 'Reachable'
          : !linked
              ? 'No travel link'
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
  if (category.contains('shop') || category.contains('store') || category.contains('market')) return PerbugNodeType.shop;
  if (pin.hasCreatorMedia) return PerbugNodeType.rare;
  if (category.contains('hotel') || category.contains('hostel') || category.contains('lodging')) return PerbugNodeType.rest;
  if (category.contains('event') || category.contains('festival')) return PerbugNodeType.event;
  if (pin.hasReviews) return PerbugNodeType.encounter;
  return PerbugNodeType.mission;
}

T? _firstWhereOrNull<T>(Iterable<T> items, bool Function(T) predicate) {
  for (final item in items) {
    if (predicate(item)) return item;
  }
  return null;
}
