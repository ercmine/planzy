import 'rewarded_claim_ad_service_stub.dart'
    if (dart.library.js_interop) 'rewarded_claim_ad_service_web.dart' as rewarded_claim_ad_service_impl;

class RewardedClaimAdResult {
  const RewardedClaimAdResult({required this.success, this.message});

  final bool success;
  final String? message;
}

abstract class RewardedClaimAdService {
  Future<RewardedClaimAdResult> showRewardedInterstitial();
}

class LibTlRewardedClaimAdService implements RewardedClaimAdService {
  const LibTlRewardedClaimAdService();

  @override
  Future<RewardedClaimAdResult> showRewardedInterstitial() {
    return rewarded_claim_ad_service_impl.showRewardedClaimInterstitial();
  }
}

class NoopRewardedClaimAdService implements RewardedClaimAdService {
  const NoopRewardedClaimAdService();

  @override
  Future<RewardedClaimAdResult> showRewardedInterstitial() async {
    return const RewardedClaimAdResult(
      success: false,
      message: 'Rewarded ad is only available on web.',
    );
  }
}
