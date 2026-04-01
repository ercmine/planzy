import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/core/ads/action_interstitial_ad_service.dart';
import 'package:perbug/core/ads/post_action_ad_coordinator.dart';

class _FakeAdService implements ActionInterstitialAdService {
  final List<InterstitialAdTrigger> calls = <InterstitialAdTrigger>[];
  Completer<bool>? blocker;

  @override
  Future<void> initialize() async {}

  @override
  Future<void> preloadInterstitial() async {}

  @override
  Future<bool> showIfAvailable(InterstitialAdTrigger trigger) async {
    calls.add(trigger);
    if (blocker != null) {
      return blocker!.future;
    }
    return false;
  }
}

void main() {
  test('claim success triggers interstitial attempt', () async {
    final service = _FakeAdService();
    final coordinator = PostActionAdCoordinator(adService: service);

    await coordinator.onClaimSuccess();

    expect(service.calls, equals([InterstitialAdTrigger.claimSuccess]));
  });

  test('withdraw success triggers interstitial attempt', () async {
    final service = _FakeAdService();
    final coordinator = PostActionAdCoordinator(adService: service);

    await coordinator.onWithdrawSuccess();

    expect(service.calls, equals([InterstitialAdTrigger.withdrawSuccess]));
  });

  test('does not call show twice for same in-flight action', () async {
    final service = _FakeAdService()..blocker = Completer<bool>();
    final coordinator = PostActionAdCoordinator(adService: service);

    unawaited(coordinator.onClaimSuccess());
    await Future<void>.delayed(Duration.zero);
    unawaited(coordinator.onClaimSuccess());
    await Future<void>.delayed(Duration.zero);

    expect(service.calls.length, 1);

    service.blocker!.complete(true);
    await Future<void>.delayed(Duration.zero);
  });
}
