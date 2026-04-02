import 'rewarded_claim_ad_service.dart';

Future<RewardedClaimAdResult> showRewardedClaimInterstitial() async {
  return const RewardedClaimAdResult(
    success: false,
    message: 'Rewarded ad SDK is unavailable on this platform.',
  );
}
