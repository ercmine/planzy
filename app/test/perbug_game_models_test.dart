import 'package:dryad/features/home/perbug_economy_models.dart';
import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reachable move generation respects movement range and energy', () {
    const state = PerbugGameState(
      nodes: [
        PerbugNode(
          id: 'a',
          placeId: 'place_a',
          label: 'A',
          latitude: 30.2672,
          longitude: -97.7431,
          region: 'R',
          city: 'Austin',
          neighborhood: 'Downtown',
          country: 'USA',
          nodeType: PerbugNodeType.encounter,
          difficulty: 2,
          state: PerbugNodeState.available,
          energyReward: 2,
          movementCost: 2,
          rarityScore: 0.2,
          tags: {'cafe'},
          metadata: {},
        ),
        PerbugNode(
          id: 'b',
          placeId: 'place_b',
          label: 'B',
          latitude: 30.2685,
          longitude: -97.7440,
          region: 'R',
          city: 'Austin',
          neighborhood: 'Downtown',
          country: 'USA',
          nodeType: PerbugNodeType.resource,
          difficulty: 2,
          state: PerbugNodeState.available,
          energyReward: 2,
          movementCost: 2,
          rarityScore: 0.2,
          tags: {'park'},
          metadata: {},
        ),
        PerbugNode(
          id: 'c',
          placeId: 'place_c',
          label: 'C',
          latitude: 30.5100,
          longitude: -97.6400,
          region: 'R',
          city: 'Austin',
          neighborhood: 'North',
          country: 'USA',
          nodeType: PerbugNodeType.boss,
          difficulty: 6,
          state: PerbugNodeState.locked,
          energyReward: 2,
          movementCost: 6,
          rarityScore: 0.95,
          tags: {'boss'},
          metadata: {},
        ),
      ],
      currentNodeId: 'a',
      energy: 10,
      maxEnergy: 30,
      maxJumpMeters: 2400,
      fixedZoom: 13,
      loading: false,
      areaLabel: null,
      visitedNodeIds: {'a'},
      history: [],
      progression: ProgressionState(level: 1, xp: 0, perbug: 0, inventory: {}, upgradeCurrency: 0),
      squad: SquadState(roster: [], activeSquad: SquadLoadout(maxSlots: 3, unitIdsBySlot: [null, null, null])),
      activeEncounter: null,
      puzzleProgressByNode: {},
      puzzleSession: null,
      puzzleTelemetry: [],
      connections: {
        'a': {'b'},
        'b': {'a'},
        'c': {},
      },
      worldDebug: {},
      economy: PerbugEconomyState.initial(),
      economyTelemetry: [],
    );

    final moves = state.reachableMoves();
    final b = moves.firstWhere((m) => m.node.id == 'b');
    final c = moves.firstWhere((m) => m.node.id == 'c');
    expect(b.isReachable, isTrue);
    expect(c.isReachable, isFalse);
    expect(b.totalPerbugCost, greaterThan(0));
  });

  test('reachable move generation blocks when perbug balance is too low', () {
    final base = PerbugGameState.initial();
    final state = base.copyWith(
      nodes: const [
        PerbugNode(
          id: 'a',
          placeId: 'place_a',
          label: 'A',
          latitude: 30.2672,
          longitude: -97.7431,
          region: 'R',
          city: 'Austin',
          neighborhood: 'Downtown',
          country: 'USA',
          nodeType: PerbugNodeType.encounter,
          difficulty: 2,
          state: PerbugNodeState.available,
          energyReward: 2,
          movementCost: 2,
          rarityScore: 0.2,
          tags: {'cafe'},
          metadata: {},
        ),
        PerbugNode(
          id: 'b',
          placeId: 'place_b',
          label: 'B',
          latitude: 30.2685,
          longitude: -97.7440,
          region: 'R',
          city: 'Austin',
          neighborhood: 'Downtown',
          country: 'USA',
          nodeType: PerbugNodeType.rare,
          difficulty: 5,
          state: PerbugNodeState.available,
          energyReward: 2,
          movementCost: 2,
          rarityScore: 0.95,
          tags: {'rare'},
          metadata: {},
        ),
      ],
      currentNodeId: 'a',
      connections: const {
        'a': {'b'},
        'b': {'a'},
      },
      economy: base.economy.copyWith(wallet: base.economy.wallet.copyWith(balance: 0)),
    );
    final move = state.reachableMoves().firstWhere((m) => m.node.id == 'b');
    expect(move.isReachable, isFalse);
    expect(move.reason, 'Not enough Perbug');
  });

  test('starter squad has encounter-ready loadout and role diversity', () {
    final starter = SquadState.starter();
    expect(starter.roster.length, greaterThanOrEqualTo(4));
    expect(starter.activeUnits.length, 3);
    expect(starter.isEncounterReady, isTrue);
    final summary = starter.summarizePower();
    expect(summary.totalPower, greaterThan(0));
    expect(summary.roleCoverage.length, greaterThanOrEqualTo(2));
  });

  test('duplicate unit assignment is rejected by loadout validator', () {
    final starter = SquadState.starter();
    final duplicated = SquadLoadout(
      maxSlots: starter.maxSlots,
      unitIdsBySlot: [starter.roster.first.id, starter.roster.first.id, null],
    );
    expect(starter.validateLoadout(duplicated), isNotNull);
  });

  test('unit progression and rarity modifiers increase effective power', () {
    final starter = SquadState.starter();
    final scout = starter.roster.first;
    final basePower = scout.power;
    final leveled = scout.copyWith(progression: scout.progression.applyXp(1000));
    expect(leveled.progression.level, greaterThan(scout.progression.level));
    expect(leveled.power, greaterThan(basePower));

    final rareUnit = starter.roster.firstWhere((u) => u.rarity == UnitRarity.rare);
    expect(rareUnit.power, greaterThan(starter.roster.first.power - 2));
  });

  test('future puzzle-ready node state enum exists', () {
    expect(PerbugNodeState.values, contains(PerbugNodeState.futureChallengeReady));
  });
}
