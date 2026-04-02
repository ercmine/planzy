import 'dart:js_util' as js_util;

import 'package:web/web.dart' as web;

import 'rewarded_claim_ad_service.dart';

Future<RewardedClaimAdResult> showRewardedClaimInterstitial() async {
  if (!js_util.hasProperty(web.window, 'show_10822588')) {
    return const RewardedClaimAdResult(
      success: false,
      message: 'Rewarded ad SDK is not loaded.',
    );
  }

  try {
    final result = js_util.callMethod<Object?>(web.window, 'show_10822588', const <Object?>[]);
    if (result == null) {
      return const RewardedClaimAdResult(
        success: false,
        message: 'Rewarded ad did not return a completion promise.',
      );
    }
    await js_util.promiseToFuture<Object?>(result);
    return const RewardedClaimAdResult(success: true);
  } catch (error) {
    return RewardedClaimAdResult(
      success: false,
      message: 'Rewarded ad failed: $error',
    );
  }
}
