import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'ads_service.dart';

enum NativeAdLoadState { idle, loading, ready, failed }

class NativeAdController {
  NativeAdController({
    required AdsService adsService,
    required this.slotId,
  }) : _adsService = adsService;

  final AdsService _adsService;
  final String slotId;

  final ValueNotifier<NativeAdLoadState> state =
      ValueNotifier<NativeAdLoadState>(NativeAdLoadState.idle);

  NativeAd? _ad;

  NativeAd? get ad => _ad;

  Future<void> load() async {
    if (!_adsService.enabled || state.value == NativeAdLoadState.loading) {
      return;
    }
    disposeAdOnly();
    state.value = NativeAdLoadState.loading;
    final ad = _adsService.buildNativeAd(
      slotId: slotId,
      onLoaded: () {
        state.value = NativeAdLoadState.ready;
      },
      onFailed: (error) {
        state.value = NativeAdLoadState.failed;
        disposeAdOnly();
      },
    );
    _ad = ad;
    await ad.load();
  }

  void disposeAdOnly() {
    _ad?.dispose();
    _ad = null;
  }

  void dispose() {
    disposeAdOnly();
    state.dispose();
  }
}
