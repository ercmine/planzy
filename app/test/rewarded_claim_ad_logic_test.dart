import 'package:flutter_test/flutter_test.dart';
import 'package:perbug/features/home/rewarded_claim_ad_logic.dart';

void main() {
  test('fails safely when rewarded sdk function is missing', () async {
    final result = await runRewardedClaimInterstitial(
      bridge: RewardedClaimAdBridge(
        hasRewardedFunction: () => false,
        invokeRewardedFunction: () => throw StateError('should not call'),
        awaitPromise: (_) async => null,
      ),
    );

    expect(result.success, isFalse);
    expect(result.message, contains('not loaded'));
  });

  test('fails safely when rewarded function does not return a promise', () async {
    final result = await runRewardedClaimInterstitial(
      bridge: RewardedClaimAdBridge(
        hasRewardedFunction: () => true,
        invokeRewardedFunction: () => null,
        awaitPromise: (_) async => null,
      ),
    );

    expect(result.success, isFalse);
    expect(result.message, contains('completion promise'));
  });

  test('resolves successfully when rewarded promise resolves', () async {
    var awaited = false;
    final result = await runRewardedClaimInterstitial(
      bridge: RewardedClaimAdBridge(
        hasRewardedFunction: () => true,
        invokeRewardedFunction: () => Object(),
        awaitPromise: (_) async {
          awaited = true;
          return null;
        },
      ),
    );

    expect(awaited, isTrue);
    expect(result.success, isTrue);
  });

  test('does not succeed when rewarded promise rejects', () async {
    final result = await runRewardedClaimInterstitial(
      bridge: RewardedClaimAdBridge(
        hasRewardedFunction: () => true,
        invokeRewardedFunction: () => Object(),
        awaitPromise: (_) async => throw Exception('blocked'),
      ),
    );

    expect(result.success, isFalse);
    expect(result.message, contains('blocked'));
  });
}
