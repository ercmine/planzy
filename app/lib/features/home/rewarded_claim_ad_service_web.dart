import 'dart:developer' as developer;
import 'dart:js_util' as js_util;

import 'package:web/web.dart' as web;

import 'rewarded_claim_ad_logic.dart';
import 'rewarded_claim_ad_service.dart';

RewardedClaimAdBridge defaultRewardedClaimAdBridge() {
  final inAppConfig = js_util.jsify(const <String, Object>{
    'type': 'inApp',
    'inAppSettings': <String, Object>{
      'frequency': 2,
      'capping': 0.1,
      'interval': 30,
      'timeout': 5,
      'everyPage': false,
    },
  });

  return RewardedClaimAdBridge(
    hasRewardedFunction: () => js_util.hasProperty(web.window, 'show_10822588'),
    invokeRewardedFunction: () => js_util.callMethod<Object?>(web.window, 'show_10822588', <Object?>[inAppConfig]),
    awaitPromise: (value) => js_util.promiseToFuture<Object?>(value),
  );
}

Future<RewardedClaimAdResult> showRewardedClaimInterstitial() async {
  return runRewardedClaimInterstitial(
    bridge: defaultRewardedClaimAdBridge(),
    log: (message) => developer.log(message, name: 'perbug.rewarded_claim_ad'),
  );
}
