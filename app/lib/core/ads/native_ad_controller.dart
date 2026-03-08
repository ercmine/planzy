import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'ad_placement.dart';
import 'ads_manager.dart';

enum NativeAdLoadState { idle, loading, ready, failed, hidden }

class NativeAdController {
  NativeAdController({
    required AdsManager adsManager,
    required this.slotId,
    required this.placement,
  }) : _adsManager = adsManager;

  final AdsManager _adsManager;
  final String slotId;
  final AdPlacement placement;

  final ValueNotifier<NativeAdLoadState> state =
      ValueNotifier<NativeAdLoadState>(NativeAdLoadState.idle);

  NativeAd? _ad;
  bool _disposed = false;

  NativeAd? get ad => _ad;

  Future<void> load() async {
    if (_disposed || state.value == NativeAdLoadState.loading) {
      return;
    }

    if (!_adsManager.canShowPlacement(placement)) {
      state.value = NativeAdLoadState.hidden;
      return;
    }

    disposeAdOnly();
    state.value = NativeAdLoadState.loading;

    final loadedAd = await _adsManager.loadNativeAd(
      placement: placement,
      slotId: slotId,
      onLoaded: () {
        if (!_disposed) {
          state.value = NativeAdLoadState.ready;
        }
      },
      onFailed: (_) {
        if (!_disposed) {
          state.value = NativeAdLoadState.failed;
        }
      },
    );

    if (_disposed) {
      loadedAd?.dispose();
      return;
    }

    _ad = loadedAd;
    if (loadedAd == null && state.value == NativeAdLoadState.loading) {
      state.value = NativeAdLoadState.hidden;
    }
  }

  Future<void> retry() => load();

  void disposeAdOnly() {
    _ad?.dispose();
    _ad = null;
  }

  void dispose() {
    _disposed = true;
    _adsManager.onDisposed(placement, slotId);
    disposeAdOnly();
    state.dispose();
  }
}
