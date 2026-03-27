import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:dryad/config/dryad_chain_config.dart';
import 'package:dryad/core/identity/identity_store.dart';
import 'package:dryad/features/dryad/chain/dryad_chain_providers.dart';
import 'package:dryad/features/dryad/chain/grove_nft_service.dart';
import 'package:dryad/features/dryad/chain/nft_metadata.dart';
import 'package:dryad/features/onboarding/onboarding_controller.dart';
import 'package:dryad/features/onboarding/onboarding_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeService extends GroveNftService {
  _FakeService(this.snapshot)
      : super(
          httpClient: http.Client(),
          config: DryadChainConfig.mainnet,
        );

  final GroveNftSnapshot snapshot;
  String? lastMintSeedInput;

  @override
  Future<GroveNftSnapshot> fetchWalletSnapshot(String walletAddress) async => snapshot;

  @override
  Future<int> readChainId() async => snapshot.chainId;

  @override
  Future<String> mint({required String walletAddress, required String methodSignature, required String seedInput}) async {
    lastMintSeedInput = seedInput;
    return '0xtest';
  }
}

void main() {
  test('sets nftFound when wallet owns token on expected chain', () async {
    SharedPreferences.setMockInitialValues({});

    final container = ProviderContainer(
      overrides: [
        groveNftServiceProvider.overrideWithValue(
          _FakeService(
            const GroveNftSnapshot(
              chainId: 1,
              wallet: '0xabc',
              ownedBalance: BigInt.one,
              tokenId: BigInt.one,
              tokenUri: 'data:application/json;base64,eyJuYW1lIjoiVHJlZSJ9',
              artwork: NftArtwork(name: 'Tree', description: null, imageSource: null, svgMarkup: '<svg></svg>', attributes: []),
            ),
          ),
        ),
      ],
    );

    final controller = container.read(onboardingControllerProvider.notifier);
    controller.setWalletAddress('0xabc');
    await controller.refreshNftStatus();

    expect(container.read(onboardingControllerProvider).status, OnboardingFlowStatus.nftFound);
  });

  test('sets wrongNetwork when RPC chain mismatches expected chain', () async {
    SharedPreferences.setMockInitialValues({});

    final container = ProviderContainer(
      overrides: [
        groveNftServiceProvider.overrideWithValue(
          _FakeService(
            const GroveNftSnapshot(
              chainId: 8453,
              wallet: '0xabc',
              ownedBalance: BigInt.zero,
              tokenId: null,
              tokenUri: null,
              artwork: null,
            ),
          ),
        ),
      ],
    );

    final controller = container.read(onboardingControllerProvider.notifier);
    controller.setWalletAddress('0xabc');
    await controller.refreshNftStatus();

    final state = container.read(onboardingControllerProvider);
    expect(state.status, OnboardingFlowStatus.wrongNetwork);
    expect(state.errorMessage, contains('Expected chain ID 1'));
  });

  test('completeOnboarding persists completion flag', () async {
    SharedPreferences.setMockInitialValues({});

    final container = ProviderContainer();
    final controller = container.read(onboardingControllerProvider.notifier);
    await controller.completeOnboarding();

    final prefs = await SharedPreferences.getInstance();
    final store = IdentityStore(sharedPreferences: prefs);
    expect(await store.isOnboardingCompleted(), isTrue);
  });

  test('requires seed input when submitting plant transaction', () async {
    SharedPreferences.setMockInitialValues({});
    final service = _FakeService(
      const GroveNftSnapshot(
        chainId: 1,
        wallet: '0xabc',
        ownedBalance: BigInt.zero,
        tokenId: null,
        tokenUri: null,
        artwork: null,
      ),
    );

    final container = ProviderContainer(
      overrides: [
        groveNftServiceProvider.overrideWithValue(service),
      ],
    );

    final controller = container.read(onboardingControllerProvider.notifier);
    controller.setWalletAddress('0xabc');
    await controller.mintNft(seedInput: '   ');

    final state = container.read(onboardingControllerProvider);
    expect(state.status, OnboardingFlowStatus.onboardingFailed);
    expect(state.errorMessage, contains('Enter a seed'));
    expect(service.lastMintSeedInput, isNull);
  });
}
