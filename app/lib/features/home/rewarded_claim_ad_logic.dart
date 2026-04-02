import 'rewarded_claim_ad_service.dart';

typedef RewardedAdLog = void Function(String message);

class RewardedClaimAdBridge {
  const RewardedClaimAdBridge({
    required this.hasRewardedFunction,
    required this.invokeRewardedFunction,
    required this.awaitPromise,
  });

  final bool Function() hasRewardedFunction;
  final Object? Function() invokeRewardedFunction;
  final Future<Object?> Function(Object? value) awaitPromise;
}

Future<RewardedClaimAdResult> runRewardedClaimInterstitial({
  required RewardedClaimAdBridge bridge,
  RewardedAdLog? log,
}) async {
  if (!bridge.hasRewardedFunction()) {
    log?.call('Rewarded claim ad SDK missing: show_10822588 is not available.');
    return const RewardedClaimAdResult(
      success: false,
      message: 'Rewarded ad SDK is not loaded.',
    );
  }

  try {
    log?.call('Invoking rewarded claim ad: show_10822588().');
    final result = bridge.invokeRewardedFunction();
    if (result == null) {
      log?.call('Rewarded claim ad invocation returned null promise.');
      return const RewardedClaimAdResult(
        success: false,
        message: 'Rewarded ad did not return a completion promise.',
      );
    }

    await bridge.awaitPromise(result);
    log?.call('Rewarded claim ad completed successfully.');
    return const RewardedClaimAdResult(success: true);
  } catch (error) {
    log?.call('Rewarded claim ad failed: $error');
    return RewardedClaimAdResult(
      success: false,
      message: 'Rewarded ad failed: $error',
    );
  }
}
