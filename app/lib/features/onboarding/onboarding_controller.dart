import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/identity/identity_provider.dart';
import '../dryad/chain/dryad_chain_providers.dart';
import '../dryad/chain/grove_nft_service.dart';
import 'onboarding_state.dart';

class OnboardingController extends Notifier<OnboardingState> {
  @override
  OnboardingState build() {
    _load();
    return OnboardingState.initial();
  }

  Future<void> _load() async {
    final identity = await ref.read(identityStoreProvider.future);
    final completed = await identity.isOnboardingCompleted();
    if (completed) {
      state = state.copyWith(status: OnboardingFlowStatus.onboardingCompleted, hasCompleted: true);
      return;
    }
    state = state.copyWith(status: OnboardingFlowStatus.walletDisconnected);
  }

  void setWalletAddress(String value) {
    state = state.copyWith(
      walletAddress: value.trim(),
      status: value.trim().isEmpty ? OnboardingFlowStatus.walletDisconnected : OnboardingFlowStatus.walletConnected,
      clearError: true,
    );
    ref.read(walletAddressProvider.notifier).state = value.trim().isEmpty ? null : value.trim();
  }

  Future<void> refreshNftStatus() async {
    if (state.walletAddress.isEmpty) {
      state = state.copyWith(status: OnboardingFlowStatus.walletDisconnected, errorMessage: 'Connect a wallet address first.');
      return;
    }

    state = state.copyWith(status: OnboardingFlowStatus.readyToFetchNft, isBusy: true, clearError: true);
    try {
      final service = ref.read(groveNftServiceProvider);
      final snapshot = await service.fetchWalletSnapshot(state.walletAddress);
      final expectedChain = ref.read(dryadContractConfigProvider).chainId;
      if (snapshot.chainId != expectedChain) {
        state = state.copyWith(
          status: OnboardingFlowStatus.wrongNetwork,
          isBusy: false,
          snapshot: snapshot,
          errorMessage: 'Wrong network. Expected chain ID $expectedChain but RPC returned ${snapshot.chainId}.',
        );
        return;
      }
      state = state.copyWith(
        status: snapshot.hasNft ? OnboardingFlowStatus.nftFound : OnboardingFlowStatus.nftNotMinted,
        isBusy: false,
        snapshot: snapshot,
      );
    } catch (error) {
      state = state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        isBusy: false,
        errorMessage: 'Unable to load NFT from chain: $error',
      );
    }
  }

  Future<void> mintNft() async {
    final service = ref.read(groveNftServiceProvider);
    final config = ref.read(dryadContractConfigProvider);
    state = state.copyWith(status: OnboardingFlowStatus.mintInProgress, isBusy: true, clearError: true);

    try {
      final txHash = await service.mint(walletAddress: state.walletAddress, methodSignature: config.mintMethodSignature);
      state = state.copyWith(status: OnboardingFlowStatus.mintSucceeded, isBusy: false, txHash: txHash);
      await refreshNftStatus();
    } catch (error) {
      state = state.copyWith(
        status: OnboardingFlowStatus.onboardingFailed,
        isBusy: false,
        errorMessage:
            'Mint failed. This app uses eth_sendTransaction and requires a wallet-enabled RPC/provider. Error: $error',
      );
    }
  }

  Future<void> completeOnboarding() async {
    final identity = await ref.read(identityStoreProvider.future);
    await identity.setOnboardingCompleted(true);
    ref.invalidate(onboardingCompletedProvider);
    state = state.copyWith(status: OnboardingFlowStatus.onboardingCompleted, hasCompleted: true);
  }
}

final onboardingControllerProvider = NotifierProvider<OnboardingController, OnboardingState>(() {
  return OnboardingController();
});
