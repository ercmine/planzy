import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../config/admob_config.dart';

class AdsService {
  AdsService();

  Future<void>? _initializeFuture;

  Future<void> initialize() {
    if (!AdMobConfig.isSupportedPlatform) {
      return Future<void>.value();
    }
    _initializeFuture ??= _initializeInternal();
    return _initializeFuture!;
  }

  Future<void> _initializeInternal() async {
    await MobileAds.instance.updateRequestConfiguration(
      AdMobConfig.requestConfiguration,
    );
    await MobileAds.instance.initialize();
  }

  NativeAd buildNativeAd({
    required String slotId,
    required VoidCallback onLoaded,
    required void Function(LoadAdError error) onFailed,
    VoidCallback? onImpression,
    VoidCallback? onClicked,
  }) {
    final adUnitId = AdMobConfig.nativeUnitId;
    return NativeAd(
      adUnitId: adUnitId,
      factoryId: AdMobConfig.nativeFactoryId,
      request: const AdRequest(nonPersonalizedAds: true),
      nativeAdOptions: NativeAdOptions(
        adChoicesPlacement: AdChoicesPlacement.topRightCorner,
        mediaAspectRatio: MediaAspectRatio.landscape,
      ),
      listener: NativeAdListener(
        onAdLoaded: (_) {
          if (kDebugMode) {
            debugPrint('[AdMob] Native ad loaded. unitId=$adUnitId slot=$slotId');
          }
          onLoaded();
        },
        onAdFailedToLoad: (_, error) {
          if (kDebugMode) {
            debugPrint(
              '[AdMob] Native ad failed. unitId=$adUnitId slot=$slotId code=${error.code} message=${error.message}',
            );
          }
          onFailed(error);
        },
        onAdImpression: (_) => onImpression?.call(),
        onAdClicked: (_) => onClicked?.call(),
      ),
    );
  }

  bool get enabled => AdMobConfig.isSupportedPlatform;
}
