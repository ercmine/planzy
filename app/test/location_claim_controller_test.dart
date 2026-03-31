import 'package:dryad/features/home/location_claim_controller.dart';
import 'package:dryad/providers/test_overrides.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('claim requires ad completion and debits global lifetime pool', () async {
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
    expect(updated.balance, 1);
    expect(updated.globalPool.totalClaimedSupply, 1);
    expect(updated.globalPool.remainingClaimableSupply, 399999999);
  });

  test('location reward halves every successful claim', () async {
    final container = ProviderContainer(overrides: buildTestOverrides());
    addTearDown(container.dispose);

    final controller = container.read(locationClaimControllerProvider.notifier);
    await controller.startTracking();

    final locationId = container
        .read(locationClaimControllerProvider)
        .claimables
        .firstWhere((c) => c.flowState == ClaimFlowState.visited)
        .location
        .id;

    controller.prepareClaim(locationId);
    controller.completeInterstitialAd(locationId, success: true);
    controller.finalizeClaim(locationId);

    await controller.startTracking();

    final afterFirst = container.read(locationClaimControllerProvider).claimables.firstWhere((c) => c.location.id == locationId);
    expect(afterFirst.claimCount, 1);
    expect(afterFirst.currentReward, 0.5);
    expect(afterFirst.totalClaimedAtLocation, 1);

    controller.prepareClaim(locationId);
    controller.completeInterstitialAd(locationId, success: true);
    controller.finalizeClaim(locationId);
    await controller.startTracking();

    final afterSecond = container.read(locationClaimControllerProvider).claimables.firstWhere((c) => c.location.id == locationId);
    expect(afterSecond.claimCount, 2);
    expect(afterSecond.currentReward, 0.25);
    expect(afterSecond.totalClaimedAtLocation, 1.5);
  });

  test('claim clamps payout to remaining global supply near exhaustion', () async {
    final container = ProviderContainer(overrides: buildTestOverrides());
    addTearDown(container.dispose);

    final controller = container.read(locationClaimControllerProvider.notifier);
    await controller.startTracking();

    final locationId = container
        .read(locationClaimControllerProvider)
        .claimables
        .firstWhere((c) => c.flowState == ClaimFlowState.visited)
        .location
        .id;

    controller.debugSetGlobalClaimedSupplyForTesting(399999999.25);

    controller.prepareClaim(locationId);
    controller.completeInterstitialAd(locationId, success: true);
    controller.finalizeClaim(locationId);

    final updated = container.read(locationClaimControllerProvider);
    expect(updated.balance, 0.75);
    expect(updated.globalPool.remainingClaimableSupply, 0);
  });

  test('duplicate finalize attempts are idempotent', () async {
    final container = ProviderContainer(overrides: buildTestOverrides());
    addTearDown(container.dispose);

    final controller = container.read(locationClaimControllerProvider.notifier);
    await controller.startTracking();

    final locationId = container
        .read(locationClaimControllerProvider)
        .claimables
        .firstWhere((c) => c.flowState == ClaimFlowState.visited)
        .location
        .id;

    controller.prepareClaim(locationId);
    controller.completeInterstitialAd(locationId, success: true);
    controller.finalizeClaim(locationId);
    controller.finalizeClaim(locationId);

    final updated = container.read(locationClaimControllerProvider);
    expect(updated.globalPool.totalClaimedSupply, 1);
    expect(updated.claimHistory.length, 1);
  });
}
