import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../config/admob_config.dart';
import '../../config/admob_test_ids.dart';
import '../logging/log.dart';

enum InterstitialAdTrigger { appOpen, claimSuccess, withdrawSuccess }

abstract class ActionInterstitialAdService {
  Future<void> initialize();
  Future<void> preloadInterstitial();
  Future<bool> showIfAvailable(InterstitialAdTrigger trigger);
}

class GoogleActionInterstitialAdService implements ActionInterstitialAdService {
  Future<void>? _initializeFuture;
  InterstitialAd? _interstitialAd;
  bool _loading = false;
  bool _showing = false;

  @override
  Future<void> initialize() {
    if (!AdMobConfig.isSupportedPlatform) {
      return Future<void>.value();
    }
    _initializeFuture ??= _initializeInternal();
    return _initializeFuture!;
  }

  Future<void> _initializeInternal() async {
    await MobileAds.instance.updateRequestConfiguration(AdMobConfig.requestConfiguration);
    await MobileAds.instance.initialize();
    Log.info('[AdMob][Interstitial] initialized');
    await preloadInterstitial();
  }

  @override
  Future<void> preloadInterstitial() async {
    if (!AdMobConfig.isSupportedPlatform || _loading || _interstitialAd != null) {
      return;
    }
    _loading = true;

    try {
      final productionUnitId = AdMobConfig.productionInterstitialUnitId;
      final loadedProduction = await _loadInterstitial(productionUnitId, source: 'production');
      if (loadedProduction || !kDebugMode) {
        return;
      }

      final testUnitId = AdMobTestIds.interstitial;
      await _loadInterstitial(testUnitId, source: 'test_fallback');
    } finally {
      _loading = false;
    }
  }

  Future<bool> _loadInterstitial(String adUnitId, {required String source}) async {
    if (adUnitId.isEmpty) {
      return false;
    }

    final completer = Completer<bool>();
    InterstitialAd.load(
      adUnitId: adUnitId,
      request: const AdRequest(nonPersonalizedAds: true),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _interstitialAd = ad;
          Log.info('[AdMob][Interstitial] loaded unitId=$adUnitId source=$source');
          completer.complete(true);
        },
        onAdFailedToLoad: (error) {
          Log.warn('[AdMob][Interstitial] failed to load unitId=$adUnitId source=$source code=${error.code} message=${error.message}');
          completer.complete(false);
        },
      ),
    );

    return completer.future;
  }

  @override
  Future<bool> showIfAvailable(InterstitialAdTrigger trigger) async {
    await initialize();

    if (_showing) {
      Log.warn('[AdMob][Interstitial] show skipped trigger=${trigger.name} reason=already_showing');
      return false;
    }

    final ad = _interstitialAd;
    if (ad == null) {
      Log.info('[AdMob][Interstitial] show skipped trigger=${trigger.name} reason=not_loaded');
      unawaited(preloadInterstitial());
      return false;
    }

    _interstitialAd = null;
    _showing = true;
    final completer = Completer<bool>();

    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdShowedFullScreenContent: (_) {
        Log.info('[AdMob][Interstitial] shown trigger=${trigger.name}');
      },
      onAdDismissedFullScreenContent: (dismissedAd) {
        dismissedAd.dispose();
        _showing = false;
        Log.info('[AdMob][Interstitial] dismissed trigger=${trigger.name}');
        unawaited(preloadInterstitial());
        if (!completer.isCompleted) {
          completer.complete(true);
        }
      },
      onAdFailedToShowFullScreenContent: (failedAd, error) {
        failedAd.dispose();
        _showing = false;
        Log.warn('[AdMob][Interstitial] failed to show trigger=${trigger.name} code=${error.code} message=${error.message}');
        unawaited(preloadInterstitial());
        if (!completer.isCompleted) {
          completer.complete(false);
        }
      },
    );

    ad.show();
    return completer.future;
  }
}

class NoopActionInterstitialAdService implements ActionInterstitialAdService {
  @override
  Future<void> initialize() async {}

  @override
  Future<void> preloadInterstitial() async {}

  @override
  Future<bool> showIfAvailable(InterstitialAdTrigger trigger) async => false;
}
