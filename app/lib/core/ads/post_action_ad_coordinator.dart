import 'dart:async';

import 'action_interstitial_ad_service.dart';

class PostActionAdCoordinator {
  PostActionAdCoordinator({required ActionInterstitialAdService adService}) : _adService = adService;

  final ActionInterstitialAdService _adService;
  final Set<InterstitialAdTrigger> _inFlight = <InterstitialAdTrigger>{};

  Future<void> onClaimSuccess() => _showOnce(InterstitialAdTrigger.claimSuccess);

  Future<void> onWithdrawSuccess() => _showOnce(InterstitialAdTrigger.withdrawSuccess);

  Future<void> _showOnce(InterstitialAdTrigger trigger) async {
    if (_inFlight.contains(trigger)) {
      return;
    }
    _inFlight.add(trigger);
    try {
      await _adService.showIfAvailable(trigger);
    } finally {
      _inFlight.remove(trigger);
    }
  }
}
