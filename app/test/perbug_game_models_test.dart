import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reachable move generation respects movement range and energy', () {
    const state = PerbugGameState(
      nodes: [
        PerbugNode(id: 'a', label: 'A', latitude: 30.2672, longitude: -97.7431, region: 'R', state: PerbugNodeState.available, energyReward: 2),
        PerbugNode(id: 'b', label: 'B', latitude: 30.2685, longitude: -97.7440, region: 'R', state: PerbugNodeState.available, energyReward: 2),
        PerbugNode(id: 'c', label: 'C', latitude: 30.5100, longitude: -97.6400, region: 'R', state: PerbugNodeState.locked, energyReward: 2),
      ],
      currentNodeId: 'a',
      energy: 10,
      maxEnergy: 30,
      maxJumpMeters: 2400,
      loading: false,
      visitedNodeIds: {'a'},
      history: [],
      puzzleEvents: [],
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
