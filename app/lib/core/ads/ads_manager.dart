import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'ad_placement.dart';
import 'ads_diagnostics.dart';
import 'ads_service.dart';
import 'ads_visibility.dart';

class AdsManager {
  AdsManager({
    required AdsService adsService,
    required AdsVisibility visibility,
    required AdsDiagnostics diagnostics,
  })  : _adsService = adsService,
        _visibility = visibility,
        _diagnostics = diagnostics;

  final AdsService _adsService;
  final AdsVisibility _visibility;
  final AdsDiagnostics _diagnostics;

  bool canShowPlacement(AdPlacement placement) {
    final visible = _visibility.canShow(placement.name);
    if (!visible) {
      _diagnostics.log('ad_hidden_by_entitlement', placement: placement);
    }
    return visible;
  }

  Future<NativeAd?> loadNativeAd({
    required AdPlacement placement,
    required String slotId,
    required void Function() onLoaded,
    required void Function(LoadAdError error) onFailed,
  }) async {
    if (!canShowPlacement(placement)) {
      _diagnostics.log('placement_skipped', placement: placement, data: {'reason': 'visibility'});
      return null;
    }

    _diagnostics.log('ad_request', placement: placement, data: {'slotId': slotId});
    await _adsService.initialize();
    final ad = _adsService.buildNativeAd(
      slotId: slotId,
      onLoaded: () {
        _diagnostics.log('ad_loaded', placement: placement, data: {'slotId': slotId});
        onLoaded();
      },
      onFailed: (error) {
        _diagnostics.log('ad_failed', placement: placement, data: {
          'slotId': slotId,
          'code': error.code,
          'message': error.message,
        });
        onFailed(error);
      },
      onImpression: () => _diagnostics.log('ad_impression', placement: placement, data: {'slotId': slotId}),
      onClicked: () => _diagnostics.log('ad_clicked', placement: placement, data: {'slotId': slotId}),
    );
    await ad.load();
    return ad;
  }

  void onDisposed(AdPlacement placement, String slotId) {
    _diagnostics.log('ad_disposed', placement: placement, data: {'slotId': slotId});
  }
}
