import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'ad_placement.dart';
import 'ad_policy.dart';
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
  int _attempt = 0;

  NativeAd? get ad => _ad;

  Future<void> load() async {
    if (_disposed || state.value == NativeAdLoadState.loading) {
      return;
    }

    final placementDecision = _adsManager.placementDecision(placement);
    if (!placementDecision.shouldShowAd) {
      state.value = NativeAdLoadState.hidden;
      return;
    }

    disposeAdOnly();
    state.value = NativeAdLoadState.loading;

    final loadedAd = await _adsManager.loadNativeAd(
      placement: placement,
      slotId: slotId,
      attempt: _attempt,
      onLoaded: () {
        if (!_disposed) {
          state.value = NativeAdLoadState.ready;
        }
      },
      onFailed: (_) {
        if (!_disposed) {
          _handleFailure();
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

  Future<void> _handleFailure() async {
    final decision = _adsManager.onInventoryFailure(placement, _attempt);
    _attempt += 1;

    if (decision.action == AdRenderAction.allowRetryLater) {
      await Future<void>.delayed(const Duration(milliseconds: 500));
      if (!_disposed) {
        await load();
      }
      return;
    }

    if (decision.action == AdRenderAction.show) {
      state.value = NativeAdLoadState.ready;
      return;
    }

    state.value = NativeAdLoadState.failed;
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
