import 'dart:developer' as developer;
import 'dart:js_util' as js_util;

import 'package:web/web.dart' as web;

import 'rewarded_claim_ad_logic.dart';
import 'rewarded_claim_ad_service.dart';

RewardedClaimAdBridge defaultRewardedClaimAdBridge() {
  return RewardedClaimAdBridge(
    hasRewardedFunction: () => js_util.hasProperty(web.window, 'show_10822588'),
    invokeRewardedFunction: () => js_util.callMethod<Object?>(web.window, 'show_10822588', const <Object?>[]),
    awaitPromise: (value) => js_util.promiseToFuture<Object?>(value),
  );
}

Future<RewardedClaimAdResult> showRewardedClaimInterstitial() async {
  return runRewardedClaimInterstitial(
    bridge: defaultRewardedClaimAdBridge(),
    log: (message) => developer.log(message, name: 'perbug.rewarded_claim_ad'),
  );
}
