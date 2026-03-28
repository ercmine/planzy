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
      progression: ProgressionState(level: 1, xp: 0, perbug: 0, inventory: {}),
      squad: SquadState(units: [], maxSlots: 3),
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
    );

    final moves = state.reachableMoves();
    final b = moves.firstWhere((m) => m.node.id == 'b');
    final c = moves.firstWhere((m) => m.node.id == 'c');
    expect(b.isReachable, isTrue);
    expect(c.isReachable, isFalse);
  });

  test('future puzzle-ready node state enum exists', () {
    expect(PerbugNodeState.values, contains(PerbugNodeState.futureChallengeReady));
  });
}
