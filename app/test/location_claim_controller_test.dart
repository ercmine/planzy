import 'package:dryad/features/home/location_claim_controller.dart';
import 'package:dryad/features/home/location_claim_models.dart';
import 'package:dryad/providers/test_overrides.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('claim requires ad completion and debits yearly pool', () async {
    final container = ProviderContainer(overrides: buildTestOverrides());
    addTearDown(container.dispose);

    final controller = container.read(locationClaimControllerProvider.notifier);
    await controller.startTracking();

    final state = container.read(locationClaimControllerProvider);
    final inRange = state.claimables.firstWhere((c) => c.flowState == ClaimFlowState.visited);

    controller.prepareClaim(inRange.location.id);
    final afterPrepare = container.read(locationClaimControllerProvider).claimables.firstWhere((c) => c.location.id == inRange.location.id);
    expect(afterPrepare.flowState, ClaimFlowState.adRequired);

    controller.completeInterstitialAd(inRange.location.id, success: true);
    controller.finalizeClaim(inRange.location.id);

    final updated = container.read(locationClaimControllerProvider);
    expect(updated.balance, greaterThan(0));
    expect(updated.pool.claimed, greaterThan(0));
  });
}
