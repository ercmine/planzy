import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'ad_placement.dart';
import 'ad_policy.dart';
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

  AdRenderDecision placementDecision(AdPlacement placement) {
    final decision = _visibility.decisionForPlacement(placement);
    _diagnostics.log('ad_policy_evaluated', placement: placement, data: {
      'tier': _visibility.tier.name,
      'action': decision.action.name,
      'reason': decision.reason,
    });

    if (!decision.shouldShowAd) {
      final event = switch (decision.action) {
        AdRenderAction.skipDueToPlan when _visibility.tier == AdEntitlementTier.plus =>
          'ad_hidden_plus_reduced_policy',
        AdRenderAction.skipDueToPlan when _visibility.tier == AdEntitlementTier.elite =>
          'ad_hidden_elite_no_ads',
        AdRenderAction.skipDueToUnknownEntitlement => 'ad_hidden_entitlement_unknown',
        _ => 'ad_hidden_plan_free_not_applicable',
      };
      _diagnostics.log(event, placement: placement, data: {'reason': decision.reason, 'tier': _visibility.tier.name});
    }

    return decision;
  }

  Future<NativeAd?> loadNativeAd({
    required AdPlacement placement,
    required String slotId,
    required int attempt,
    required void Function() onLoaded,
    required void Function(LoadAdError error) onFailed,
  }) async {
    final decision = placementDecision(placement);
    if (!decision.shouldShowAd) {
      _diagnostics.log('ad_insertion_skipped', placement: placement, data: {'slotId': slotId, 'reason': decision.reason});
      return null;
    }

    _diagnostics.log('ad_request', placement: placement, data: {'slotId': slotId, 'attempt': attempt});
    await _adsService.initialize();
    final ad = _adsService.buildNativeAd(
      slotId: slotId,
      onLoaded: () {
        _diagnostics.log('ad_shown', placement: placement, data: {'slotId': slotId});
        _diagnostics.log('ad_insertion_applied', placement: placement, data: {'slotId': slotId});
        onLoaded();
      },
      onFailed: (error) {
        _diagnostics.log('ad_load_failed', placement: placement, data: {
          'slotId': slotId,
          'code': error.code,
          'message': error.message,
        });
        _diagnostics.log('ad_no_fill', placement: placement, data: {'slotId': slotId});
        onFailed(error);
      },
      onImpression: () => _diagnostics.log('ad_impression', placement: placement, data: {'slotId': slotId}),
      onClicked: () => _diagnostics.log('ad_clicked', placement: placement, data: {'slotId': slotId}),
    );
    await ad.load();
    return ad;
  }

  AdRenderDecision onInventoryFailure(AdPlacement placement, int attempt) {
    final decision = _visibility.inventoryFailureDecision(placement: placement, attempt: attempt);
    if (decision.action == AdRenderAction.allowRetryLater) {
      _diagnostics.log('ad_retry_attempted', placement: placement, data: {'attempt': attempt + 1});
    }
    if (decision.action == AdRenderAction.collapseSlot) {
      _diagnostics.log('ad_slot_collapsed', placement: placement, data: {'reason': decision.reason});
    }
    if (decision.action == AdRenderAction.skipDueToMissingInventory) {
      _diagnostics.log('ad_hidden_no_inventory', placement: placement, data: {'reason': decision.reason});
    }
    return decision;
  }

  void onDisposed(AdPlacement placement, String slotId) {
    _diagnostics.log('ad_disposed', placement: placement, data: {'slotId': slotId});
  }
}
