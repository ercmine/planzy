import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'ads_config.dart';

class AdsService {
  AdsService({required AdsConfig config}) : _config = config;

  final AdsConfig _config;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized || !_config.isUsable) {
      return;
    }
    await MobileAds.instance.initialize();
    _initialized = true;
  }

  NativeAd buildNativeAd({
    required String slotId,
    required VoidCallback onLoaded,
    required void Function(Object error) onFailed,
    VoidCallback? onImpression,
    VoidCallback? onClicked,
  }) {
    return NativeAd(
      adUnitId: _config.currentNativeUnitId(),
      factoryId: 'deckNativeAd',
      request: const AdRequest(nonPersonalizedAds: true),
      listener: NativeAdListener(
        onAdLoaded: (_) => onLoaded(),
        onAdFailedToLoad: (_, error) => onFailed(error),
        onAdImpression: (_) => onImpression?.call(),
        onAdClicked: (_) => onClicked?.call(),
      ),
      nativeTemplateStyle: NativeTemplateStyle(
        templateType: TemplateType.medium,
        mainBackgroundColor: const Color(0x00000000),
        cornerRadius: 16,
      ),
    );
  }

  bool get enabled => _config.isUsable;
}
