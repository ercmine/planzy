import 'package:flutter_test/flutter_test.dart';
import 'package:planzy/features/home/perbug_game_models.dart';
import 'package:planzy/features/home/perbug_economy_models.dart';
import 'package:planzy/features/home/perbug_progression_models.dart';

void main() {
  test('syncWorld computes region progress, tier and recommendations', () {
    final engine = progressionEngineForTests;
    final result = engine.syncWorld(
      current: PerbugProgressionState.initial(),
      nodes: const [
        PerbugNode(
          id: 'a',
          placeId: 'a',
          label: 'A',
          latitude: 30,
          longitude: -97,
          region: 'Texas',
          city: 'Austin',
          neighborhood: 'Downtown',
          country: 'US',
          nodeType: PerbugNodeType.encounter,
          difficulty: 1,
          state: PerbugNodeState.available,
          energyReward: 1,
          movementCost: 2,
          rarityScore: 1,
          tags: {},
          metadata: {},
        ),
        PerbugNode(
          id: 'b',
          placeId: 'b',
          label: 'B',
          latitude: 30.01,
          longitude: -97.01,
          region: 'Texas',
          city: 'Austin',
          neighborhood: 'East',
          country: 'US',
          nodeType: PerbugNodeType.rare,
          difficulty: 2,
          state: PerbugNodeState.available,
          energyReward: 1,
          movementCost: 2,
          rarityScore: 1.3,
          tags: {'rare'},
          metadata: {},
        ),
      ],
      visitedNodeIds: const {'a', 'b'},
      squad: SquadState.starter(),
      inventory: PerbugEconomyState.initial().inventory,
      now: DateTime.utc(2026, 3, 28, 12),
    );

    expect(result.progression.world.unlockedRegions, contains('Texas'));
    expect(result.progression.collections.firstWhere((c) => c.id == 'node_types').discovered, greaterThanOrEqualTo(2));
    expect(result.progression.rareSpawns.activeNodeIds, isNotEmpty);
    expect(result.progression.returnLoop.recommendedActions, isNotEmpty);
  });

  test('daily objective claim only works when complete and unclaimed', () {
    final engine = progressionEngineForTests;
    final now = DateTime.utc(2026, 3, 28, 10);
    final refreshed = engine.syncWorld(
      current: PerbugProgressionState.initial(),
      nodes: const [],
      visitedNodeIds: const {},
      squad: SquadState.starter(),
      inventory: PerbugEconomyState.initial().inventory,
      now: now,
    ).progression;

    final objective = refreshed.daily.objectives.first;
    final progressed = engine.onAction(current: refreshed, type: objective.type, amount: objective.progress.target, now: now).progression;
    final claim = engine.claimObjective(current: progressed, objectiveId: objective.id);

    expect(claim.reward.perbug, greaterThan(0));
    expect(claim.progression.daily.objectives.first.progress.claimed, isTrue);

    final secondClaim = engine.claimObjective(current: claim.progression, objectiveId: objective.id);
    expect(secondClaim.reward.perbug, equals(0));
  });
}
