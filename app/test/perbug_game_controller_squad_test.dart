import 'package:dryad/features/home/perbug_game_controller.dart';
import 'package:dryad/features/home/perbug_economy_models.dart';
import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  test('assigning and clearing squad slots updates loadout', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(perbugGameControllerProvider.notifier);

    final initial = container.read(perbugGameControllerProvider);
    final replacement = initial.squad.roster.last.id;

    controller.assignUnitToSlot(unitId: replacement, slotIndex: 0);
    var state = container.read(perbugGameControllerProvider);
    expect(state.squad.activeSquad.unitIdsBySlot[0], replacement);

    controller.clearSquadSlot(0);
    state = container.read(perbugGameControllerProvider);
    expect(state.squad.activeSquad.unitIdsBySlot[0], isNull);
  });

  test('resolve encounter success grants unit xp and progression rewards', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(perbugGameControllerProvider.notifier);

    final before = container.read(perbugGameControllerProvider);
    final encounter = NodeEncounter(
      id: 'enc-test',
      nodeId: 'n1',
      type: EncounterType.puzzle,
      status: EncounterStatus.ready,
      difficultyTier: 'Tier 1',
      rewardBundle: const RewardBundle(xp: 20, perbug: 2, unitXp: 120, upgradeCurrency: 3),
    );

    controller.debugSetActiveEncounter(encounter);
    controller.resolveEncounter(succeeded: true);
    final after = container.read(perbugGameControllerProvider);

    expect(after.progression.xp, greaterThan(before.progression.xp));
    expect(after.progression.upgradeCurrency, greaterThan(before.progression.upgradeCurrency));
    expect(after.squad.activeUnits.first.progression.level, greaterThanOrEqualTo(before.squad.activeUnits.first.progression.level));
  });

  test('premium progression spend reduces perbug and grants upgrade currency', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(perbugGameControllerProvider.notifier);

    controller.debugSeedEconomy(inventory: const Inventory(stacks: {'upgrade_module': 1}), perbug: 20);
    final before = container.read(perbugGameControllerProvider);
    controller.unlockPremiumMissionTrack();
    final after = container.read(perbugGameControllerProvider);

    expect(after.progression.perbug, lessThan(before.progression.perbug));
    expect(after.progression.upgradeCurrency, greaterThan(before.progression.upgradeCurrency));
  });
}
