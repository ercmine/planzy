import 'dart:async';
import 'package:perbug/features/home/location_claim_controller.dart';
import 'package:perbug/features/home/rewarded_claim_ad_service.dart';
import 'package:perbug/providers/app_providers.dart';
import 'package:perbug/providers/test_overrides.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('claim is instant in-range and debits global lifetime pool', () async {
    final container = ProviderContainer(overrides: buildTestOverrides());
    addTearDown(container.dispose);

    final controller = container.read(locationClaimControllerProvider.notifier);
    await controller.startTracking();

    final state = container.read(locationClaimControllerProvider);
    final inRange = state.claimables.firstWhere((c) => c.flowState == ClaimFlowState.visited);

    await controller.claimInstantly(inRange.location.id);

    final updated = container.read(locationClaimControllerProvider);
    expect(updated.balance, 1);
    expect(updated.globalPool.totalClaimedSupply, 1);
    expect(updated.globalPool.remainingClaimableSupply, 399999999);
    final claimed = updated.claimables.firstWhere((c) => c.location.id == inRange.location.id);
    expect(claimed.flowState, ClaimFlowState.cooldown);
    expect(claimed.cooldownUntil, isNotNull);
  });

  test('location reward halves every successful claim after cooldown reset', () async {
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

    await controller.claimInstantly(locationId);

    await controller.startTracking();

    final afterFirst = container.read(locationClaimControllerProvider).claimables.firstWhere((c) => c.location.id == locationId);
    expect(afterFirst.claimCount, 1);
    expect(afterFirst.currentReward, 0.5);
    expect(afterFirst.totalClaimedAtLocation, 1);

    controller.debugExpireCooldownForTesting(locationId);
    await controller.claimInstantly(locationId);
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

    await controller.claimInstantly(locationId);

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

    await controller.claimInstantly(locationId);
    await controller.claimInstantly(locationId);

    final updated = container.read(locationClaimControllerProvider);
    expect(updated.globalPool.totalClaimedSupply, 1);
    expect(updated.claimHistory.length, 1);
  });

  test('claim does not finalize when rewarded interstitial rejects', () async {
    final adService = _FakeRewardedClaimAdService(
      result: const RewardedClaimAdResult(success: false, message: 'Ad blocked by browser.'),
    );
    final container = ProviderContainer(
      overrides: [
        ...buildTestOverrides(),
        rewardedClaimAdServiceProvider.overrideWithValue(adService),
      ],
    );
    addTearDown(container.dispose);

    final controller = container.read(locationClaimControllerProvider.notifier);
    await controller.startTracking();

    final locationId = container
        .read(locationClaimControllerProvider)
        .claimables
        .firstWhere((c) => c.flowState == ClaimFlowState.visited)
        .location
        .id;

    await controller.claimInstantly(locationId);

    final updated = container.read(locationClaimControllerProvider);
    expect(adService.calls, 1);
    expect(updated.balance, 0);
    expect(updated.claimHistory, isEmpty);
    expect(updated.globalPool.totalClaimedSupply, 0);
    expect(updated.claimables.firstWhere((c) => c.location.id == locationId).flowState, ClaimFlowState.adRequired);
  });

  test('claim waits for rewarded interstitial and only submits once', () async {
    final completer = Completer<RewardedClaimAdResult>();
    final adService = _FakeRewardedClaimAdService(resultFuture: completer.future);
    final container = ProviderContainer(
      overrides: [
        ...buildTestOverrides(),
        rewardedClaimAdServiceProvider.overrideWithValue(adService),
      ],
    );
    addTearDown(container.dispose);

    final controller = container.read(locationClaimControllerProvider.notifier);
    await controller.startTracking();

    final locationId = container
        .read(locationClaimControllerProvider)
        .claimables
        .firstWhere((c) => c.flowState == ClaimFlowState.visited)
        .location
        .id;

    final first = controller.claimInstantly(locationId);
    final second = controller.claimInstantly(locationId);

    expect(container.read(locationClaimControllerProvider).balance, 0);
    completer.complete(const RewardedClaimAdResult(success: true));
    await first;
    await second;

    final updated = container.read(locationClaimControllerProvider);
    expect(adService.calls, 1);
    expect(updated.balance, 1);
    expect(updated.claimHistory.length, 1);
  });
}

class _FakeRewardedClaimAdService implements RewardedClaimAdService {
  _FakeRewardedClaimAdService({this.result, this.resultFuture});

  final RewardedClaimAdResult? result;
  final Future<RewardedClaimAdResult>? resultFuture;
  int calls = 0;

  @override
  Future<RewardedClaimAdResult> showRewardedInterstitial() {
    calls += 1;
    if (resultFuture != null) return resultFuture!;
    return Future<RewardedClaimAdResult>.value(result ?? const RewardedClaimAdResult(success: true));
  }
}
