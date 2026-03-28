import 'package:dryad/features/home/perbug_economy_models.dart';
import 'package:dryad/features/home/perbug_game_controller.dart';
import 'package:dryad/features/home/perbug_game_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('inventory math prevents negative balances', () {
    const inventory = Inventory(stacks: {'ore': 2});
    expect(
      () => inventory.remove(const ResourceStack(resourceId: 'ore', amount: 3)),
      throwsStateError,
    );
  });

  test('crafting consumes inputs and spends perbug', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(perbugGameControllerProvider.notifier);

    controller.debugSeedEconomy(
      inventory: const Inventory(stacks: {'bio_matter': 3, 'scrap': 2}),
      perbug: 10,
    );

    controller.craftRecipe('field_kit');
    final after = container.read(perbugGameControllerProvider);

    expect(after.economy.inventory.quantityOf('field_kit'), 1);
    expect(after.economy.inventory.quantityOf('bio_matter'), 1);
    expect(after.progression.perbug, 8);
    expect(after.economy.wallet.transactions.first.sink?.name, 'crafting');
  });

  test('encounter reward flows into economy inventory', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final controller = container.read(perbugGameControllerProvider.notifier);

    controller.debugSetActiveEncounter(
      const NodeEncounter(
        id: 'enc-resource',
        nodeId: 'node-1',
        type: EncounterType.resourceHarvest,
        status: EncounterStatus.ready,
        difficultyTier: 'Tier 1',
        rewardBundle: RewardBundle(resources: {'ore': 3, 'scrap': 1}, perbug: 2),
      ),
    );
    controller.resolveEncounter(succeeded: true);
    final after = container.read(perbugGameControllerProvider);

    expect(after.economy.inventory.quantityOf('ore'), greaterThanOrEqualTo(3));
    expect(after.economy.sourceLedger, isNotEmpty);
    expect(after.progression.perbug, greaterThanOrEqualTo(2));
  });

}
